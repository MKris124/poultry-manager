package com.poultry.backend.repositories;

import com.poultry.backend.dtos.GrowerStatsDTO;
import com.poultry.backend.entities.Grower;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GrowerRepository extends JpaRepository<Grower, Long> {
    Optional<Grower> findByNameAndCity(String name, String city);

    @Query("SELECT s.grower.id, s.location.partner.id, SUM(s.quantity) " +
            "FROM Shipment s " +
            "WHERE s.grower IS NOT NULL AND s.location.partner IS NOT NULL " +
            "GROUP BY s.grower.id, s.location.partner.id")
    List<GrowerStatsDTO> getQuantitiesPerGrowerAndPartner();
}