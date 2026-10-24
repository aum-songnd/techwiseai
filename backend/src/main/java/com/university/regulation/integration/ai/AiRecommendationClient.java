package com.university.regulation.integration.ai;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import com.university.regulation.dto.products.RecommendedProductResponse;

import lombok.extern.slf4j.Slf4j;

/**
 * Client kết nối tới microservice recommendation-service (Python / FastAPI riêng biệt)
 * để lấy danh sách đề xuất sản phẩm thông minh.
 */
@Slf4j
@Component
public class AiRecommendationClient {

    private final RestClient recommendationRestClient;

    public record PythonRecResponse(
            boolean success,
            String message,
            List<RecommendedProductResponse> data
    ) {}

    public AiRecommendationClient(
            @Value("${app.recommendation-service.base-url:http://localhost:8001}") String baseUrl
    ) {
        HttpClient httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofSeconds(3))
                .build();

        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(httpClient);
        factory.setReadTimeout(Duration.ofSeconds(8));

        this.recommendationRestClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(factory)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    public List<RecommendedProductResponse> getRecommendations(UUID productId, int limit) {
        try {
            PythonRecResponse response = recommendationRestClient
                    .get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/api/v1/recommendations/{productId}")
                            .queryParam("limit", limit)
                            .build(productId))
                    .retrieve()
                    .body(PythonRecResponse.class);

            if (response != null && response.success() && response.data() != null && !response.data().isEmpty()) {
                log.info("Lấy đề xuất thành công từ Python recommendation-service cho sản phẩm {}: {} mục", productId, response.data().size());
                return response.data();
            }
        } catch (Exception e) {
            log.warn("Không kết nối được recommendation-service Python cho sản phẩm {}: {}, chuyển sang engine dự phòng", productId, e.getMessage());
        }
        return null;
    }
}
