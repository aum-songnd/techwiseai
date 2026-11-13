package com.university.regulation.controller;

import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.university.regulation.common.response.ApiResponse;
import com.university.regulation.dto.chat.ChatMessageRequest;
import com.university.regulation.dto.chat.ChatMessageResponse;
import com.university.regulation.integration.ai.RagChatClient;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/chat")
@RequiredArgsConstructor
public class ChatController {

    private final RagChatClient ragChatClient;

    @PostMapping
    public ApiResponse<ChatMessageResponse> chat(
            @Valid @RequestBody ChatMessageRequest request,
            HttpServletRequest httpRequest) {
        ChatMessageResponse response = ragChatClient.chat(request.message());
        return ApiResponse.success(
                "Tư vấn sản phẩm thành công",
                response,
                httpRequest.getRequestURI());
    }

    @PostMapping(value = "/stream", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<StreamingResponseBody> streamChat(
            @Valid @RequestBody ChatMessageRequest request) {
        StreamingResponseBody stream = outputStream ->
                ragChatClient.streamChat(request.message(), outputStream);

        return ResponseEntity.ok()
                .contentType(new MediaType("text", "plain", java.nio.charset.StandardCharsets.UTF_8))
                .cacheControl(CacheControl.noCache())
                .header("X-Accel-Buffering", "no")
                .body(stream);
    }
}
