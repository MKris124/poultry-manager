package com.poultry.backend.entities;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "growers")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Grower {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    private String city;

    @ManyToMany(mappedBy = "growers", fetch = FetchType.EAGER)
    @JsonIgnoreProperties("growers")
    @ToString.Exclude
    private List<Partner> partners = new ArrayList<>();
}