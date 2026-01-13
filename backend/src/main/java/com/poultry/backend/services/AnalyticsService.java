package com.poultry.backend.services;

import com.poultry.backend.dtos.LeaderboardDTO;
import com.poultry.backend.dtos.PartnerStatsDTO;
import com.poultry.backend.entities.Partner;
import com.poultry.backend.entities.PartnerGroup;
import com.poultry.backend.repositories.PartnerGroupRepository;
import com.poultry.backend.repositories.PartnerRepository;
import com.poultry.backend.repositories.ShipmentRepository;
import com.poultry.backend.repositories.IStatsProjection;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsService {
    private final ShipmentRepository shipmentRepository;
    private final PartnerRepository partnerRepository;
    private final PartnerGroupRepository groupRepository;
    private final ScoringService scoringService;

    @Cacheable("leaderboard")
    public List<LeaderboardDTO> getLeaderboard() {
        Map<Long, PartnerStatsDTO> statsMap = fetchAllStatsAsMap();

        List<LeaderboardDTO> finalLeaderboard = new ArrayList<>();
        Set<Long> processedPartnerIds = new HashSet<>();

        List<PartnerGroup> groups = groupRepository.findAll();
        GroupStats(groups, processedPartnerIds, statsMap, finalLeaderboard);

        List<Partner> allPartners = partnerRepository.findAll();
        SingleStats(allPartners, processedPartnerIds, statsMap, finalLeaderboard);

        finalLeaderboard.sort((a, b) -> Double.compare(b.getTotalScore(), a.getTotalScore()));

        return finalLeaderboard;
    }

    private void SingleStats(List<Partner> allPartners, Set<Long> processedPartnerIds, Map<Long, PartnerStatsDTO> statsMap, List<LeaderboardDTO> finalLeaderboard) {
        for (Partner partner : allPartners) {
            if (!processedPartnerIds.contains(partner.getId())) {
                PartnerStatsDTO stats = statsMap.getOrDefault(partner.getId(), new PartnerStatsDTO(0.0,0.0,0.0,0.0));

                if (hasData(stats)) {
                    finalLeaderboard.add(createLeaderboardEntry(partner.getId(), partner.getName(), stats, false, null, null));
                }
            }
        }
    }

    private void GroupStats(List<PartnerGroup> groups, Set<Long> processedPartnerIds, Map<Long, PartnerStatsDTO> statsMap, List<LeaderboardDTO> finalLeaderboard) {
        for (PartnerGroup group : groups) {
            List<LeaderboardDTO> memberDTOs = new ArrayList<>();

            double sumLiver = 0;
            double sumKosher = 0;
            double sumFattening = 0;
            double sumMortality = 0;
            int count = 0;

            for (Partner member : group.getMembers()) {
                processedPartnerIds.add(member.getId());
                PartnerStatsDTO memberStats = statsMap.getOrDefault(member.getId(), new PartnerStatsDTO(0.0, 0.0, 0.0, 0.0));

                if (hasData(memberStats)) {
                    sumLiver += memberStats.getAvgLiverWeight();
                    sumKosher += memberStats.getAvgKosherPercent();
                    sumFattening += memberStats.getAvgFatteningRate();
                    sumMortality += memberStats.getAvgMortalityRate();
                    count++;
                }

                memberDTOs.add(createLeaderboardEntry(member.getId(), member.getName(), memberStats, false, null, null));
            }

            PartnerStatsDTO groupStats = new PartnerStatsDTO(0.0, 0.0, 0.0, 0.0);
            if (count > 0) {
                groupStats = new PartnerStatsDTO(
                        sumLiver / count,
                        sumKosher / count,
                        sumFattening / count,
                        sumMortality / count
                );
            }

            finalLeaderboard.add(createLeaderboardEntry(group.getId() * -1, group.getName(), groupStats, true, group.getColor(), memberDTOs));
        }
    }

    private LeaderboardDTO createLeaderboardEntry(Long id, String name, PartnerStatsDTO stats, boolean isGroup, String color, List<LeaderboardDTO> members) {
        Double score = scoringService.calculateScore(stats);

        return new LeaderboardDTO(
                id,
                name,
                round(stats.getAvgLiverWeight()),
                round(stats.getAvgKosherPercent()),
                round(stats.getAvgMortalityRate()),
                score,
                isGroup,
                color,
                members
        );
    }

    private Map<Long, PartnerStatsDTO> fetchAllStatsAsMap() {
        List<IStatsProjection> rawStats = shipmentRepository.getAllPartnerStatsRaw();
        return rawStats.stream().collect(Collectors.toMap(
                IStatsProjection::getId,
                proj -> new PartnerStatsDTO(
                        proj.getLiver() != null ? proj.getLiver() : 0.0,
                        proj.getKosher() != null ? proj.getKosher() : 0.0,
                        proj.getFattening() != null ? proj.getFattening() : 0.0,
                        proj.getMortality() != null ? proj.getMortality() : 0.0
                )
        ));
    }

    private boolean hasData(PartnerStatsDTO stats) {
        return stats.getAvgLiverWeight() > 0 || stats.getAvgKosherPercent() > 0;
    }

    @Cacheable(value = "partnerStats", key = "#partnerId")
    public PartnerStatsDTO getPartnerStats(Long partnerId) {
        return shipmentRepository.getStatsByPartnerId(partnerId);
    }

    @Cacheable(value = "growerStats", key = "#growerId")
    public PartnerStatsDTO getGrowerStats(Long growerId) {
        return shipmentRepository.getStatsByGrowerId(growerId);
    }

    @Cacheable(value = "locationStats", key = "#locationId")
    public PartnerStatsDTO getLocationStats(Long locationId) {
        return shipmentRepository.getStatsByLocationId(locationId);
    }

    public Map<Long, PartnerStatsDTO> getAllPartnerStats() {
        return fetchAllStatsAsMap();
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}