package com.poultry.backend.services;

import com.poultry.backend.entities.Shipment;
import com.poultry.backend.repositories.ShipmentRepository;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.temporal.WeekFields;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ShipmentExportService {

    private final ShipmentRepository shipmentRepository;

    private static final String[] COLUMNS = {
            "Név", "Telephely", "Megye", "Szállítás\ndátuma", "Befogott\ndb", "Befogott\nkg",
            "Átlag kg", "Vágási\nHét", "Vágás dátuma", "Beszállít\nott db", "Beszállított\nkg",
            "Leadott\nátl. Kg", "Útihulla\ndb", "Útihulla\nkg", "Kóser %", "Máj Kg",
            "Ráhízás", "Elhullás", "Elhullás %", "Tömés napok"
    };

    public ByteArrayInputStream exportShipments(List<Long> partnerIds) throws IOException {
        List<Shipment> shipments = shipmentRepository.findByPartnerIdInOrderByProcessingDateDesc(partnerIds);

        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("Adatok");

            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle dataStyle = createDataStyle(workbook);

            CellStyle decimalStyle = createDecimalStyle(workbook, dataStyle);

            CellStyle percentStyle = createPercentStyle(workbook, dataStyle);

            createHeaderRow(sheet, headerStyle);

            int rowIdx = 1;
            for (Shipment s : shipments) {
                Row row = sheet.createRow(rowIdx++);
                fillExportRow(row, s, dataStyle, decimalStyle, percentStyle);
            }

            autoSizeColumns(sheet);

            workbook.write(out);
            return new ByteArrayInputStream(out.toByteArray());
        }
    }

    private void fillExportRow(Row row, Shipment shipment, CellStyle dataStyle, CellStyle decimalStyle, CellStyle percentStyle) {
        String rawCode = shipment.getDeliveryCode() != null ? shipment.getDeliveryCode() : "";
        String prefix = shipment.getPartner().getId() + "/";
        String finalCode = rawCode.startsWith(prefix) ? rawCode : prefix + rawCode;
        String fullNameCode = shipment.getPartner().getName() + " " + finalCode;

        createCell(row, 0, fullNameCode, dataStyle);
        createCell(row, 1, shipment.getPartner().getCity(), dataStyle);
        createCell(row, 2, shipment.getPartner().getCounty(), dataStyle);
        createCell(row, 3, formatDate(shipment.getDeliveryDate()), dataStyle);

        int befogoDb = shipment.getQuantity() != null ? shipment.getQuantity() : 0;
        double befogoKg = shipment.getTotalWeight() != null ? shipment.getTotalWeight() : 0.0;
        int elhullasDb = shipment.getMortalityCount() != null ? shipment.getMortalityCount() : 0;
        int utihullaDb = shipment.getTransportMortality() != null ? shipment.getTransportMortality() : 0;
        double utihullaKg = shipment.getTransportMortalityKg() != null ? shipment.getTransportMortalityKg() : 0.0;

        createCell(row, 4, befogoDb, dataStyle);
        createCell(row, 5, befogoKg, decimalStyle);

        double atlagKg = (befogoDb > 0) ? befogoKg / befogoDb : 0.0;
        createCell(row, 6, atlagKg, decimalStyle);

        int calculatedWeek;
        if (shipment.getProcessingDate() != null) {
            calculatedWeek = shipment.getProcessingDate().get(WeekFields.ISO.weekOfWeekBasedYear());
        } else {
            calculatedWeek = shipment.getProcessingWeek() != null ? shipment.getProcessingWeek() : 0;
        }
        createCell(row, 7, calculatedWeek, dataStyle);

        createCell(row, 8, formatDate(shipment.getProcessingDate()), dataStyle);

        int beszallitottDb = befogoDb - elhullasDb;
        createCell(row, 9, beszallitottDb, dataStyle);

        double beszallitottKg = shipment.getNetWeight() != null ? shipment.getNetWeight() : 0.0;
        createCell(row, 10, beszallitottKg, decimalStyle);

        double leadottAtlag = (beszallitottDb > 0) ? beszallitottKg / beszallitottDb : 0.0;
        createCell(row, 11, leadottAtlag, decimalStyle);

        createCell(row, 12, utihullaDb, dataStyle);
        createCell(row, 13, utihullaKg, decimalStyle);

        createCell(row, 14, shipment.getKosherPercent(), decimalStyle);
        createCell(row, 15, shipment.getLiverWeight(), decimalStyle);
        createCell(row, 16, shipment.getFatteningRate(), decimalStyle);
        createCell(row, 17, elhullasDb, dataStyle);

        double calculatedMortalityRate = (befogoDb > 0) ? ((double) elhullasDb / befogoDb) : 0.0;

        createCell(row, 18, calculatedMortalityRate, percentStyle);

        createCell(row, 19, shipment.getFatteningDays(), dataStyle);
    }

    private void createHeaderRow(Sheet sheet, CellStyle style) {
        Row headerRow = sheet.createRow(0);
        headerRow.setHeightInPoints(45);
        for (int i = 0; i < COLUMNS.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(COLUMNS[i]);
            cell.setCellStyle(style);
        }
    }

    private void autoSizeColumns(Sheet sheet) {
        for (int i = 0; i < COLUMNS.length; i++) {
            sheet.autoSizeColumn(i);
            sheet.setColumnWidth(i, sheet.getColumnWidth(i) + 1000);
        }
    }

    private CellStyle createHeaderStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        style.setFillForegroundColor(IndexedColors.LAVENDER.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        setBorders(style);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setWrapText(true);
        Font font = workbook.createFont();
        font.setBold(true);
        style.setFont(font);
        return style;
    }

    private CellStyle createDataStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        setBorders(style);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        return style;
    }

    private CellStyle createDecimalStyle(Workbook workbook, CellStyle baseStyle) {
        CellStyle style = workbook.createCellStyle();
        style.cloneStyleFrom(baseStyle);
        style.setDataFormat(workbook.createDataFormat().getFormat("0.00"));
        return style;
    }

    private CellStyle createPercentStyle(Workbook workbook, CellStyle baseStyle) {
        CellStyle style = workbook.createCellStyle();
        style.cloneStyleFrom(baseStyle);
        style.setDataFormat(workbook.createDataFormat().getFormat("0.00%"));
        return style;
    }

    private void setBorders(CellStyle style) {
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
    }

    private void createCell(Row row, int col, Object value, CellStyle style) {
        Cell cell = row.createCell(col);
        cell.setCellStyle(style);
        if (value == null) cell.setCellValue(0);
        else if (value instanceof Integer) cell.setCellValue((Integer) value);
        else if (value instanceof Double) cell.setCellValue((Double) value);
        else cell.setCellValue(value.toString());
    }

    private String formatDate(LocalDate date) {
        return date != null ? date.toString().replace("-", ".") : "";
    }
}