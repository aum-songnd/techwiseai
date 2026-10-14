package com.university.regulation.dto.importdata;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record LaptopImageImportItem(

        String imageUrl,

        String publicId,

        String altText,

        Integer displayOrder,

        Boolean primaryImage
) {
}