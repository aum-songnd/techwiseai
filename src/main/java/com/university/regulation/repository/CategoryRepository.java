package com.university.regulation.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.university.regulation.models.category.Category;

public interface CategoryRepository
        extends JpaRepository<Category, UUID> {
    boolean existsByNameIgnoreCase(String name);
    boolean existsBySlugIgnoreCase(String slug);

    boolean existsByNameIgnoreCaseAndIdNot(String name, UUID id);
    boolean existsBySlugIgnoreCaseAndIdNot(String slug, UUID id);
    List<Category> findAllByActiveTrueOrderByDisplayOrderAsc();
}
