package com.poultry.backend.services;

import com.poultry.backend.dtos.ImportResult;
import com.poultry.backend.entities.Grower;
import com.poultry.backend.entities.Partner;
import com.poultry.backend.entities.PartnerLocation;
import com.poultry.backend.entities.Shipment;
import com.poultry.backend.repositories.GrowerRepository;
import com.poultry.backend.repositories.PartnerLocationRepository;
import com.poultry.backend.repositories.PartnerRepository;
import com.poultry.backend.repositories.ShipmentRepository;
import com.poultry.backend.utils.ExcelHelper;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ShipmentImportService {

    private final PartnerRepository partnerRepository;
    private final ShipmentRepository shipmentRepository;
    private final PartnerLocationRepository partnerLocationRepository;
    private final GrowerRepository growerRepository;

    private static final Pattern NAME_CODE_PATTERN = Pattern.compile("^(.*)\\s+(\\d+)/(\\d+)/(\\d+)$");
    private static final Pattern GROWER_PATTERN = Pattern.compile("^(.*)\\s+([A-ZÁÉÍÓÖŐÚÜŰ]+)$");

    @Transactional
    public ImportResult importExcel(MultipartFile file) throws IOException {
        ImportResult result = new ImportResult();

        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            List<Shipment> shipmentsToSave = new ArrayList<>();

            Map<String, Grower> growerCache = growerRepository.findAll().stream()
                    .collect(Collectors.toMap(g -> g.getName() + "|" + (g.getCity() == null ? "" : g.getCity()), g -> g));

            Map<Long, Partner> partnerCache = partnerRepository.findAll().stream()
                    .collect(Collectors.toMap(Partner::getId, p -> p));

            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;

                try {
                    Shipment shipment = processRow(row, growerCache, partnerCache);
                    if (shipment != null) {
                        shipmentsToSave.add(shipment);
                        result.incrementSuccess();
                    }
                } catch (Exception e) {
                    result.addError(i + 1, e.getMessage());
                }
            }
            shipmentRepository.saveAll(shipmentsToSave);
        }
        return result;
    }

    private Shipment processRow(Row row, Map<String, Grower> growerCache, Map<Long, Partner> partnerCache) throws Exception {
        String rawGrowerData = ExcelHelper.getCellString(row, 0);
        Grower grower = getCachedOrCreateGrower(rawGrowerData, growerCache);

        String rawNameCode = ExcelHelper.getCellString(row, 1);
        if (rawNameCode == null || rawNameCode.trim().isEmpty()) return null;

        Matcher matcher = NAME_CODE_PATTERN.matcher(rawNameCode.trim());
        if (!matcher.find()) {
            throw new IllegalArgumentException("Hibás Név/Kód formátum a B oszlopban: '" + rawNameCode + "'");
        }

        String partnerName = matcher.group(1).trim();
        Long partnerId = Long.parseLong(matcher.group(2));
        String seqNum = matcher.group(3);
        String year = matcher.group(4);

        String city = ExcelHelper.getCellString(row, 2);
        String county = ExcelHelper.getCellString(row, 3);

        Partner partner = getCachedOrCreatePartner(partnerId, partnerName, grower, partnerCache);
        PartnerLocation location = getOrCreateLocation(partner, city, county);

        String cleanDeliveryCode = seqNum + "/" + year;

        Shipment shipment = shipmentRepository.findByDeliveryCodeAndLocation(cleanDeliveryCode, location)
                .orElse(new Shipment());

        shipment.setGrower(grower);
        shipment.setLocation(location);
        shipment.setDeliveryCode(cleanDeliveryCode);

        fillShipmentData(shipment, row);

        return shipment;
    }

    private Grower getCachedOrCreateGrower(String rawData, Map<String, Grower> cache) {
        if (rawData == null || rawData.trim().isEmpty()) return null;

        String trimmed = rawData.trim();
        String name = trimmed;
        String city = "";

        Matcher m = GROWER_PATTERN.matcher(trimmed);
        if (m.find()) {
            name = m.group(1).trim();
            city = m.group(2).trim();
        }

        String key = name + "|" + city;
        if (cache.containsKey(key)) return cache.get(key);

        Grower newG = new Grower();
        newG.setName(name);
        newG.setCity(city);
        newG = growerRepository.save(newG);
        cache.put(key, newG);
        return newG;
    }

    private Partner getCachedOrCreatePartner(Long id, String name, Grower grower, Map<Long, Partner> cache) {
        Partner p;
        if (cache.containsKey(id)) {
            p = cache.get(id);
            if (grower != null) {
                boolean linked = p.getGrowers().stream().anyMatch(g -> g.getId().equals(grower.getId()));
                if (!linked) {
                    p.getGrowers().add(grower);
                    p = partnerRepository.save(p);
                    cache.put(id, p);
                }
            }
        } else {
            p = new Partner();
            p.setId(id);
            p.setName(name);
            if (grower != null) p.getGrowers().add(grower);
            p = partnerRepository.save(p);
            cache.put(id, p);
        }
        return p;
    }

    private PartnerLocation getOrCreateLocation(Partner partner, String city, String county) {
        String finalCity = (city == null || city.trim().isEmpty()) ? "Ismeretlen" : city;

        return partner.getLocations().stream()
                .filter(l -> l.getCity().equalsIgnoreCase(finalCity))
                .findFirst()
                .map(loc -> {
                    if (county != null && !county.equals(loc.getCounty())) {
                        loc.setCounty(county);
                        return partnerLocationRepository.save(loc);
                    }
                    return loc;
                })
                .orElseGet(() -> {
                    PartnerLocation newLoc = new PartnerLocation();
                    newLoc.setPartner(partner);
                    newLoc.setCity(finalCity);
                    newLoc.setCounty(county);
                    partner.getLocations().add(newLoc);
                    return partnerLocationRepository.save(newLoc);
                });
    }

    private void fillShipmentData(Shipment shipment, Row row) {
        try {
            shipment.setDeliveryDate(ExcelHelper.getCellDate(row, 4));
            shipment.setQuantity((int) ExcelHelper.getCellNum(row, 5));
            shipment.setTotalWeight(ExcelHelper.getCellNum(row, 6));
            shipment.setProcessingWeek((int) ExcelHelper.getCellNum(row, 8));
            shipment.setProcessingDate(ExcelHelper.getCellDate(row, 9));

            double netWeight = ExcelHelper.getCellNum(row, 11);
            double transMortKg = ExcelHelper.getCellNum(row, 14);
            if (netWeight == 0.0 && shipment.getTotalWeight() > 0) {
                netWeight = shipment.getTotalWeight() - transMortKg;
            }
            shipment.setNetWeight(netWeight);

            shipment.setTransportMortality((int) ExcelHelper.getCellNum(row, 13));
            shipment.setTransportMortalityKg(transMortKg);
            shipment.setKosherPercent(ExcelHelper.getCellNum(row, 15));
            shipment.setLiverWeight(ExcelHelper.getCellNum(row, 16));

            shipment.setMortalityCount((int) ExcelHelper.getCellNum(row, 18));
            shipment.setFatteningDays((int) ExcelHelper.getCellNum(row, 20));

        } catch (Exception e) {
            throw new IllegalArgumentException("Adathiba: " + e.getMessage());
        }
    }
}