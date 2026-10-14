package com.university.regulation.service;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.university.regulation.dto.categories.CategoryRequest;
import com.university.regulation.dto.categories.CategoryResponse;
import com.university.regulation.models.category.Category;
import com.university.regulation.repository.CategoryRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;

    public CategoryResponse getCategoryById(UUID id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Danh mục không tồn tại"));

        return toResponse(category);
    }

    public List<CategoryResponse> getCategories() {
        return categoryRepository
                .findAllByActiveTrueOrderByDisplayOrderAsc()
                .stream()
                .map(category -> new CategoryResponse(
                        category.getId(),
                        category.getName(),
                        category.getSlug(),
                        category.getDescription(),
                        category.getImageUrl(),
                        category.getDisplayOrder()))
                .toList();
    }

    @Transactional
    public CategoryResponse createCategory(CategoryRequest request) {

        String normalizedName = request.name().trim();

        String normalizedSlug = request.slug()
                .trim()
                .toLowerCase();

        if (categoryRepository.existsByNameIgnoreCase(normalizedName)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Tên danh mục đã tồn tại");
        }

        if (categoryRepository.existsBySlugIgnoreCase(normalizedSlug)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Slug danh mục đã tồn tại");
        }

        Category category = new Category();

        category.setName(normalizedName);
        category.setSlug(normalizedSlug);
        category.setDescription(
                trimToNull(request.description()));
        category.setImageUrl(
                trimToNull(request.imageUrl()));
        category.setDisplayOrder(
                request.displayOrder() == null
                        ? 0
                        : request.displayOrder());
        category.setActive(true);

        Category savedCategory = categoryRepository.save(category);

        return toResponse(savedCategory);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }

        String trimmedValue = value.trim();

        return trimmedValue.isEmpty()
                ? null
                : trimmedValue;
    }

    private CategoryResponse toResponse(Category category) {
        return new CategoryResponse(
                category.getId(),
                category.getName(),
                category.getSlug(),
                category.getDescription(),
                category.getImageUrl(),
                category.getDisplayOrder());
    }

    @Transactional
    public CategoryResponse updateCategory(
            UUID id,
            CategoryRequest request) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Danh mục không tồn tại"));

        String normalizedName = request.name().trim();
        String normalizedSlug = request.slug().trim().toLowerCase();

        if (categoryRepository.existsByNameIgnoreCaseAndIdNot(normalizedName, id)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Tên danh mục đã tồn tại");
        }

        if (categoryRepository.existsBySlugIgnoreCaseAndIdNot(normalizedSlug, id)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Slug danh mục đã tồn tại");
        }

        category.setName(normalizedName);
        category.setSlug(normalizedSlug);
        category.setDescription(
                trimToNull(request.description()));
        category.setImageUrl(
                trimToNull(request.imageUrl()));
        category.setDisplayOrder(
                request.displayOrder() == null
                        ? 0
                        : request.displayOrder());

        Category savedCategory = categoryRepository.save(category);

        return toResponse(savedCategory);
    }
}