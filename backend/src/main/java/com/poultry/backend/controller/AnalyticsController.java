package com.poultry.backend.controller;

import com.poultry.backend.dtos.LeaderboardDTO;
import com.poultry.backend.dtos.PartnerStatsDTO;
import com.poultry.backend.services.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class AnalyticsController {
    private final AnalyticsService analyticsService;

    @GetMapping("/overview")
    public Map<Long, PartnerStatsDTO> getOverview() {
        return analyticsService.getAllPartnerStats();
    }

    @GetMapping("/partner/{id}")
    public PartnerStatsDTO getPartnerStats(@PathVariable Long id) {
        return analyticsService.getPartnerStats(id);
    }

    @GetMapping("/location/{id}")
    public PartnerStatsDTO getLocationStats(@PathVariable Long id) {
        return analyticsService.getLocationStats(id);
    }

    @GetMapping("/grower/{id}")
    public PartnerStatsDTO getGrowerStats(@PathVariable Long id) {
        return analyticsService.getGrowerStats(id);
    }

    @GetMapping("/leaderboard")
    public List<LeaderboardDTO> getLeaderboard() {
        return analyticsService.getLeaderboard();
    }
}
