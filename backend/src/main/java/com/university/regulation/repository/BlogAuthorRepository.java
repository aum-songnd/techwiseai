package com.university.regulation.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.university.regulation.models.blog.BlogAuthor;

@Repository
public interface BlogAuthorRepository extends JpaRepository<BlogAuthor, String> {
    Optional<BlogAuthor> findBySlug(String slug);
    List<BlogAuthor> findAllByOrderByCreatedAtAsc();
}
