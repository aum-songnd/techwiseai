package com.university.regulation.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.university.regulation.common.response.ApiResponse;
import com.university.regulation.dto.blog.BlogAuthorResponse;
import com.university.regulation.dto.blog.BlogCategoryResponse;
import com.university.regulation.dto.blog.BlogResponse;
import com.university.regulation.service.BlogService;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class BlogController {

    private final BlogService blogService;

    @GetMapping("/blogs")
    public ApiResponse<List<BlogResponse>> getBlogs(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String search,
            HttpServletRequest request) {
        return ApiResponse.success(
                "Lấy danh sách bài viết thành công",
                blogService.getBlogs(category, search),
                request.getRequestURI());
    }

    @GetMapping("/blogs/{idOrSlug}")
    public ApiResponse<BlogResponse> getBlog(
            @PathVariable String idOrSlug,
            HttpServletRequest request) {
        return ApiResponse.success(
                "Lấy chi tiết bài viết thành công",
                blogService.getBlogByIdOrSlug(idOrSlug),
                request.getRequestURI());
    }

    @GetMapping("/blog-categories")
    public ApiResponse<List<BlogCategoryResponse>> getBlogCategories(
            HttpServletRequest request) {
        return ApiResponse.success(
                "Lấy danh mục bài viết thành công",
                blogService.getBlogCategories(),
                request.getRequestURI());
    }

    @GetMapping("/blog-authors")
    public ApiResponse<List<BlogAuthorResponse>> getBlogAuthors(
            HttpServletRequest request) {
        return ApiResponse.success(
                "Lấy danh sách tác giả thành công",
                blogService.getBlogAuthors(),
                request.getRequestURI());
    }
}
