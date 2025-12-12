package com.poultry.backend.repositories;

import com.poultry.backend.entities.PartnerGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PartnerGroupRepository extends JpaRepository<PartnerGroup, Long> {
}