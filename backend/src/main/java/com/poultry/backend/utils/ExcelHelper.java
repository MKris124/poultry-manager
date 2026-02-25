package com.poultry.backend.utils;

import org.apache.poi.ss.usermodel.*;
import java.time.LocalDate;
import java.time.ZoneId;

public class ExcelHelper {

    private ExcelHelper() {}

    public static String getCellString(Row row, int cellIndex) {
        Cell cell = row.getCell(cellIndex);
        return (cell == null) ? "" : cell.toString();
    }

    public static double getCellNum(Row row, int cellIndex) {
        Cell cell = row.getCell(cellIndex);
        return (cell == null) ? 0.0 : cell.getNumericCellValue();
    }

    public static LocalDate getCellDate(Row row, int cellIndex) {
        Cell cell = row.getCell(cellIndex);
        if (cell == null) return null;

        try {
            if (cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
                return cell.getDateCellValue().toInstant().atZone(ZoneId.systemDefault()).toLocalDate();
            }
            String dateStr = cell.toString().trim().replace(".", "-").replace("/", "-");
            return dateStr.isEmpty() ? null : LocalDate.parse(dateStr);
        } catch (Exception e) {
            return null;
        }
    }
}