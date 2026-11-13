package com.university.regulation.integration.ai;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.http.HttpClient;
import java.time.Duration;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

import com.university.regulation.dto.chat.ChatMessageResponse;

@Component
public class RagChatClient {

    private static final Logger log = LoggerFactory.getLogger(RagChatClient.class);
    private final RestClient restClient;

    public RagChatClient(
            @Value("${app.rag-service.base-url:http://localhost:8003}") String baseUrl) {
        HttpClient httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofSeconds(5))
                .build();

        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(httpClient);
        factory.setReadTimeout(Duration.ofSeconds(180));

        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(factory)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    public ChatMessageResponse chat(String message) {
        try {
            ChatMessageResponse response = restClient.post()
                    .uri("/api/v1/chat")
                    .body(new RagRequest(message))
                    .retrieve()
                    .body(ChatMessageResponse.class);

            if (response == null || response.answer() == null || response.answer().isBlank()) {
                log.error("RAG service returned an empty chat response");
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Dịch vụ tư vấn AI trả về phản hồi không hợp lệ");
            }

            return new ChatMessageResponse(response.answer().trim());
        } catch (RestClientException exception) {
            log.warn("Không gọi được RAG service: {}", exception.getClass().getSimpleName());
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Dịch vụ tư vấn AI hiện không khả dụng");
        }
    }

    public void streamChat(String message, OutputStream outputStream) throws IOException {
        try {
            restClient.post()
                    .uri("/api/v1/chat/stream")
                    .body(new RagRequest(message))
                    .exchange((request, response) -> {
                        if (!response.getStatusCode().is2xxSuccessful()) {
                            log.warn("RAG stream returned HTTP {}", response.getStatusCode().value());
                            throw new ResponseStatusException(
                                    HttpStatus.SERVICE_UNAVAILABLE,
                                    "Dịch vụ tư vấn AI hiện không khả dụng");
                        }

                        try (InputStream inputStream = response.getBody()) {
                            byte[] buffer = new byte[1024];
                            int bytesRead;
                            while ((bytesRead = inputStream.read(buffer)) != -1) {
                                outputStream.write(buffer, 0, bytesRead);
                                outputStream.flush();
                            }
                        }
                        return null;
                    });
        } catch (RestClientException exception) {
            log.warn("Không gọi được RAG stream: {}", exception.getClass().getSimpleName());
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Dịch vụ tư vấn AI hiện không khả dụng",
                    exception);
        }
    }

    private record RagRequest(String message) {
    }
}
