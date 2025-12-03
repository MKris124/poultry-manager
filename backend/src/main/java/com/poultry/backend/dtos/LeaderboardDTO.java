package com.poultry.backend.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class LeaderboardDTO {
    private String partnerName;
    private Double avgLiverWeight;
    private Double avgKosherPercent;
    private Double avgMortalityRate;
    private Double totalScore;
}