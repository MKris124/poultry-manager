package com.poultry.backend.services;

import com.poultry.backend.dtos.CreateShipmentDTO;
import com.poultry.backend.entities.Partner;
import com.poultry.backend.entities.Shipment;
import com.poultry.backend.repositories.PartnerRepository;
import com.poultry.backend.repositories.ShipmentRepository;
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
    private final PartnerRepository partnerRepository;

    public Shipment createShipment(CreateShipmentDTO createShipment) {
        validateAndFixDeliveryCode(createShipment);
        validateNumericFields(createShipment);

        Partner partner = partnerRepository.findById(createShipment.getPartnerId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Partner nem található!"));

        Shipment shipment = new Shipment();
        shipment.setPartner(partner);

        mapDtoToEntity(createShipment, shipment);

        return shipmentRepository.save(shipment);
    }

    public Shipment updateShipment(Long id, CreateShipmentDTO shipmentToUpdate) {
        validateAndFixDeliveryCode(shipmentToUpdate);
        validateNumericFields(shipmentToUpdate);

        Shipment shipment = shipmentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nincs ilyen szállítás"));

        mapDtoToEntity(shipmentToUpdate, shipment);

        return shipmentRepository.save(shipment);
    }

    public List<Shipment> getHistoryByPartner(Long partnerId) {
        return shipmentRepository.findByPartnerIdOrderByProcessingDateDesc(partnerId);
    }

    public List<Shipment> getHistoryByPartner(List<Long> partnerIds) {
        return shipmentRepository.findByPartnerIdInOrderByProcessingDateDesc(partnerIds);
    }

    public List<Shipment> getAllShipments() {
        return shipmentRepository.findAll();
    }

    public void deleteShipment(Long id) {
        shipmentRepository.deleteById(id);
    }

    private void mapDtoToEntity(CreateShipmentDTO createShipment, Shipment shipment) {
        shipment.setDeliveryCode(createShipment.getDeliveryCode());
        shipment.setDeliveryDate(createShipment.getDeliveryDate());
        shipment.setProcessingDate(createShipment.getProcessingDate());

        if (createShipment.getProcessingDate() != null) {
            int week = createShipment.getProcessingDate().get(WeekFields.ISO.weekOfWeekBasedYear());
            shipment.setProcessingWeek(week);
        } else {
            shipment.setProcessingWeek(createShipment.getProcessingWeek() != null ? createShipment.getProcessingWeek() : 0);
        }

        shipment.setQuantity(createShipment.getQuantity());
        shipment.setTotalWeight(createShipment.getTotalWeight());
        shipment.setLiverWeight(createShipment.getLiverWeight());
        shipment.setKosherPercent(createShipment.getKosherPercent());

        shipment.setMortalityCount(createShipment.getMortalityCount());
        shipment.setTransportMortality(createShipment.getTransportMortality());
        shipment.setTransportMortalityKg(createShipment.getTransportMortalityKg());
        shipment.setFatteningDays(createShipment.getFatteningDays());

        // 1. Beszállított darabszám (NetQuantity) számítása
        // Logika: Befogott db (Quantity) - Elhullás (MortalityCount)
        int calculatedNetQuantity = 0;
        if (createShipment.getQuantity() != null) {
            int mortality = createShipment.getMortalityCount() != null ? createShipment.getMortalityCount() : 0;
            calculatedNetQuantity = createShipment.getQuantity() - mortality;
            shipment.setNetQuantity(calculatedNetQuantity);
        } else {
            // Ha valamiért nincs befogott db, de van direktben megadott nettó db (frissítésnél)
            calculatedNetQuantity = createShipment.getNetQuantity() != null ? createShipment.getNetQuantity() : 0;
            shipment.setNetQuantity(calculatedNetQuantity);
        }

        shipment.setNetWeight(createShipment.getNetWeight());

        if (createShipment.getFatteningRate() != null) {
            shipment.setFatteningRate(createShipment.getFatteningRate());
        } else {
            Double calculatedRate = calculateFatteningRate(
                    createShipment.getTotalWeight(),
                    createShipment.getQuantity(),
                    createShipment.getNetWeight(),
                    calculatedNetQuantity
            );
            shipment.setFatteningRate(calculatedRate);
        }

        if (createShipment.getQuantity() != null && createShipment.getQuantity() > 0 &&
                createShipment.getMortalityCount() != null) {

            double rate = (double) createShipment.getMortalityCount() / createShipment.getQuantity() * 100.0;
            shipment.setMortalityRate(Math.round(rate * 100.0) / 100.0);

        } else {
            shipment.setMortalityRate(createShipment.getMortalityRate());
        }
    }

    private Double calculateFatteningRate(
            Double totalWeight, Integer quantity, Double netWeight, Integer netQuantity) {
        if (totalWeight == null || netWeight == null ||
                quantity == null || quantity == 0 ||
                netQuantity == null || netQuantity == 0) {
            return 0.0;
        }

        double avgTotalWeight = totalWeight / quantity;
        double avgNetWeight = netWeight / netQuantity;

        return avgNetWeight - avgTotalWeight;
    }

    private void validateAndFixDeliveryCode(CreateShipmentDTO dto) {
        if (dto.getDeliveryCode() == null || dto.getDeliveryCode().trim().isEmpty()) return;

        String code = dto.getDeliveryCode().trim();
        String[] parts = code.split("/");

        if (parts.length != 2) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Hibás formátum! Helyes: Sorszám/Év (pl. 001/25)");
        }

        if (dto.getDeliveryDate() != null) {
            String yearSuffix = String.valueOf(dto.getDeliveryDate().getYear()).substring(2);
            if (!parts[1].equals(yearSuffix)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "A kód évének (" + parts[1] + ") egyeznie kell a dátummal (" + yearSuffix + ")!");
            }
        }
        dto.setDeliveryCode(code);
    }

    private void validateNumericFields(CreateShipmentDTO dto) {
        if (isNegative(dto.getQuantity())) throwBadRequest("A befogott darabszám");
        if (isNegative(dto.getProcessingWeek())) throwBadRequest("A hét");
        if (isNegative(dto.getTransportMortality())) throwBadRequest("Az útihullás darabszám");
        if (isNegative(dto.getFatteningDays())) throwBadRequest("A tömés napok");
        if (isNegative(dto.getNetQuantity())) throwBadRequest("A beszállított darabszám");

        if (isNegative(dto.getTotalWeight())) throwBadRequest("A befogott súly");
        if (isNegative(dto.getNetWeight())) throwBadRequest("A beszállított súly");
        if (isNegative(dto.getTransportMortalityKg())) throwBadRequest("Az útihullás súly");
        if (isNegative(dto.getLiverWeight())) throwBadRequest("A máj súly");

        if (dto.getKosherPercent() != null && (dto.getKosherPercent() < 0 || dto.getKosherPercent() > 100)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A kóser százaléknak 0 és 100 között kell lennie!");
        }
    }

    private boolean isNegative(Integer value) {
        return value != null && value < 0;
    }

    private boolean isNegative(Double value) {
        return value != null && value < 0;
    }

    private void throwBadRequest(String fieldName) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, fieldName + " nem lehet negatív!");
    }
}