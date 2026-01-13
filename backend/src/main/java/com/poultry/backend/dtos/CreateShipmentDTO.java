package com.poultry.backend.dtos;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.LocalDate;

@Data
public class CreateShipmentDTO {
    private Long partnerId;
    private Long locationId;
    private Long growerId;

    private String deliveryCode;
    private LocalDate deliveryDate;
    private LocalDate processingDate;

    @Min(value = 0, message = "A darabszám nem lehet negatív")
    private Integer quantity;
    private Double totalWeight;
    private Double liverWeight;
    private Double kosherPercent;

    private Integer mortalityCount;
    private Double mortalityRate;
    private Integer fatteningDays;
    private Integer transportMortality;
    private Double transportMortalityKg;
    private Integer processingWeek;

    private Integer netQuantity;
    private Double netWeight;
    private Double fatteningRate;

    private String tempGrowerName;
    private String tempGrowerCity;

    private String tempPartnerName;
    private String tempCity;
    private String tempCounty;
}