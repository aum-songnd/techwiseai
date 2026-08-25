package com.university.regulation.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.university.regulation.models.category.Category;

public interface CategoryRepository
        extends JpaRepository<Category, UUID> {

    List<Category> findAllByActiveTrueOrderByDisplayOrderAsc();
}
