package com.poultry.backend.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class PartnerTotalQuantityDTO {
    private Long partnerId;
    private Long totalQuantity;
}