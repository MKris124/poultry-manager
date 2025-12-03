package com.poultry.backend.dtos;

import lombok.Data;
import java.util.ArrayList;
import java.util.List;

@Data
public class ImportResult {
    private int successCount = 0;
    private int failedCount = 0;
    private List<String> errorMessages = new ArrayList<>();

    public void addError(int rowNum, String message) {
        this.failedCount++;
        this.errorMessages.add(rowNum + ". sor: " + message);
    }

    public void incrementSuccess() {
        this.successCount++;
    }
}