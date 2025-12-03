package com.poultry.backend.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.LocalDate;

@Entity
@Table(name = "shipments")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Shipment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "partner_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Partner partner;

    private String deliveryCode;
    private LocalDate deliveryDate;
    private LocalDate processingDate;

    private Integer quantity;
    private Double totalWeight;
    private Double liverWeight;
    private Double kosherPercent;
    private Double fatteningRate;
    private Integer mortalityCount;
    private Double mortalityRate;
    private Integer fatteningDays;
    private Integer transportMortality;
    private Double transportMortalityKg;
    private Integer processingWeek;

    private Integer netQuantity;
    private Double netWeight;
}
