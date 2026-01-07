package com.poultry.backend.repositories;

import com.poultry.backend.dtos.PartnerTotalQuantityDTO;
import com.poultry.backend.entities.Grower;
import com.poultry.backend.entities.Partner;
import com.poultry.backend.entities.PartnerLocation;
import com.poultry.backend.entities.Shipment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ShipmentRepository extends JpaRepository<Shipment, Long> {
    List<Shipment> findByLocationPartnerIdOrderByProcessingDateDesc(Long partnerId);

    List<Shipment> findByLocationPartnerIdInOrderByProcessingDateDesc(List<Long> partnerIds);

    long countByGrowerAndLocation_Partner(Grower grower, Partner partner);

    List<Shipment> findByLocationIdOrderByProcessingDateDesc(Long locationId);

    Optional<Shipment> findByDeliveryCodeAndLocation(String deliveryCode, PartnerLocation location);

    List<Shipment> findByGrowerIdOrderByProcessingDateDesc(Long growerId);

    @Query("SELECT SUM(s.quantity) FROM Shipment s WHERE s.grower.id = :growerId AND s.location.partner.id = :partnerId")
    Integer sumQuantityByGrowerAndPartner(Long growerId, Long partnerId);


    @Query("SELECT new com.poultry.backend.dtos.PartnerTotalQuantityDTO(s.location.partner.id, SUM(s.netQuantity)) " +
            "FROM Shipment s GROUP BY s.location.partner.id")
    List<PartnerTotalQuantityDTO> getTotalQuantitiesByPartner();
}