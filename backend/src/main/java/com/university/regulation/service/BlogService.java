package com.university.regulation.service;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.university.regulation.dto.blog.BlogAuthorResponse;
import com.university.regulation.dto.blog.BlogCategoryResponse;
import com.university.regulation.dto.blog.BlogRequest;
import com.university.regulation.dto.blog.BlogResponse;
import com.university.regulation.models.blog.Blog;
import com.university.regulation.models.blog.BlogAuthor;
import com.university.regulation.models.blog.BlogCategory;
import com.university.regulation.repository.BlogAuthorRepository;
import com.university.regulation.repository.BlogCategoryRepository;
import com.university.regulation.repository.BlogRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class BlogService {

    private final BlogRepository blogRepository;
    private final BlogCategoryRepository blogCategoryRepository;
    private final BlogAuthorRepository blogAuthorRepository;

    @Transactional(readOnly = true)
    public List<BlogResponse> getBlogs(String category, String search) {
        List<Blog> blogs;

        if (search != null && !search.isBlank()) {
            blogs = blogRepository.searchByKeyword(search.trim());
        } else if (category != null && !category.isBlank()) {
            // Can be category id or slug
            if (category.startsWith("blogcat-")) {
                blogs = blogRepository.findByCategoryId(category.trim());
            } else {
                blogs = blogRepository.findByCategorySlug(category.trim());
            }
        } else {
            blogs = blogRepository.findAllByOrderByPublishedAtDesc();
        }

        return blogs.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public BlogResponse getBlogByIdOrSlug(String idOrSlug) {
        Blog blog = blogRepository.findById(idOrSlug)
                .or(() -> blogRepository.findBySlug(idOrSlug))
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy bài viết: " + idOrSlug));

        return toResponse(blog);
    }

    @Transactional(readOnly = true)
    public List<BlogCategoryResponse> getBlogCategories() {
        return blogCategoryRepository.findAllByOrderByCreatedAtAsc()
                .stream()
                .map(c -> new BlogCategoryResponse(
                        c.getId(),
                        c.getTitle(),
                        c.getSlug(),
                        c.getDescription()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<BlogAuthorResponse> getBlogAuthors() {
        return blogAuthorRepository.findAllByOrderByCreatedAtAsc()
                .stream()
                .map(a -> new BlogAuthorResponse(
                        a.getId(),
                        a.getName(),
                        a.getSlug(),
                        a.getImageUrl(),
                        a.getBio()))
                .toList();
    }

    @Transactional
    public BlogResponse createBlog(BlogRequest request) {
        String slug = request.slug().trim().toLowerCase();

        if (blogRepository.existsBySlug(slug)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Slug bài viết đã tồn tại: " + slug);
        }

        String blogId = "blog-" + UUID.randomUUID().toString().substring(0, 8);

        Blog blog = new Blog();
        blog.setId(blogId);
        blog.setTitle(request.title().trim());
        blog.setSlug(slug);
        blog.setAuthorId(request.authorId().trim());
        blog.setMainImageUrl(request.mainImageUrl() != null ? request.mainImageUrl().trim() : null);
        blog.setPublishedAt(parsePublishedAt(request.publishedAt()));
        blog.setLatest(Boolean.TRUE.equals(request.isLatest()));
        blog.setBody(request.body().trim());

        if (request.blogCategoryIds() != null && !request.blogCategoryIds().isEmpty()) {
            Set<BlogCategory> categories = new HashSet<>(
                    blogCategoryRepository.findAllById(request.blogCategoryIds()));
            blog.setCategories(categories);
        }

        Blog saved = blogRepository.save(blog);
        return toResponse(saved);
    }

    @Transactional
    public BlogResponse updateBlog(String id, BlogRequest request) {
        Blog blog = blogRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy bài viết với id: " + id));

        String slug = request.slug().trim().toLowerCase();
        if (blogRepository.existsBySlugAndIdNot(slug, id)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Slug bài viết đã tồn tại: " + slug);
        }

        blog.setTitle(request.title().trim());
        blog.setSlug(slug);
        blog.setAuthorId(request.authorId().trim());
        blog.setMainImageUrl(request.mainImageUrl() != null ? request.mainImageUrl().trim() : null);
        blog.setPublishedAt(parsePublishedAt(request.publishedAt()));
        blog.setLatest(Boolean.TRUE.equals(request.isLatest()));
        blog.setBody(request.body().trim());

        if (request.blogCategoryIds() != null) {
            Set<BlogCategory> categories = new HashSet<>(
                    blogCategoryRepository.findAllById(request.blogCategoryIds()));
            blog.setCategories(categories);
        }

        Blog updated = blogRepository.save(blog);
        return toResponse(updated);
    }

    @Transactional
    public void deleteBlog(String id) {
        if (!blogRepository.existsById(id)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Không tìm thấy bài viết với id: " + id);
        }
        blogRepository.deleteById(id);
    }

    private BlogResponse toResponse(Blog blog) {
        List<String> categoryIds = blog.getCategories() != null
                ? blog.getCategories().stream().map(BlogCategory::getId).collect(Collectors.toList())
                : List.of();

        String publishedAtStr = blog.getPublishedAt() != null
                ? blog.getPublishedAt().toString()
                : OffsetDateTime.now().toString();

        return new BlogResponse(
                blog.getId(),
                blog.getTitle(),
                blog.getSlug(),
                blog.getAuthorId(),
                blog.getMainImageUrl(),
                categoryIds,
                publishedAtStr,
                blog.isLatest(),
                blog.getBody());
    }

    private OffsetDateTime parsePublishedAt(String str) {
        if (str == null || str.isBlank()) {
            return OffsetDateTime.now();
        }
        try {
            return OffsetDateTime.parse(str);
        } catch (Exception e) {
            try {
                return LocalDateTime.parse(str).atOffset(ZoneOffset.UTC);
            } catch (Exception ex) {
                return OffsetDateTime.now();
            }
        }
    }
}
