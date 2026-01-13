package com.poultry.backend.entities;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
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
    @JoinColumn(name = "location_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private PartnerLocation location;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "grower_id")
    @JsonIgnoreProperties({"partners", "shipments"})
    private Grower grower;

    private String deliveryCode;
    private LocalDate deliveryDate;
    private LocalDate processingDate;

    private Integer quantity;
    private Double totalWeight;
    private Double liverWeight;
    private Double kosherPercent;
    private Double fatteningRate;
    private Double mortalityRate;
    private Integer netQuantity;

    private Integer mortalityCount;
    private Integer fatteningDays;
    private Integer transportMortality;
    private Double transportMortalityKg;
    private Integer processingWeek;

    private Double netWeight;

    public Partner getPartner() {
        return location != null ? location.getPartner() : null;
    }

    @PrePersist
    @PreUpdate
    public void calculateDerivedFields() {
        int actualMortality = (mortalityCount != null) ? mortalityCount : 0;
        if (quantity != null) {
            this.netQuantity = quantity - actualMortality;
        }

        this.fatteningRate = calculateFatteningRate();

        if (quantity != null && quantity > 0 && mortalityCount != null) {
            this.mortalityRate = (double) mortalityCount / quantity * 100.0;
            this.mortalityRate = Math.round(this.mortalityRate * 100.0) / 100.0;
        } else if (quantity != null && quantity > 0) {
            this.mortalityRate = 0.0;
        }
    }

    private Double calculateFatteningRate() {
        if (totalWeight == null || netWeight == null ||
                quantity == null || quantity == 0 ||
                netQuantity == null || netQuantity == 0) {
            return 0.0;
        }
        double avgGross = totalWeight / quantity;
        double avgNet = netWeight / netQuantity;
        double rate = avgNet - avgGross;

        return Math.round(rate * 100.0) / 100.0;
    }
}