package com.poultry.backend.repositories;

import com.poultry.backend.dtos.GrowerStatsDTO;
import com.poultry.backend.dtos.PartnerStatsDTO;
import com.poultry.backend.dtos.PartnerTotalQuantityDTO;
import com.poultry.backend.entities.Grower;
import com.poultry.backend.entities.Partner;
import com.poultry.backend.entities.PartnerLocation;
import com.poultry.backend.entities.Shipment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ShipmentRepository extends JpaRepository<Shipment, Long> {
    List<Shipment> findByLocationPartnerIdOrderByProcessingDateDesc(Long partnerId);
    List<Shipment> findByLocationPartnerIdInOrderByProcessingDateDesc(List<Long> partnerIds);
    List<Shipment> findByLocationIdOrderByProcessingDateDesc(Long locationId);
    List<Shipment> findByGrowerIdOrderByProcessingDateDesc(Long growerId);
    Optional<Shipment> findByDeliveryCodeAndLocation(String deliveryCode, PartnerLocation location);

    @Query("SELECT new com.poultry.backend.dtos.PartnerStatsDTO(" +
            "COALESCE(AVG(s.liverWeight), 0), " +
            "COALESCE(AVG(s.kosherPercent), 0), " +
            "COALESCE(AVG(s.fatteningRate), 0), " +
            "COALESCE(AVG(s.mortalityRate), 0)) " +
            "FROM Shipment s WHERE s.location.partner.id = :partnerId")
    PartnerStatsDTO getStatsByPartnerId(@Param("partnerId") Long partnerId);

    @Query("SELECT new com.poultry.backend.dtos.PartnerStatsDTO(" +
            "COALESCE(AVG(s.liverWeight), 0), " +
            "COALESCE(AVG(s.kosherPercent), 0), " +
            "COALESCE(AVG(s.fatteningRate), 0), " +
            "COALESCE(AVG(s.mortalityRate), 0)) " +
            "FROM Shipment s WHERE s.grower.id = :growerId")
    PartnerStatsDTO getStatsByGrowerId(@Param("growerId") Long growerId);

    @Query("SELECT new com.poultry.backend.dtos.PartnerStatsDTO(" +
            "COALESCE(AVG(s.liverWeight), 0), " +
            "COALESCE(AVG(s.kosherPercent), 0), " +
            "COALESCE(AVG(s.fatteningRate), 0), " +
            "COALESCE(AVG(s.mortalityRate), 0)) " +
            "FROM Shipment s WHERE s.location.id = :locationId")
    PartnerStatsDTO getStatsByLocationId(@Param("locationId") Long locationId);

    @Query("SELECT s.location.partner.id as id, " +
            "AVG(s.liverWeight) as liver, " +
            "AVG(s.kosherPercent) as kosher, " +
            "AVG(s.fatteningRate) as fattening, " +
            "AVG(s.mortalityRate) as mortality " +
            "FROM Shipment s " +
            "WHERE s.location.partner IS NOT NULL " +
            "GROUP BY s.location.partner.id")
    List<IStatsProjection> getAllPartnerStatsRaw();

    @Query("SELECT new com.poultry.backend.dtos.PartnerTotalQuantityDTO(s.location.partner.id, SUM(s.netQuantity)) " +
            "FROM Shipment s " +
            "WHERE s.location.partner IS NOT NULL " +
            "GROUP BY s.location.partner.id")
    List<PartnerTotalQuantityDTO> getTotalQuantitiesByPartner();

    @Query("SELECT new com.poultry.backend.dtos.GrowerStatsDTO(" +
            "s.grower.id, s.location.partner.id, SUM(s.quantity)) " +
            "FROM Shipment s " +
            "WHERE s.grower IS NOT NULL AND s.location.partner IS NOT NULL " +
            "GROUP BY s.grower.id, s.location.partner.id")
    List<GrowerStatsDTO> getQuantitiesPerGrowerAndPartner();
}