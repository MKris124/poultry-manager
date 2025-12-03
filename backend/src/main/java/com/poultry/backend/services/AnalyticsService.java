package com.poultry.backend.services;

import com.poultry.backend.dtos.LeaderboardDTO;
import com.poultry.backend.dtos.PartnerStatsDTO;
import com.poultry.backend.entities.Partner;
import com.poultry.backend.entities.Shipment;
import com.poultry.backend.repositories.ShipmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsService {
    private final ShipmentRepository shipmentRepository;

    public Map<Long, PartnerStatsDTO> getAllPartnerStats() {
        Map<Partner, List<Shipment>> grouped = getShipmentsGroupedByPartner();
        Map<Long, PartnerStatsDTO> result = new HashMap<>();

        for (Map.Entry<Partner, List<Shipment>> entry : grouped.entrySet()) {
            result.put(entry.getKey().getId(), calculateStats(entry.getValue()));
        }
        return result;
    }

    public List<LeaderboardDTO> getLeaderboard() {
        Map<Partner, List<Shipment>> grouped = getShipmentsGroupedByPartner();
        List<LeaderboardDTO> leaderboard = new ArrayList<>();

        for (Map.Entry<Partner, List<Shipment>> entry : grouped.entrySet()) {
            Partner p = entry.getKey();
            PartnerStatsDTO stats = calculateStats(entry.getValue());

            boolean hasData = stats.getAvgLiverWeight() > 0 || stats.getAvgKosherPercent() > 0;

            if (hasData) {

                double liver = stats.getAvgLiverWeight() != null ? stats.getAvgLiverWeight() : 0.0;
                double kosher = stats.getAvgKosherPercent() != null ? stats.getAvgKosherPercent() : 0.0;

                double score = (kosher * 5) + (liver * 400);

                leaderboard.add(new LeaderboardDTO(
                        p.getName(),
                        stats.getAvgLiverWeight(),
                        stats.getAvgKosherPercent(),
                        stats.getAvgMortalityRate(),
                        Math.round(score * 100.0) / 100.0
                ));
            }
        }
        return leaderboard;
    }

    public PartnerStatsDTO getPartnerStats(Long partnerId) {
        List<Shipment> history = shipmentRepository.findByPartnerIdOrderByProcessingDateDesc(partnerId);
        if (history.isEmpty()) return new PartnerStatsDTO(0.0, 0.0, 0.0, 0.0);
        return calculateStats(history);
    }

    private Map<Partner, List<Shipment>> getShipmentsGroupedByPartner() {
        return shipmentRepository.findAll().stream()
                .collect(Collectors.groupingBy(Shipment::getPartner));
    }

    private PartnerStatsDTO calculateStats(List<Shipment> list) {
        double sumLiver = 0; int countLiver = 0;
        double sumKosher = 0; int countKosher = 0;
        double sumFattening = 0; int countFattening = 0;

        double sumMortalityRate = 0;
        int countMortalityRate = 0;

        for (Shipment s : list) {
            if (s.getLiverWeight() != null && s.getLiverWeight() > 0) {
                sumLiver += s.getLiverWeight(); countLiver++;
            }
            if (s.getKosherPercent() != null) {
                sumKosher += s.getKosherPercent(); countKosher++;
            }
            if (s.getFatteningRate() != null) {
                sumFattening += s.getFatteningRate(); countFattening++;
            }

            if (s.getMortalityRate() != null) {
                sumMortalityRate += s.getMortalityRate();
                countMortalityRate++;
            }
        }

        return new PartnerStatsDTO(
                round(countLiver > 0 ? sumLiver / countLiver : 0),
                round(countKosher > 0 ? sumKosher / countKosher : 0),
                round(countFattening > 0 ? sumFattening / countFattening : 0),

                round(countMortalityRate > 0 ? sumMortalityRate / countMortalityRate : 0)
        );
    }

    private double round(double value) {
        if (Double.isNaN(value) || Double.isInfinite(value)) return 0.00;
        return Math.round(value * 100.0) / 100.0;
    }

}