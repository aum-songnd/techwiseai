package com.university.regulation.ai;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import tools.jackson.databind.JsonNode;
import com.university.regulation.config.AiProperties;

/**
 * Client mỏng gọi API chuẩn OpenAI: /embeddings và /chat/completions.
 * Embedding trỏ tới server Python local; Chat (tùy chọn) trỏ tới Ollama hoặc dịch vụ khác.
 */
@Component
public class AiClient {

    private final RestClient embeddingClient;
    private final RestClient chatClient;
    private final AiProperties props;

    public AiClient(
            @Qualifier("aiEmbeddingRestClient") RestClient embeddingClient,
            @Qualifier("aiChatRestClient") RestClient chatClient,
            AiProperties props) {
        this.embeddingClient = embeddingClient;
        this.chatClient = chatClient;
        this.props = props;
    }

    public boolean isEmbeddingEnabled() {
        return props.isEmbeddingEnabled();
    }

    public boolean isChatEnabled() {
        return props.isChatEnabled();
    }

    public float[] embed(String text) {
        Map<String, Object> body = new HashMap<>();
        body.put("model", props.getEmbeddingModel());
        body.put("input", text);
        if (props.isSendDimensions()) {
            body.put("dimensions", props.getEmbeddingDimensions());
        }

        JsonNode response = embeddingClient.post()
                .uri("/embeddings")
                .body(body)
                .retrieve()
                .body(JsonNode.class);

        JsonNode array = response == null ? null : response.path("data").path(0).path("embedding");
        if (array == null || !array.isArray() || array.isEmpty()) {
            throw new IllegalStateException("Phản hồi embedding không hợp lệ");
        }
        if (array.size() != props.getEmbeddingDimensions()) {
            throw new IllegalStateException("Embedding có " + array.size() + " chiều, cấu hình là "
                    + props.getEmbeddingDimensions());
        }

        float[] vector = new float[array.size()];
        for (int i = 0; i < vector.length; i++) {
            vector[i] = (float) array.get(i).asDouble();
        }
        return vector;
    }

    /** Gọi chat completion và ép trả về JSON; trả về chuỗi JSON thô. */
    public String chatJson(String systemPrompt, String userPrompt) {
        Map<String, Object> body = Map.of(
                "model", props.getChatModel(),
                "temperature", 0.2,
                "response_format", Map.of("type", "json_object"),
                "messages", List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user", "content", userPrompt)));

        JsonNode response = chatClient.post()
                .uri("/chat/completions")
                .body(body)
                .retrieve()
                .body(JsonNode.class);

        String content = response == null
                ? ""
                : response.path("choices").path(0).path("message").path("content").asText("");
        if (content.isBlank()) {
            throw new IllegalStateException("Phản hồi chat rỗng");
        }
        return content;
    }
}
