package com.poultry.backend.dtos;

import lombok.Data;
import java.util.ArrayList;
import java.util.List;

@Data
public class ImportRowDTO {
    private int rowNumber;
    private boolean valid;
    private List<String> errors = new ArrayList<>();

    private String growerName;
    private String partnerName;
    private String deliveryCode;
    private String locationCity;

    private CreateShipmentDTO shipmentData;

    public void addError(String error) {
        this.errors.add(error);
        this.valid = false;
    }
}