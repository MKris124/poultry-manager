package com.poultry.backend.services;

import com.poultry.backend.dtos.CreateShipmentDTO;
import com.poultry.backend.entities.Grower;
import com.poultry.backend.entities.Partner;
import com.poultry.backend.entities.PartnerLocation;
import com.poultry.backend.entities.Shipment;
import com.poultry.backend.repositories.GrowerRepository;
import com.poultry.backend.repositories.PartnerLocationRepository;
import com.poultry.backend.repositories.ShipmentRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.temporal.WeekFields;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ShipmentService {
    private final ShipmentRepository shipmentRepository;
    private final PartnerLocationRepository partnerLocationRepository;
    private final GrowerRepository growerRepository;

    public Shipment createShipment(CreateShipmentDTO createShipment) {
        validateAndFixDeliveryCode(createShipment);

        if (createShipment.getLocationId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A telephely (Location ID) megadása kötelező!");
        }

        PartnerLocation location = partnerLocationRepository.findById(createShipment.getLocationId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Telephely nem található!"));

        Shipment shipment = new Shipment();
        shipment.setLocation(location);

        if (createShipment.getGrowerId() != null) {
            Grower grower = growerRepository.findById(createShipment.getGrowerId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "A megadott nevelő nem található!"));
            shipment.setGrower(grower);

            Partner partner = location.getPartner();
            if (!grower.getPartners().contains(partner)) {
                grower.getPartners().add(partner);
                partner.getGrowers().add(grower);
                growerRepository.save(grower);
            }
        }

        mapDtoToEntity(createShipment, shipment);
        return shipmentRepository.save(shipment);
    }

    @Transactional
    public Shipment updateShipment(Long id, CreateShipmentDTO shipmentToUpdate) {
        validateAndFixDeliveryCode(shipmentToUpdate);

        Shipment shipment = shipmentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nincs ilyen szállítás"));

        handleGrowerUpdate(shipment, shipmentToUpdate);

        mapDtoToEntity(shipmentToUpdate, shipment);
        return shipmentRepository.save(shipment);
    }

    private void handleGrowerUpdate(Shipment shipment, CreateShipmentDTO dto) {
        if (dto.getLocationId() != null && !dto.getLocationId().equals(shipment.getLocation().getId())) {
            PartnerLocation newLoc = partnerLocationRepository.findById(dto.getLocationId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Új telephely nem található"));
            shipment.setLocation(newLoc);
        }

        if (dto.getGrowerId() != null) {
            Grower currentGrower = shipment.getGrower();
            if (currentGrower == null || !dto.getGrowerId().equals(currentGrower.getId())) {
                Grower newGrower = growerRepository.findById(dto.getGrowerId())
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Grower nem található"));
                shipment.setGrower(newGrower);

                Partner partner = shipment.getLocation().getPartner();
                if (!newGrower.getPartners().contains(partner)) {
                    newGrower.getPartners().add(partner);
                    partner.getGrowers().add(newGrower);
                    growerRepository.save(newGrower);
                }
            }
        }
    }

    private void mapDtoToEntity(CreateShipmentDTO dto, Shipment shipment) {
        shipment.setDeliveryCode(dto.getDeliveryCode());
        shipment.setDeliveryDate(dto.getDeliveryDate());
        shipment.setProcessingDate(dto.getProcessingDate());

        if (dto.getProcessingDate() != null) {
            int week = dto.getProcessingDate().get(WeekFields.ISO.weekOfWeekBasedYear());
            shipment.setProcessingWeek(week);
        } else {
            shipment.setProcessingWeek(dto.getProcessingWeek() != null ? dto.getProcessingWeek() : 0);
        }

        shipment.setQuantity(dto.getQuantity());
        shipment.setTotalWeight(dto.getTotalWeight());
        shipment.setLiverWeight(dto.getLiverWeight());
        shipment.setKosherPercent(dto.getKosherPercent());
        shipment.setMortalityCount(dto.getMortalityCount());
        shipment.setTransportMortality(dto.getTransportMortality());
        shipment.setTransportMortalityKg(dto.getTransportMortalityKg());
        shipment.setFatteningDays(dto.getFatteningDays());

        shipment.setNetWeight(dto.getNetWeight());
    }

    private void validateAndFixDeliveryCode(CreateShipmentDTO dto) {
        if (dto.getDeliveryCode() == null || dto.getDeliveryCode().trim().isEmpty()) return;

        String code = dto.getDeliveryCode().trim();
        String[] parts = code.split("/");

        if (parts.length != 2) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Hibás formátum! Helyes: Sorszám/Év (pl. 001/25)");
        }
        if (dto.getDeliveryDate() != null) {
            String yearSuffix = String.valueOf(dto.getDeliveryDate().getYear()).substring(2);
            if (!parts[1].equals(yearSuffix)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A kód évének nem egyezik a dátummal!");
            }
        }
        dto.setDeliveryCode(code);
    }

    public List<Shipment> getHistoryByPartner(Long partnerId) {
        return shipmentRepository.findByLocationPartnerIdOrderByProcessingDateDesc(partnerId);
    }
    public List<Shipment> getHistoryByPartner(List<Long> partnerIds) {
        return shipmentRepository.findByLocationPartnerIdInOrderByProcessingDateDesc(partnerIds);
    }
    public List<Shipment> getHistoryByLocation(Long locationId) {
        return shipmentRepository.findByLocationIdOrderByProcessingDateDesc(locationId);
    }
    public List<Shipment> getHistoryByGrower(Long growerId) {
        return shipmentRepository.findByGrowerIdOrderByProcessingDateDesc(growerId);
    }
    public void deleteShipment(Long id) {
        shipmentRepository.deleteById(id);
    }
}