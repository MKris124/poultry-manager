package com.poultry.backend.controller;

import com.poultry.backend.dtos.CreateShipmentDTO;
import com.poultry.backend.entities.Shipment;
import com.poultry.backend.services.ShipmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/shipments")
@RequiredArgsConstructor
public class ShipmentController {
    private final ShipmentService shipmentService;

    @PostMapping
    public Shipment create(@RequestBody CreateShipmentDTO shipment) {
        return shipmentService.createShipment(shipment);
    }

    @GetMapping("/partner/{partnerId}")
    public List<Shipment> getByPartner(@PathVariable Long partnerId) {
        return shipmentService.getHistoryByPartner(partnerId);
    }

    @PostMapping("/history/batch")
    public List<Shipment> getHistoryByPartners(@RequestBody List<Long> partnerIds) {
        return shipmentService.getHistoryByPartner(partnerIds);
    }

    @GetMapping("/location/{id}")
    public List<Shipment> getHistoryByLocation(@PathVariable Long id) {
        return shipmentService.getHistoryByLocation(id);
    }

    @GetMapping("/grower/{id}")
    public List<Shipment> getHistoryByGrower(@PathVariable Long id) {
        return shipmentService.getHistoryByGrower(id);
    }

    @PutMapping("/{id}")
    public Shipment update(@PathVariable Long id, @RequestBody CreateShipmentDTO dto) {
        return shipmentService.updateShipment(id, dto);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        shipmentService.deleteShipment(id);
    }
}
