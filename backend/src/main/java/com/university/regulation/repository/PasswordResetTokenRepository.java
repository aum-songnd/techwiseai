package com.university.regulation.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.university.regulation.models.user.PasswordResetToken;
import com.university.regulation.models.user.User;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {

    Optional<PasswordResetToken> findFirstByUserAndTokenAndUsedFalseOrderByCreatedAtDesc(User user, String token);

    Optional<PasswordResetToken> findFirstByTokenAndUsedFalseOrderByCreatedAtDesc(String token);
}
