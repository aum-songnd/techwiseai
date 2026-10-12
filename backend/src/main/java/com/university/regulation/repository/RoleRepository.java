package com.university.regulation.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.university.regulation.models.enums.RoleCode;
import com.university.regulation.models.role.Role;


public interface RoleRepository
        extends JpaRepository<Role, UUID> {

    Optional<Role> findByCode(RoleCode code);

    boolean existsByCode(RoleCode code);
}