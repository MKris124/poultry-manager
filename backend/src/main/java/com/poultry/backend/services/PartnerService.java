package com.poultry.backend.services;

import com.poultry.backend.entities.Partner;
import com.poultry.backend.repositories.PartnerRepository;
import com.poultry.backend.repositories.ShipmentRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PartnerService {
    private final PartnerRepository partnerRepository;
    private final ShipmentRepository shipmentRepository;

    public List<Partner> getAllPartners() {
        return partnerRepository.findAll();
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

    public Partner updatePartner(Long id, Partner partnerDetails) {
        Partner partner = partnerRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Partner nem található"));

        // Az ID-t nem engedjük módosítani, az a kulcs!
        partner.setName(partnerDetails.getName());
        partner.setCity(partnerDetails.getCity());
        partner.setCounty(partnerDetails.getCounty());

        return partnerRepository.save(partner);
    }

    public void deletePartner(Long id) {
        if (!partnerRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Partner nem található");
        }
        partnerRepository.deleteById(id);
    }

    @Transactional
    public void deleteAllData() {
        shipmentRepository.deleteAll();
        partnerRepository.deleteAll();
    }
}
