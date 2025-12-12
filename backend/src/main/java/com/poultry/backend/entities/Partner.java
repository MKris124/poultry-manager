package com.poultry.backend.entities;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "partners")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Partner {
    @Id
    private Long id;

    @Column(nullable = false)
    private String name;
    private String city;
    private String county;

    @Transient
    private Long totalQuantity;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "group_id")
    @JsonIgnoreProperties("members")
    private PartnerGroup group;
}