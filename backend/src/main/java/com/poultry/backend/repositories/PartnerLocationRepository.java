package com.poultry.backend.repositories;

import com.poultry.backend.entities.Partner;
import com.poultry.backend.entities.PartnerLocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PartnerLocationRepository extends JpaRepository<PartnerLocation, Long> {
    Optional<PartnerLocation> findByPartnerAndCity(Partner partner, String city);
}
