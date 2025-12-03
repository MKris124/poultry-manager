package com.poultry.backend.services;

import com.poultry.backend.dtos.ImportResult;
import com.poultry.backend.entities.Partner;
import com.poultry.backend.entities.Shipment;
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
import java.time.LocalDate;
import java.time.temporal.WeekFields;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class ShipmentImportService {

    private final PartnerRepository partnerRepository;
    private final ShipmentRepository shipmentRepository;
    private static final Pattern NAME_CODE_PATTERN = Pattern.compile("^(.*)\\s+(\\d+)/(\\d+)/(\\d+)$");

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
        String rawNameCode = ExcelHelper.getCellString(row, 0);
        if (rawNameCode == null || rawNameCode.trim().isEmpty()) {
            return null;
        }

        Matcher matcher = NAME_CODE_PATTERN.matcher(rawNameCode.trim());
        if (!matcher.find()) {
            throw new IllegalArgumentException("Hibás Név/Kód formátum az 'A' oszlopban: '" + rawNameCode + "'");
        }

        String partnerName = matcher.group(1).trim();
        String partnerIdStr = matcher.group(2);
        String seqNum = matcher.group(3);
        String year = matcher.group(4);

        Partner partner = getOrCreatePartner(row, partnerIdStr, partnerName);
        String cleanDeliveryCode = seqNum + "/" + year;

        Shipment shipment = shipmentRepository.findByDeliveryCodeAndPartnerId(cleanDeliveryCode, partner.getId())
                .orElse(new Shipment());

        fillShipmentData(shipment, partner, cleanDeliveryCode, row);

        return shipment;
    }

    private Partner getOrCreatePartner(Row row, String partnerIdStr, String partnerName) {
        long pId;
        try {
            pId = Long.parseLong(partnerIdStr);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("A partner azonosítója nem szám: " + partnerIdStr);
        }

        return partnerRepository.findById(pId)
                .map(p -> {
                    p.setCity(ExcelHelper.getCellString(row, 1));
                    p.setCounty(ExcelHelper.getCellString(row, 2));
                    return partnerRepository.save(p);
                })
                .orElseGet(() -> {
                    Partner newP = new Partner();
                    newP.setId(pId);
                    newP.setName(partnerName);
                    newP.setCity(ExcelHelper.getCellString(row, 1));
                    newP.setCounty(ExcelHelper.getCellString(row, 2));
                    return partnerRepository.save(newP);
                });
    }

    private void fillShipmentData(Shipment shipment, Partner partner, String deliveryCode, Row row) {
        String currentField = "Ismeretlen mező";

        try {
            shipment.setPartner(partner);
            shipment.setDeliveryCode(deliveryCode);

            currentField = "Szállítás dátuma (D oszlop)";
            shipment.setDeliveryDate(ExcelHelper.getCellDate(row, 3));

            currentField = "Befogott db (E oszlop)";
            int quantity = (int) ExcelHelper.getCellNum(row, 4);
            shipment.setQuantity(quantity);

            currentField = "Befogott súly (F oszlop)";
            double totalWeight = ExcelHelper.getCellNum(row, 5);
            shipment.setTotalWeight(totalWeight);

            // 6. G oszlop: Átlag kg (Számított) - Kihagyjuk

            currentField = "Vágási hét (H oszlop)";
            shipment.setProcessingWeek((int) ExcelHelper.getCellNum(row, 7));

            currentField = "Vágás dátuma (I oszlop)";
            shipment.setProcessingDate(ExcelHelper.getCellDate(row, 8));

            // --- NETTÓ ADATOK ---

            currentField = "Beszállított db (J oszlop)";
            int netQty = (int) ExcelHelper.getCellNum(row, 9);

            currentField = "Beszállított kg (K oszlop)";
            double netWeight = ExcelHelper.getCellNum(row, 10);

            // 11. L oszlop: Leadott átlag - Kihagyjuk

            currentField = "Útihulla db (M oszlop)";
            int transMort = (int) ExcelHelper.getCellNum(row, 12);
            shipment.setTransportMortality(transMort);

            currentField = "Útihulla kg (N oszlop)";
            double transMortKg = ExcelHelper.getCellNum(row, 13);
            shipment.setTransportMortalityKg(transMortKg);

            // Számítás, ha hiányzik a nettó az Excelből
            if (netQty == 0 && quantity > 0) {
                netQty = quantity - transMort;
            }
            if (netWeight == 0.0 && totalWeight > 0) {
                netWeight = totalWeight - transMortKg;
            }

            shipment.setNetQuantity(netQty);
            shipment.setNetWeight(netWeight);

            currentField = "Kóser % (O oszlop)";
            shipment.setKosherPercent(ExcelHelper.getCellNum(row, 14));

            currentField = "Máj súly (P oszlop)";
            shipment.setLiverWeight(ExcelHelper.getCellNum(row, 15));

            currentField = "Ráhízás (Q oszlop)";
            double fatRate = ExcelHelper.getCellNum(row, 16);

            if (fatRate == 0.0 && quantity > 0 && netQty > 0) {
                double avgGross = totalWeight / quantity;
                double avgNet = netWeight / netQty;
                fatRate = avgNet - avgGross;
            }
            shipment.setFatteningRate(fatRate);

            currentField = "Elhullás db (R oszlop)";
            int mortCount = (int) ExcelHelper.getCellNum(row, 17);
            shipment.setMortalityCount(mortCount);

            currentField = "Elhullás % (S oszlop)";
            double mortRate = ExcelHelper.getCellNum(row, 18) * 100;

            if (mortRate == 0.0 && quantity > 0 && mortCount > 0) {
                mortRate = (double) mortCount / quantity * 100.0;
            }
            shipment.setMortalityRate(mortRate);

            currentField = "Tömés napok (T oszlop)";
            shipment.setFatteningDays((int) ExcelHelper.getCellNum(row, 19));

        } catch (Exception e) {
            throw new IllegalArgumentException("Hiba a következő adatnál: '" + currentField + "'.");
        }
    }
}