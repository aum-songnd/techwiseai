package com.university.regulation.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.university.regulation.models.user.User;

public interface UserRepository
        extends JpaRepository<User, UUID> {

    Optional<User> findByUsernameIgnoreCase(String username);

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByUsernameIgnoreCase(String username);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByPhone(String phone);

    Optional<User> findByPhone(String phone);

    Optional<User> findByUsername(String username);

    @EntityGraph(attributePaths = "roles")
    Optional<User> findWithRolesByUsernameIgnoreCase(String username);

    @Query(
        value = "SELECT u FROM User u WHERE " +
                "LOWER(u.username) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
                "LOWER(u.fullName) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
                "LOWER(u.email) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
                "u.phone LIKE CONCAT('%', :keyword, '%')",
        countQuery = "SELECT COUNT(u) FROM User u WHERE " +
                "LOWER(u.username) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
                "LOWER(u.fullName) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
                "LOWER(u.email) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
                "u.phone LIKE CONCAT('%', :keyword, '%')"
    )
    Page<User> searchUsers(
            @Param("keyword") String keyword,
            Pageable pageable
    );
}
