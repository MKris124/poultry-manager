package com.poultry.backend.controller;

import com.poultry.backend.entities.Grower;
import com.poultry.backend.repositories.GrowerRepository;
import com.poultry.backend.services.GrowerService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/growers")
@RequiredArgsConstructor
public class GrowerController {
    private final GrowerService growerService;

    @GetMapping
    public List<Grower> getAllGrowers() {
        return growerService.getAllGrowersWithStats();
    }

    @PostMapping
    public Grower createGrower(@RequestBody Grower grower) {
        return growerService.createGrower(grower);
    }

    @PutMapping("/{id}")
    public Grower updateGrower(@PathVariable Long id, @RequestBody Grower growerDetails) {
        return growerService.updateGrower(id, growerDetails);
    }

    @DeleteMapping("/{id}")
    public void deleteGrower(@PathVariable Long id) {
        growerService.deleteGrower(id);
    }
}