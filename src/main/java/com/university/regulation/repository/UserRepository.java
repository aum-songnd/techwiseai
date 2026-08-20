package com.university.regulation.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.university.regulation.models.user.User;

public interface UserRepository
        extends JpaRepository<User, UUID> {

    Optional<User> findByUsernameIgnoreCase(String username);

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByUsernameIgnoreCase(String username);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByStudentCode(String studentCode);

    @EntityGraph(attributePaths = "roles")
    Optional<User> findWithRolesByUsernameIgnoreCase(String username);
}
