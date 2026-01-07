package com.poultry.backend.dtos;

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
    private Integer quantity;
    private Double totalWeight;
    private Double liverWeight;
    private Double kosherPercent;
    private Double fatteningRate;
    private Integer mortalityCount;
    private Double mortalityRate;
    private Integer processingWeek;
    private Integer transportMortality;
    private Double transportMortalityKg;
    private Integer fatteningDays;
    private Integer netQuantity;
    private Double netWeight;
}
