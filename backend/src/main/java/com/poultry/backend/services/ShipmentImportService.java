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
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

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

            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;

                try {
                    Shipment shipment = processRow(row);
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

    private Shipment processRow(Row row) throws Exception {
        String rawGrowerData = ExcelHelper.getCellString(row, 0);
        Grower grower = createGrower(rawGrowerData);

        String rawNameCode = ExcelHelper.getCellString(row, 1);
        if (rawNameCode == null || rawNameCode.trim().isEmpty()) {
            return null;
        }

        Matcher matcher = NAME_CODE_PATTERN.matcher(rawNameCode.trim());
        if (!matcher.find()) {
            throw new IllegalArgumentException("Hibás Név/Kód formátum a B oszlopban: '" + rawNameCode + "'");
        }

        String partnerName = matcher.group(1).trim();
        String partnerIdStr = matcher.group(2);
        String seqNum = matcher.group(3);
        String year = matcher.group(4);

        String city = ExcelHelper.getCellString(row, 2);

        String county = ExcelHelper.getCellString(row, 3);

        Partner partner = getOrCreatePartner(partnerIdStr, partnerName, grower);
        PartnerLocation location = getOrCreateLocation(partner, city, county);
        String cleanDeliveryCode = seqNum + "/" + year;

        Shipment shipment = shipmentRepository.findByDeliveryCodeAndLocation(cleanDeliveryCode, location)
                .orElse(new Shipment());
        shipment.setGrower(grower);

        fillShipmentData(shipment, location, cleanDeliveryCode, row);

        return shipment;
    }

    private Grower createGrower(String rawGrowerData) {
        if (rawGrowerData == null || rawGrowerData.trim().isEmpty()) {
            return null;
        }

        String trimmedData = rawGrowerData.trim();
        String gName = trimmedData;
        String gCity = "";
        Matcher m = GROWER_PATTERN.matcher(trimmedData);
        if (m.find()) {
            gName = m.group(1).trim();
            gCity = m.group(2).trim();
        }

        return getOrCreateGrower(gName, gCity);
    }

    private Grower getOrCreateGrower(String name, String city) {
        return growerRepository.findByNameAndCity(name, city)
                .orElseGet(() -> {
                    Grower g = new Grower();
                    g.setName(name);
                    g.setCity(city);
                    return growerRepository.save(g);
                });
    }

    private Partner getOrCreatePartner(String partnerIdStr, String partnerName, Grower grower) {
        long pId = Long.parseLong(partnerIdStr);

        return partnerRepository.findById(pId)
                .map(p -> {
                    if (grower != null) {
                        boolean alreadyLinked = p.getGrowers().stream()
                                .anyMatch(g -> g.getId().equals(grower.getId()));

                        if (!alreadyLinked) {
                            p.getGrowers().add(grower);
                            return partnerRepository.save(p);
                        }
                    }
                    return p;
                })
                .orElseGet(() -> {
                    Partner newP = new Partner();
                    newP.setId(pId);
                    newP.setName(partnerName);
                    if (grower != null) {
                        newP.getGrowers().add(grower);
                    }
                    return partnerRepository.save(newP);
                });
    }

    private PartnerLocation getOrCreateLocation(Partner partner, String city, String county) {
        if (city == null || city.trim().isEmpty()) {
            city = "Ismeretlen";
        }

        String finalCity = city;

        return partnerLocationRepository.findByPartnerAndCity(partner, finalCity)
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
                    return partnerLocationRepository.save(newLoc);
                });
    }

    private void fillShipmentData(Shipment shipment, PartnerLocation location, String deliveryCode, Row row) {
        String currentField = "Ismeretlen mező";

        try {
            shipment.setLocation(location);
            shipment.setDeliveryCode(deliveryCode);

            currentField = "Szállítás dátuma (D oszlop)";
            shipment.setDeliveryDate(ExcelHelper.getCellDate(row, 4));

            currentField = "Befogott db (E oszlop)";
            int quantity = (int) ExcelHelper.getCellNum(row, 5);
            shipment.setQuantity(quantity);

            currentField = "Befogott súly (F oszlop)";
            double totalWeight = ExcelHelper.getCellNum(row, 6);
            shipment.setTotalWeight(totalWeight);

            currentField = "Vágási hét (H oszlop)";
            shipment.setProcessingWeek((int) ExcelHelper.getCellNum(row, 8));

            currentField = "Vágás dátuma (I oszlop)";
            shipment.setProcessingDate(ExcelHelper.getCellDate(row, 9));


            currentField = "Beszállított db (J oszlop)";
            int netQty = (int) ExcelHelper.getCellNum(row, 10);

            currentField = "Beszállított kg (K oszlop)";
            double netWeight = ExcelHelper.getCellNum(row, 11);

            currentField = "Útihulla db (M oszlop)";
            int transMort = (int) ExcelHelper.getCellNum(row, 13);
            shipment.setTransportMortality(transMort);

            currentField = "Útihulla kg (N oszlop)";
            double transMortKg = ExcelHelper.getCellNum(row, 14);
            shipment.setTransportMortalityKg(transMortKg);

            if (netQty == 0 && quantity > 0) {
                netQty = quantity - transMort;
            }
            if (netWeight == 0.0 && totalWeight > 0) {
                netWeight = totalWeight - transMortKg;
            }

            shipment.setNetQuantity(netQty);
            shipment.setNetWeight(netWeight);

            currentField = "Kóser % (O oszlop)";
            shipment.setKosherPercent(ExcelHelper.getCellNum(row, 15));

            currentField = "Máj súly (P oszlop)";
            shipment.setLiverWeight(ExcelHelper.getCellNum(row, 16));

            currentField = "Ráhízás (Q oszlop)";
            double fatRate = ExcelHelper.getCellNum(row, 17);

            if (fatRate == 0.0 && quantity > 0 && netQty > 0) {
                double avgGross = totalWeight / quantity;
                double avgNet = netWeight / netQty;
                fatRate = avgNet - avgGross;
            }
            shipment.setFatteningRate(fatRate);

            currentField = "Elhullás db (R oszlop)";
            int mortCount = (int) ExcelHelper.getCellNum(row, 18);
            shipment.setMortalityCount(mortCount);

            currentField = "Elhullás % (S oszlop)";
            double mortRate = ExcelHelper.getCellNum(row, 19) * 100;

            if (mortRate == 0.0 && quantity > 0 && mortCount > 0) {
                mortRate = (double) mortCount / quantity * 100.0;
            }
            shipment.setMortalityRate(mortRate);

            currentField = "Tömés napok (T oszlop)";
            shipment.setFatteningDays((int) ExcelHelper.getCellNum(row, 20));

        } catch (Exception e) {
            throw new IllegalArgumentException("Hiba a következő adatnál: '" + currentField + "'.");
        }
    }
}