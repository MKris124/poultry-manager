package com.poultry.backend.controller;

import com.poultry.backend.dtos.CreateShipmentDTO;
import com.poultry.backend.dtos.ImportResult;
import com.poultry.backend.dtos.ImportRowDTO;
import com.poultry.backend.services.ShipmentImportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/import")
@RequiredArgsConstructor
public class ImportController {

    private final ShipmentImportService importService;

    @PostMapping("/preview")
    public ResponseEntity<List<ImportRowDTO>> preview(@RequestParam("file") MultipartFile file) throws IOException {
        return ResponseEntity.ok(importService.previewExcel(file));
    }

    @PostMapping("/save")
    public ResponseEntity<ImportResult> save(@RequestBody List<CreateShipmentDTO> rows) {
        int count = importService.saveImportedRows(rows);
        ImportResult result = new ImportResult();
        result.setSuccessCount(count);
        return ResponseEntity.ok(result);
    }
}