package com.poultry.backend.controller;

import com.poultry.backend.dtos.ImportResult;
import com.poultry.backend.services.ShipmentImportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/api/import")
public class ImportController {
    @Autowired
    private ShipmentImportService shipmentImportService;

    @PostMapping("/excel")
    public ResponseEntity<ImportResult> uploadFile(@RequestParam("file") MultipartFile file) throws IOException {
        return ResponseEntity.ok(shipmentImportService.importExcel(file));
    }
}
