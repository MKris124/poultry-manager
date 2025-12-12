package com.poultry.backend.controller;

import com.poultry.backend.dtos.CreateGroupDTO;
import com.poultry.backend.entities.Partner;
import com.poultry.backend.entities.PartnerGroup;
import com.poultry.backend.services.PartnerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/partners")
@RequiredArgsConstructor
public class PartnerController {
    private final PartnerService partnerService;

    @GetMapping
    public List<Partner> getAll() {
        return partnerService.getAllPartners();
    }

    @PostMapping
    public Partner create(@RequestBody Partner partner) {
        return partnerService.createPartner(partner);
    }

    @PutMapping("/{id}")
    public Partner update(@PathVariable Long id, @RequestBody Partner partner) {
        return partnerService.updatePartner(id, partner);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        partnerService.deletePartner(id);
    }

    @DeleteMapping("/delete-all")
    public void deleteAll() {
        partnerService.deleteAllData();
    }

    @PostMapping("/groups")
    public ResponseEntity<PartnerGroup> createGroup(@RequestBody CreateGroupDTO dto) {
        return ResponseEntity.ok(partnerService.createGroup(dto));
    }

    @DeleteMapping("/groups/{id}")
    public ResponseEntity<Void> deleteGroup(@PathVariable Long id) {
        partnerService.deleteGroup(id);
        return ResponseEntity.noContent().build();
    }
}
