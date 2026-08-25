package com.university.regulation.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.university.regulation.dto.categories.CategoryResponse;
import com.university.regulation.repository.CategoryRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;

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
                        category.getDisplayOrder()
                ))
                .toList();
    }
}
