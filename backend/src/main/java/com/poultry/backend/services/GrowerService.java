package com.poultry.backend.services;

import com.poultry.backend.dtos.GrowerStatsDTO;
import com.poultry.backend.entities.Grower;
import com.poultry.backend.entities.Partner;
import com.poultry.backend.entities.Shipment;
import com.poultry.backend.repositories.GrowerRepository;
import com.poultry.backend.repositories.PartnerRepository;
import com.poultry.backend.repositories.ShipmentRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GrowerService {
    private final GrowerRepository growerRepository;
    private final ShipmentRepository shipmentRepository;
    private final PartnerRepository partnerRepository;

    public List<Grower> getAllGrowers() {
        return growerRepository.findAll();
    }

    public List<Grower> getAllGrowersWithStats() {
        List<Grower> growers = growerRepository.findAll();

        List<GrowerStatsDTO> stats = shipmentRepository.getQuantitiesPerGrowerAndPartner();

        Map<String, Long> statsMap = stats.stream().collect(Collectors.toMap(
                dto -> dto.getGrowerId() + "-" + dto.getPartnerId(),
                dto -> dto.getTotalQuantity() != null ? dto.getTotalQuantity() : 0L
        ));

        for (Grower g : growers) {
            for (Partner p : g.getPartners()) {
                String key = g.getId() + "-" + p.getId();
                p.setTotalQuantity(statsMap.getOrDefault(key, 0L));
            }
        }
        return growers;
    }

    public Grower createGrower(Grower g) { return growerRepository.save(g); }

    public Grower updateGrower(Long id, Grower details) {
        Grower g = growerRepository.findById(id).orElseThrow();
        g.setName(details.getName());
        g.setCity(details.getCity());
        return growerRepository.save(g);
    }

    @Transactional
    public void deleteGrower(Long id) {
        Grower grower = growerRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nevelő nem található"));

        List<Shipment> shipments = shipmentRepository.findByGrowerIdOrderByProcessingDateDesc(id);
        if (!shipments.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Ez a nevelő nem törölhető, mert már vannak rögzített szállítmányai! Előbb töröld a szállítmányokat.");
        }

        for (Partner partner : grower.getPartners()) {
            partner.getGrowers().remove(grower);
            partnerRepository.save(partner);
        }
        grower.getPartners().clear();
        growerRepository.save(grower);
        growerRepository.delete(grower);
    }
}