package com.university.regulation.service.chat;

import com.university.regulation.dto.chat.ChatRequest;
import com.university.regulation.dto.chat.ChatResponse;
import org.springframework.stereotype.Service;

@Service
public class ChatService {

    private final EmbeddingServiceClient embeddingServiceClient;

    public ChatService(EmbeddingServiceClient embeddingServiceClient) {
        this.embeddingServiceClient = embeddingServiceClient;
    }

    public ChatResponse processMessage(ChatRequest request) {

        var result = embeddingServiceClient.embed(request.message());

        return new ChatResponse(
                request.message(),
                result.embedding(),
                result.dimension()
        );
    }
}

