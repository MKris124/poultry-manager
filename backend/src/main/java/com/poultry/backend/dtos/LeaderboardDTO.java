package com.poultry.backend.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class LeaderboardDTO {
    private Long partnerId;
    private String partnerName;
    private Double avgLiverWeight;
    private Double avgKosherPercent;
    private Double avgMortalityRate;
    private Double totalScore;

    private boolean isGroup;
    private String groupColor;
    private List<LeaderboardDTO> members;
}