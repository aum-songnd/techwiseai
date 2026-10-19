package com.university.regulation.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.university.regulation.models.blog.BlogCategory;

@Repository
public interface BlogCategoryRepository extends JpaRepository<BlogCategory, String> {
    Optional<BlogCategory> findBySlug(String slug);
    List<BlogCategory> findAllByOrderByCreatedAtAsc();
}
