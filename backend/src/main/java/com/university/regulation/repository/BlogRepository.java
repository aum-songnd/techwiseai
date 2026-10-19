package com.university.regulation.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.university.regulation.models.blog.Blog;

@Repository
public interface BlogRepository extends JpaRepository<Blog, String> {
    Optional<Blog> findBySlug(String slug);
    boolean existsBySlug(String slug);
    boolean existsBySlugAndIdNot(String slug, String id);

    List<Blog> findAllByOrderByPublishedAtDesc();

    @Query("SELECT b FROM Blog b JOIN b.categories c WHERE c.id = :categoryId ORDER BY b.publishedAt DESC")
    List<Blog> findByCategoryId(@Param("categoryId") String categoryId);

    @Query("SELECT b FROM Blog b JOIN b.categories c WHERE c.slug = :categorySlug ORDER BY b.publishedAt DESC")
    List<Blog> findByCategorySlug(@Param("categorySlug") String categorySlug);

    @Query("SELECT b FROM Blog b WHERE LOWER(b.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(b.slug) LIKE LOWER(CONCAT('%', :keyword, '%')) ORDER BY b.publishedAt DESC")
    List<Blog> searchByKeyword(@Param("keyword") String keyword);
}
