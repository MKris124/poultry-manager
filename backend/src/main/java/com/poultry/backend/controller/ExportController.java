package com.poultry.backend.controller;

import com.poultry.backend.services.ShipmentExportService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/export")
@RequiredArgsConstructor
public class ExportController {

    private final ShipmentExportService shipmentExportService;

    @PostMapping("/selected-partners")
    public ResponseEntity<Resource> exportSelected(@RequestBody List<Long> partnerIds) throws IOException {
        String filename = "szallitmanyok_export.xlsx";

        InputStreamResource file = new InputStreamResource(shipmentExportService.exportShipments(partnerIds));

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename)
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(file);
    }
}