package com.university.regulation.dto.importdata;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record LaptopImportFile(
        List<LaptopImportItem> products
) {
}