package com.poultry.backend.services;

import com.poultry.backend.dtos.CreateGroupDTO;
import com.poultry.backend.dtos.PartnerTotalQuantityDTO;
import com.poultry.backend.entities.Partner;
import com.poultry.backend.entities.PartnerGroup;
import com.poultry.backend.entities.PartnerLocation;
import com.poultry.backend.repositories.PartnerGroupRepository;
import com.poultry.backend.repositories.PartnerRepository;
import com.poultry.backend.repositories.ShipmentRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PartnerService {
    private final PartnerRepository partnerRepository;
    private final ShipmentRepository shipmentRepository;
    private final PartnerGroupRepository groupRepository;

    public List<Partner> getAllPartners() {
        List<Partner> partners = partnerRepository.findAll();
        List<PartnerTotalQuantityDTO> totals = shipmentRepository.getTotalQuantitiesByPartner();

        Map<Long, Long> quantityMap = totals.stream()
                .collect(Collectors.toMap(
                        PartnerTotalQuantityDTO::getPartnerId,
                        dto -> dto.getTotalQuantity() != null ? dto.getTotalQuantity() : 0L
                ));

        for (Partner p : partners) {
            p.setTotalQuantity(quantityMap.getOrDefault(p.getId(), 0L));
        }
        return partners;
    }

    public Partner createPartner(Partner partner) {
        if (partnerRepository.existsById(partner.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Ez a Partner ID (" + partner.getId() + ") már foglalt!");
        }
        if (partner.getName() == null || partner.getName().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A név nem lehet üres!");
        }
        return partnerRepository.save(partner);
    }

    @Transactional // Fontos a tranzakció kezelés miatt!
    public Partner updatePartner(Long id, Partner partnerDetails) {
        Partner existingPartner = partnerRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Partner nem található"));

        existingPartner.setName(partnerDetails.getName());

        if (partnerDetails.getLocations() != null) {
            List<Long> incomingIds = new ArrayList<>();

            for (PartnerLocation incomingLoc : partnerDetails.getLocations()) {
                if (incomingLoc.getId() == null) {
                    incomingLoc.setPartner(existingPartner);
                    existingPartner.getLocations().add(incomingLoc);
                } else {
                    incomingIds.add(incomingLoc.getId());
                    existingPartner.getLocations().stream()
                            .filter(l -> l.getId().equals(incomingLoc.getId()))
                            .findFirst()
                            .ifPresent(existingLoc -> {
                                existingLoc.setCity(incomingLoc.getCity());
                                existingLoc.setCounty(incomingLoc.getCounty());
                            });
                }
            }
            existingPartner.getLocations().removeIf(loc ->
                    loc.getId() != null && !incomingIds.contains(loc.getId())
            );
        }

        return partnerRepository.save(existingPartner);
    }

    public void deletePartner(Long id) {
        if (!partnerRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Partner nem található");
        }
        partnerRepository.deleteById(id);
    }

    @Transactional
    public PartnerGroup createGroup(CreateGroupDTO dto) {
        PartnerGroup group = new PartnerGroup();
        group.setName(dto.getName());
        group.setColor(dto.getColor());

        group = groupRepository.saveAndFlush(group);

        List<Partner> partners = partnerRepository.findAllById(dto.getPartnerIds());
        for (Partner p : partners) {
            if (p.getGroup() != null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "A partner (" + p.getName() + ") már egy másik csoport tagja!");
            }
            p.setGroup(group);
            partnerRepository.save(p);
        }
        return group;
    }

    @Transactional
    public void deleteGroup(Long groupId) {
        PartnerGroup group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Csoport nem található"));

        List<Partner> members = group.getMembers();
        for(Partner p : members) {
            p.setGroup(null);
            partnerRepository.save(p);
        }
        groupRepository.delete(group);
    }

    @Transactional
    public void deleteAllData() {
        shipmentRepository.deleteAll();
        partnerRepository.deleteAll();
        groupRepository.deleteAll();
    }
}