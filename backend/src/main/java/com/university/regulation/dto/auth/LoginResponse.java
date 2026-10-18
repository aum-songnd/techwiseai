package com.university.regulation.dto.auth;

import java.util.List;

public record LoginResponse(

        String accessToken,

        String tokenType,

        long expiresIn,

        String username,

        List<String> authorities,

        String fullName,

        String phoneNumber,

        String email,

        String avatarUrl

) {
        public LoginResponse(
                String accessToken,
                String tokenType,
                long expiresIn,
                String username,
                List<String> authorities
        ) {
                this(accessToken, tokenType, expiresIn, username, authorities, null, null, null, null);
        }
}
