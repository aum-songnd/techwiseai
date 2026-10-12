package com.university.regulation.dto.importdata;

public record LaptopImportResult(
        int totalRead,
        int productsCreated,
        int productsSkipped,
        int imagesCreated
) {
}