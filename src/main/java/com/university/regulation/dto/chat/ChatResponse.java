package com.university.regulation.dto.chat;

import java.util.List;

public record ChatResponse(
        String message,
        List<Double> embedding,
        int dimension
) {
}

