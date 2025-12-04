package com.poultry.backend.repositories;

import com.poultry.backend.dtos.PartnerTotalQuantityDTO;
import com.poultry.backend.entities.Shipment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ShipmentRepository extends JpaRepository<Shipment, Long> {
    List<Shipment> findByPartnerIdOrderByProcessingDateDesc(Long partnerId);

    List<Shipment> findByPartnerIdInOrderByProcessingDateDesc(List<Long> partnerIds);

    Optional<Shipment> findByDeliveryCodeAndPartnerId( String deliveryCode, Long partnerId);

    @Query("SELECT new com.poultry.backend.dtos.PartnerTotalQuantityDTO(s.partner.id, SUM(s.netQuantity)) " +
            "FROM Shipment s GROUP BY s.partner.id")
    List<PartnerTotalQuantityDTO> getTotalQuantitiesByPartner();
}
