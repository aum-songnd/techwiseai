package com.university.regulation.controller;

import com.university.regulation.dto.chat.ChatRequest;
import com.university.regulation.dto.chat.ChatResponse;
import com.university.regulation.service.chat.ChatService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @PostMapping
    public ResponseEntity<ChatResponse> chat(
            @Valid @RequestBody ChatRequest request
    ) {
        return ResponseEntity.ok(
                chatService.processMessage(request)
        );
    }
}
