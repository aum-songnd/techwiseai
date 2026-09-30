package com.university.regulation.service.chat;

// import com.university.regulation.dto.chat.ChatResponse;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;

@Service
public class EmbeddingServiceClient {

    private final RestClient restClient;

    public EmbeddingServiceClient() {
        this.restClient = RestClient.builder()
                .baseUrl("http://localhost:8000")
                .build();
    }

    public EmbeddingResponse embed(String text) {
        EmbeddingRequest request = new EmbeddingRequest(text);

        return restClient.post()
                .uri("/embed")
                .body(request)
                .retrieve()
                .body(EmbeddingResponse.class);
    }

    public record EmbeddingRequest(String text) {
    }

    public record EmbeddingResponse(
            List<Double> embedding,
            int dimension
    ) {
    }
}

