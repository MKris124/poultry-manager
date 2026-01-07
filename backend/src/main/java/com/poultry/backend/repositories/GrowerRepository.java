package com.poultry.backend.repositories;

import com.poultry.backend.entities.Grower;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface GrowerRepository extends JpaRepository<Grower, Long> {
    Optional<Grower> findByNameAndCity(String name, String city);

}