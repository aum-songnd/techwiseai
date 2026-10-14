package com.university.regulation.common.response;

import java.time.Instant;
import java.util.Map;

import org.springframework.http.HttpStatus;

public record ApiResponse<T>(

        boolean success,

        int status,

        String code,

        String message,

        T data,

        Map<String, String> errors,

        Instant timestamp,

        String path

) {

    public static <T> ApiResponse<T> success(
            HttpStatus status,
            String message,
            T data,
            String path
    ) {
        return new ApiResponse<>(
                true,
                status.value(),
                "SUCCESS",
                message,
                data,
                Map.of(),
                Instant.now(),
                path
        );
    }

    public static <T> ApiResponse<T> success(
            String message,
            T data,
            String path
    ) {
        return success(
                HttpStatus.OK,
                message,
                data,
                path
        );
    }

    public static ApiResponse<Object> error(
            HttpStatus status,
            String code,
            String message,
            String path
    ) {
        return error(
                status,
                code,
                message,
                Map.of(),
                path
        );
    }

    public static ApiResponse<Object> error(
            HttpStatus status,
            String code,
            String message,
            Map<String, String> errors,
            String path
    ) {
        return new ApiResponse<>(
                false,
                status.value(),
                code,
                message,
                null,
                errors,
                Instant.now(),
                path
        );
    }
}
