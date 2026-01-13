package com.poultry.backend.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GrowerStatsDTO {
    private Long growerId;
    private Long partnerId;
    private Long totalQuantity;
}