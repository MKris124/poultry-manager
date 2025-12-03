package com.poultry.backend.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class PartnerStatsDTO {
    private Double avgLiverWeight;
    private Double avgKosherPercent;
    private Double avgFatteningRate;
    private Double avgMortalityRate;
}
