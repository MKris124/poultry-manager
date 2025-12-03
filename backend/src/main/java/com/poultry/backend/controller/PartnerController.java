package com.poultry.backend.controller;

import com.poultry.backend.entities.Partner;
import com.poultry.backend.services.PartnerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
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
}
