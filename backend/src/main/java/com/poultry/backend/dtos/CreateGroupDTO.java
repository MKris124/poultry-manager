package com.poultry.backend.dtos;

import lombok.Data;
import java.util.List;

@Data
public class CreateGroupDTO {
    private String name;
    private String color;
    private List<Long> partnerIds;
}