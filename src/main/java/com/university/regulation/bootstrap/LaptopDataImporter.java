package com.university.regulation.bootstrap;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import com.university.regulation.dto.importdata.LaptopImportResult;
import com.university.regulation.service.LaptopImportService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(
        prefix = "app.data-import",
        name = "laptops-enabled",
        havingValue = "true"
)
public class LaptopDataImporter
        implements ApplicationRunner {

    private final LaptopImportService laptopImportService;

    @Value("${app.data-import.max-products:20}")
    private int maxProducts;

    @Override
    public void run(ApplicationArguments args) {

        log.info(
                "Bắt đầu import dữ liệu laptop, giới hạn: {}",
                maxProducts
        );

        try {
            LaptopImportResult result =
                    laptopImportService.importLaptops(
                            maxProducts
                    );

            log.info(
                    """
                    Import laptop hoàn thành:
                    - Tổng đọc: {}
                    - Sản phẩm tạo mới: {}
                    - Sản phẩm bỏ qua: {}
                    - Ảnh tạo mới: {}
                    """,
                    result.totalRead(),
                    result.productsCreated(),
                    result.productsSkipped(),
                    result.imagesCreated()
            );

        } catch (Exception exception) {

            log.error(
                    "Import dữ liệu laptop thất bại: {}",
                    exception.getMessage(),
                    exception
            );
        }
    }
}