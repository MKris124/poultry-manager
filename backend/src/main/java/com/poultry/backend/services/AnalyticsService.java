package com.poultry.backend.services;

import com.poultry.backend.dtos.LeaderboardDTO;
import com.poultry.backend.dtos.PartnerStatsDTO;
import com.poultry.backend.entities.Partner;
import com.poultry.backend.entities.PartnerGroup;
import com.poultry.backend.entities.Shipment;
import com.poultry.backend.repositories.PartnerGroupRepository;
import com.poultry.backend.repositories.PartnerRepository;
import com.poultry.backend.repositories.ShipmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsService {
    private final ShipmentRepository shipmentRepository;
    private final PartnerRepository partnerRepository;
    private final PartnerGroupRepository groupRepository;

    public List<LeaderboardDTO> getLeaderboard() {
        List<Shipment> allShipments = shipmentRepository.findAll();
        Map<Long, List<Shipment>> shipmentsByPartnerId = allShipments.stream()
                .filter(s -> s.getLocation() != null && s.getLocation().getPartner() != null)
                .collect(Collectors.groupingBy(s -> s.getLocation().getPartner().getId()));

        List<LeaderboardDTO> finalLeaderboard = new ArrayList<>();
        List<Partner> allPartners = partnerRepository.findAll();
        Set<Long> processedPartnerIds = new HashSet<>();

        List<PartnerGroup> groups = groupRepository.findAll();
        for (PartnerGroup group : groups) {
            List<Shipment> groupShipments = new ArrayList<>();
            List<LeaderboardDTO> memberDTOs = new ArrayList<>();

            for (Partner member : group.getMembers()) {
                processedPartnerIds.add(member.getId());
                // Itt már jó a map, mert location.partner.id alapján készült
                List<Shipment> memberShipList = shipmentsByPartnerId.getOrDefault(member.getId(), Collections.emptyList());
                groupShipments.addAll(memberShipList);

                LeaderboardDTO memberDTO = createDTO(member.getId(), member.getName(), memberShipList, false, null, null);
                if (memberDTO == null) {
                    memberDTO = new LeaderboardDTO(member.getId(), member.getName(), 0.0, 0.0, 0.0, 0.0, false, null, null);
                }
                memberDTOs.add(memberDTO);
            }

            LeaderboardDTO groupDTO = createDTO(group.getId()* -1, group.getName(), groupShipments, true, group.getColor(), memberDTOs);
            if (groupDTO != null) {
                finalLeaderboard.add(groupDTO);
            }
        }

        // 2. EGYÉNI PARTNEREK
        for (Partner partner : allPartners) {
            if (!processedPartnerIds.contains(partner.getId())) {
                List<Shipment> partnerShipments = shipmentsByPartnerId.getOrDefault(partner.getId(), Collections.emptyList());
                LeaderboardDTO dto = createDTO(partner.getId(), partner.getName(), partnerShipments, false, null, null);

                if (dto != null) {
                    finalLeaderboard.add(dto);
                }
            }
        }

        return finalLeaderboard;
    }

    private LeaderboardDTO createDTO(Long id, String name, List<Shipment> shipments, boolean isGroup, String color, List<LeaderboardDTO> members) {
        PartnerStatsDTO stats = calculateStats(shipments);

        boolean hasData = stats.getAvgLiverWeight() > 0 || stats.getAvgKosherPercent() > 0;
        boolean hasMembers = members != null && !members.isEmpty();

        if (!hasData && !hasMembers) {
            return null;
        }

        double liver = stats.getAvgLiverWeight();
        double kosher = stats.getAvgKosherPercent();
        double mortality = stats.getAvgMortalityRate();

        double baseScore = (kosher * 5) + (liver * 400);
        double multiplier = 1.0;
        if (mortality >= 0) {
            multiplier = 1.0 + ((5.0 - mortality) * 0.025);
            if (multiplier < 0) multiplier = 0.0;
        }
        double finalScore = baseScore * multiplier;

        return new LeaderboardDTO(
                id,
                name,
                liver,
                kosher,
                mortality,
                Math.round(finalScore * 100.0) / 100.0,
                isGroup,
                color,
                members
        );
    }

    private PartnerStatsDTO calculateStats(List<Shipment> list) {
        if (list == null || list.isEmpty()) return new PartnerStatsDTO(0.0, 0.0, 0.0, 0.0);

        double sumLiver = 0; int countLiver = 0;
        double sumKosher = 0; int countKosher = 0;
        double sumFattening = 0; int countFattening = 0;
        double sumMortalityRate = 0; int countMortalityRate = 0;

        for (Shipment shipment : list) {
            if (shipment.getLiverWeight() != null ) {
                sumLiver += shipment.getLiverWeight(); countLiver++;
            }
            if (shipment.getKosherPercent() != null) {
                sumKosher += shipment.getKosherPercent(); countKosher++;
            }
            if (shipment.getFatteningRate() != null) {
                sumFattening += shipment.getFatteningRate(); countFattening++;
            }
            if (shipment.getMortalityRate() != null) {
                sumMortalityRate += shipment.getMortalityRate(); countMortalityRate++;
            }
        }

        return new PartnerStatsDTO(
                round(countLiver > 0 ? sumLiver / countLiver : 0),
                round(countKosher > 0 ? sumKosher / countKosher : 0),
                round(countFattening > 0 ? sumFattening / countFattening : 0),
                round(countMortalityRate > 0 ? sumMortalityRate / countMortalityRate : 0)
        );
    }

    public PartnerStatsDTO getPartnerStats(Long partnerId) {
        List<Shipment> history = shipmentRepository.findByLocationPartnerIdOrderByProcessingDateDesc(partnerId);
        if (history.isEmpty()) return new PartnerStatsDTO(0.0, 0.0, 0.0, 0.0);
        return calculateStats(history);
    }

    public PartnerStatsDTO getLocationStats(Long locationId) {
        List<Shipment> history = shipmentRepository.findByLocationIdOrderByProcessingDateDesc(locationId);
        if (history.isEmpty()) return new PartnerStatsDTO(0.0, 0.0, 0.0, 0.0);
        return calculateStats(history);
    }

    public Map<Long, PartnerStatsDTO> getAllPartnerStats() {
        List<Shipment> all = shipmentRepository.findAll();
        Map<Long, List<Shipment>> byId = all.stream()
                .filter(s -> s.getLocation() != null && s.getLocation().getPartner() != null)
                .collect(Collectors.groupingBy(s -> s.getLocation().getPartner().getId()));

        return byId.entrySet().stream()
                .collect(Collectors.toMap(Map.Entry::getKey, e -> calculateStats(e.getValue())));
    }

    private double round(double value) {
        if (Double.isNaN(value) || Double.isInfinite(value)) return 0.00;
        return Math.round(value * 100.0) / 100.0;
    }
}