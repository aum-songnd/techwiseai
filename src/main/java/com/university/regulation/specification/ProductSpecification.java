package com.university.regulation.specification;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import org.springframework.data.jpa.domain.Specification;

import com.university.regulation.models.product.Product;

import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;

public final class ProductSpecification {

    private ProductSpecification() {
    }

    public static Specification<Product> searchByKeyword(String keyword) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Chỉ tìm sản phẩm đang hoạt động
            predicates.add(criteriaBuilder.isTrue(root.get("active")));

            if (keyword != null && !keyword.isBlank()) {
                String searchValue = "%"
                        + keyword.trim().toLowerCase(Locale.ROOT)
                        + "%";

                var categoryJoin = root.join("category", JoinType.LEFT);

                Predicate keywordPredicate = criteriaBuilder.or(
                        criteriaBuilder.like(
                                criteriaBuilder.lower(root.get("name")),
                                searchValue),
                        criteriaBuilder.like(
                                criteriaBuilder.lower(root.get("sku")),
                                searchValue),
                        criteriaBuilder.like(
                                criteriaBuilder.lower(root.get("brand")),
                                searchValue),
                        criteriaBuilder.like(
                                criteriaBuilder.lower(root.get("shortDescription")),
                                searchValue),
                        criteriaBuilder.like(
                                criteriaBuilder.lower(root.get("description")),
                                searchValue),
                        criteriaBuilder.like(
                                criteriaBuilder.lower(categoryJoin.get("name")),
                                searchValue));

                predicates.add(keywordPredicate);
            }

            return criteriaBuilder.and(
                    predicates.toArray(new Predicate[0]));
        };
    }
}