package com.poultry.backend.services;

import com.poultry.backend.dtos.CreateShipmentDTO;
import com.poultry.backend.dtos.ImportRowDTO;
import com.poultry.backend.entities.Grower;
import com.poultry.backend.entities.Partner;
import com.poultry.backend.entities.PartnerLocation;
import com.poultry.backend.repositories.GrowerRepository;
import com.poultry.backend.repositories.PartnerLocationRepository;
import com.poultry.backend.repositories.PartnerRepository;
import com.poultry.backend.utils.ExcelHelper;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.cache.annotation.CacheEvict;
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

    private final ShipmentService shipmentService;
    private final PartnerRepository partnerRepository;
    private final GrowerRepository growerRepository;
    private final PartnerLocationRepository locationRepository;

    private static final Pattern NAME_CODE_PATTERN = Pattern.compile("^(.*)\\s+(\\d+)/(\\d+)/(\\d+)$");
    private static final Pattern CITY_EXTRACTION_PATTERN = Pattern.compile("^(.*?)\\s+([A-ZÁÉÍÓÖŐÚÜŰ]{2,})$");
    private static final Pattern FORBIDDEN_CHARS_PATTERN = Pattern.compile("[0-9()]");

    public List<ImportRowDTO> previewExcel(MultipartFile file) throws IOException {
        List<ImportRowDTO> previewRows = new ArrayList<>();

        Map<String, Grower> growerCache = loadGrowerCache();
        Map<Long, Partner> partnerCache = loadPartnerCache();

        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);

            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;


                if (ExcelHelper.getCellString(row, 0).isEmpty() && ExcelHelper.getCellString(row, 1).isEmpty()) {
                    continue;
                }

                ImportRowDTO rowDTO = parseRowForPreview(row, i + 1, growerCache, partnerCache);
                previewRows.add(rowDTO);
            }
        }
        return previewRows;
    }

    @Transactional
    @CacheEvict(value = {"leaderboard", "partnerStats", "growerStats", "locationStats"}, allEntries = true)
    public int saveImportedRows(List<CreateShipmentDTO> dtos) {
        int savedCount = 0;

        Map<String, Grower> growerCache = loadGrowerCache();
        Map<Long, Partner> partnerCache = loadPartnerCache();

        for (CreateShipmentDTO dto : dtos) {
            resolveGrower(dto, growerCache);

            resolvePartnerAndLocation(dto, partnerCache);

            if (dto.getLocationId() != null) {
                shipmentService.createShipment(dto);
                savedCount++;
            }
        }
        return savedCount;
    }


    private ImportRowDTO parseRowForPreview(Row row, int rowNum, Map<String, Grower> growerCache, Map<Long, Partner> partnerCache) {
        ImportRowDTO dto = new ImportRowDTO();
        dto.setRowNumber(rowNum);
        dto.setValid(true);
        CreateShipmentDTO shipmentData = new CreateShipmentDTO();
        dto.setShipmentData(shipmentData);

        try {
            String rawGrowerData = ExcelHelper.getCellString(row, 0);
            dto.setGrowerName(rawGrowerData);

            if (rawGrowerData != null && !rawGrowerData.trim().isEmpty()) {
                String trimmed = rawGrowerData.trim();

                if (FORBIDDEN_CHARS_PATTERN.matcher(trimmed).find()) {
                    dto.addError("Hibás Nevelő formátum! Helyes pl: 'Példa Péter PÉLDAVÁROS");
                } else {
                    Matcher m = CITY_EXTRACTION_PATTERN.matcher(trimmed);

                    String gName;
                    String gCity = "";

                    if (m.find()) {
                        gName = m.group(1).trim();
                        gCity = m.group(2).trim();
                    } else {
                        gName = trimmed;
                    }

                    shipmentData.setTempGrowerName(gName);
                    shipmentData.setTempGrowerCity(gCity);

                    String key = gName + "|" + gCity;
                    if (growerCache.containsKey(key)) {
                        shipmentData.setGrowerId(growerCache.get(key).getId());
                    }
                }

            }

            String rawNameCode = ExcelHelper.getCellString(row, 1);
            if (rawNameCode == null || rawNameCode.trim().isEmpty()) {
                dto.addError("Hiányzó Partner/Kód adat (B oszlop)");
            } else {
                Matcher matcher = NAME_CODE_PATTERN.matcher(rawNameCode.trim());
                if (!matcher.find()) {
                    dto.addError("Hibás formátum (Elvárt: Név ID/Sorszám/Év)");
                } else {
                    String pName = matcher.group(1).trim();
                    Long pId = Long.parseLong(matcher.group(2));
                    String seqNum = matcher.group(3);
                    String year = matcher.group(4);

                    dto.setPartnerName(pName);
                    dto.setDeliveryCode(seqNum + "/" + year);

                    shipmentData.setDeliveryCode(seqNum + "/" + year);
                    shipmentData.setPartnerId(pId);
                    shipmentData.setTempPartnerName(pName);
                }
            }

            String city = ExcelHelper.getCellString(row, 2);
            String county = ExcelHelper.getCellString(row, 3);
            dto.setLocationCity(city);

            shipmentData.setTempCity(city);
            shipmentData.setTempCounty(county);

            if (shipmentData.getPartnerId() != null && partnerCache.containsKey(shipmentData.getPartnerId())) {
                Partner p = partnerCache.get(shipmentData.getPartnerId());
                String searchCity = (city == null || city.isEmpty()) ? "Ismeretlen" : city;

                p.getLocations().stream()
                        .filter(l -> l.getCity().equalsIgnoreCase(searchCity))
                        .findFirst()
                        .ifPresent(loc -> shipmentData.setLocationId(loc.getId()));
            }

            fillShipmentDataSafe(shipmentData, row, dto);

        } catch (Exception e) {
            dto.addError("Kritikus hiba: " + e.getMessage());
        }

        return dto;
    }

    private void fillShipmentDataSafe(CreateShipmentDTO data, Row row, ImportRowDTO dto) {
        try {
            data.setDeliveryDate(ExcelHelper.getCellDate(row, 4));
        } catch (Exception e) { dto.addError("Hibás szállítási dátum"); }

        try {
            data.setQuantity((int) ExcelHelper.getCellNum(row, 5));
        } catch (Exception e) { dto.addError("Hibás darabszám"); }

        try {
            data.setTotalWeight(ExcelHelper.getCellNum(row, 6));
        } catch (Exception e) { dto.addError("Hibás súly"); }

        data.setProcessingWeek((int) ExcelHelper.getCellNum(row, 8));
        data.setProcessingDate(ExcelHelper.getCellDate(row, 9));

        double netWeight = ExcelHelper.getCellNum(row, 11);
        double transMortKg = ExcelHelper.getCellNum(row, 14);
        if (netWeight == 0.0 && data.getTotalWeight() != null && data.getTotalWeight() > 0) {
            netWeight = data.getTotalWeight() - transMortKg;
        }
        data.setNetWeight(netWeight);

        data.setTransportMortality((int) ExcelHelper.getCellNum(row, 13));
        data.setTransportMortalityKg(transMortKg);
        data.setKosherPercent(ExcelHelper.getCellNum(row, 15));
        data.setLiverWeight(ExcelHelper.getCellNum(row, 16));

        data.setFatteningRate(ExcelHelper.getCellNum(row, 17));

        data.setMortalityCount((int) ExcelHelper.getCellNum(row, 18));
        data.setFatteningDays((int) ExcelHelper.getCellNum(row, 20));
    }


    private void resolveGrower(CreateShipmentDTO dto, Map<String, Grower> cache) {
        if (dto.getGrowerId() != null) return;

        if (dto.getTempGrowerName() != null && !dto.getTempGrowerName().isEmpty()) {
            String key = dto.getTempGrowerName() + "|" + (dto.getTempGrowerCity() == null ? "" : dto.getTempGrowerCity());

            if (cache.containsKey(key)) {
                dto.setGrowerId(cache.get(key).getId());
            } else {
                Grower newG = new Grower();
                newG.setName(dto.getTempGrowerName());
                newG.setCity(dto.getTempGrowerCity());
                newG = growerRepository.save(newG);

                cache.put(key, newG);
                dto.setGrowerId(newG.getId());
            }
        }
    }

    private void resolvePartnerAndLocation(CreateShipmentDTO dto, Map<Long, Partner> cache) {
        if (dto.getLocationId() != null) return;
        if (dto.getPartnerId() == null) return;

        Partner partner;
        if (cache.containsKey(dto.getPartnerId())) {
            partner = cache.get(dto.getPartnerId());
        } else {
            partner = new Partner();
            partner.setId(dto.getPartnerId());
            partner.setName(dto.getTempPartnerName());
            partner = partnerRepository.save(partner);
            cache.put(partner.getId(), partner);
        }

        String city = (dto.getTempCity() == null || dto.getTempCity().isEmpty()) ? "Ismeretlen" : dto.getTempCity();
        String county = dto.getTempCounty();

        Optional<PartnerLocation> locOpt = partner.getLocations().stream()
                .filter(l -> l.getCity().equalsIgnoreCase(city))
                .findFirst();

        if (locOpt.isPresent()) {
            PartnerLocation loc = locOpt.get();
            if (county != null && !county.equals(loc.getCounty())) {
                loc.setCounty(county);
                locationRepository.save(loc);
            }
            dto.setLocationId(loc.getId());
        } else {
            PartnerLocation newLoc = new PartnerLocation();
            newLoc.setPartner(partner);
            newLoc.setCity(city);
            newLoc.setCounty(county);
            newLoc = locationRepository.save(newLoc);

            partner.getLocations().add(newLoc);
            dto.setLocationId(newLoc.getId());
        }
    }

    private Map<String, Grower> loadGrowerCache() {
        return growerRepository.findAll().stream()
                .collect(Collectors.toMap(g -> g.getName() + "|" + (g.getCity() == null ? "" : g.getCity()), g -> g));
    }

    private Map<Long, Partner> loadPartnerCache() {
        return partnerRepository.findAll().stream()
                .collect(Collectors.toMap(Partner::getId, p -> p));
    }
}