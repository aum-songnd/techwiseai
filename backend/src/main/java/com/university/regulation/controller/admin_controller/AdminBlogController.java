package com.university.regulation.controller.admin_controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.university.regulation.common.response.ApiResponse;
import com.university.regulation.dto.blog.BlogRequest;
import com.university.regulation.dto.blog.BlogResponse;
import com.university.regulation.service.BlogService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/admin/blogs")
@RequiredArgsConstructor
public class AdminBlogController {

    private final BlogService blogService;

    @PostMapping
    public ResponseEntity<ApiResponse<BlogResponse>> createBlog(
            @Valid @RequestBody BlogRequest request,
            HttpServletRequest httpRequest) {
        BlogResponse blog = blogService.createBlog(request);
        ApiResponse<BlogResponse> response = ApiResponse.success(
                HttpStatus.CREATED,
                "Tạo bài viết thành công",
                blog,
                httpRequest.getRequestURI());

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    @PutMapping("/{id}")
    public ApiResponse<BlogResponse> updateBlog(
            @PathVariable String id,
            @Valid @RequestBody BlogRequest request,
            HttpServletRequest httpRequest) {
        BlogResponse blog = blogService.updateBlog(id, request);
        return ApiResponse.success(
                "Cập nhật bài viết thành công",
                blog,
                httpRequest.getRequestURI());
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteBlog(
            @PathVariable String id,
            HttpServletRequest httpRequest) {
        blogService.deleteBlog(id);
        return ApiResponse.success(
                "Xóa bài viết thành công",
                null,
                httpRequest.getRequestURI());
    }
}
