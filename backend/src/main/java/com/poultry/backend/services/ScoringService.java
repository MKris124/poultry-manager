package com.poultry.backend.services;

import com.poultry.backend.dtos.PartnerStatsDTO;
import org.springframework.stereotype.Service;

@Service
public class ScoringService {

    private static final double LIVER_MULTIPLIER = 400.0;
    private static final double KOSHER_MULTIPLIER = 5.0;
    private static final double BASE_MORTALITY_THRESHOLD = 5.0;
    private static final double MORTALITY_PENALTY_RATE = 0.025;

    public Double calculateScore(PartnerStatsDTO stats) {
        if (stats == null) return 0.0;

        if (stats.getAvgLiverWeight() <= 0 && stats.getAvgKosherPercent() <= 0) {
            return 0.0;
        }

        double baseScore = (stats.getAvgKosherPercent() * KOSHER_MULTIPLIER)
                + (stats.getAvgLiverWeight() * LIVER_MULTIPLIER);

        double mortality = stats.getAvgMortalityRate();
        double multiplier = 1.0;

        if (mortality >= 0) {
            multiplier = 1.0 + ((BASE_MORTALITY_THRESHOLD - mortality) * MORTALITY_PENALTY_RATE);
            if (multiplier < 0) multiplier = 0.0;
        }

        return Math.round((baseScore * multiplier) * 100.0) / 100.0;
    }
}