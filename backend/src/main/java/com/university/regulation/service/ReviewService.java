package com.university.regulation.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.university.regulation.common.api.PageResponse;
import com.university.regulation.dto.reviews.AdminReplyReviewRequest;
import com.university.regulation.dto.reviews.CreateReviewRequest;
import com.university.regulation.dto.reviews.ProductReviewsPageResponse;
import com.university.regulation.dto.reviews.ReviewEligibilityResponse;
import com.university.regulation.dto.reviews.ReviewResponse;
import com.university.regulation.dto.reviews.ReviewSummaryResponse;
import com.university.regulation.dto.reviews.UpdateReviewStatusRequest;
import com.university.regulation.models.product.Product;
import com.university.regulation.models.review.Review;
import com.university.regulation.models.user.User;
import com.university.regulation.repository.OrderItemRepository;
import com.university.regulation.repository.ProductRepository;
import com.university.regulation.repository.ReviewRepository;
import com.university.regulation.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final OrderItemRepository orderItemRepository;

    @Transactional(readOnly = true)
    public ProductReviewsPageResponse getProductReviews(
            UUID productId,
            Integer rating,
            Pageable pageable
    ) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy sản phẩm"));

        // Summary
        ReviewSummaryResponse summary = getReviewSummary(product.getId());

        // Paginated reviews
        Page<Review> reviewsPage;
        if (rating != null && rating >= 1 && rating <= 5) {
            reviewsPage = reviewRepository.findByProductIdAndStatusAndRating(
                    product.getId(),
                    "APPROVED",
                    rating,
                    pageable
            );
        } else {
            reviewsPage = reviewRepository.findByProductIdAndStatus(
                    product.getId(),
                    "APPROVED",
                    pageable
            );
        }

        PageResponse<ReviewResponse> pageResponse = PageResponse.from(
                reviewsPage.map(this::toResponse)
        );

        return new ProductReviewsPageResponse(summary, pageResponse);
    }

    @Transactional(readOnly = true)
    public ReviewSummaryResponse getReviewSummary(UUID productId) {
        long totalReviews = reviewRepository.countByProductIdAndStatus(productId, "APPROVED");
        double averageRating = reviewRepository.calculateAverageRating(productId).orElse(0.0);
        double roundedAverage = BigDecimal.valueOf(averageRating)
                .setScale(1, RoundingMode.HALF_UP)
                .doubleValue();

        Map<Integer, Long> distribution = new HashMap<>();
        for (int i = 1; i <= 5; i++) {
            distribution.put(i, 0L);
        }

        List<Object[]> counts = reviewRepository.countRatingsGrouped(productId);
        for (Object[] row : counts) {
            if (row[0] instanceof Number r && row[1] instanceof Number c) {
                distribution.put(r.intValue(), c.longValue());
            }
        }

        return new ReviewSummaryResponse(roundedAverage, totalReviews, distribution);
    }

    @Transactional(readOnly = true)
    public ReviewEligibilityResponse checkEligibility(UUID productId, String username) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy sản phẩm"));

        if (username == null || username.isBlank() || "anonymousUser".equalsIgnoreCase(username.trim())) {
            return new ReviewEligibilityResponse(
                    product.getId(),
                    false,
                    false,
                    false,
                    "Vui lòng đăng nhập để đánh giá sản phẩm"
            );
        }

        User user = userRepository.findByUsername(username)
                .or(() -> userRepository.findByEmailIgnoreCase(username))
                .orElse(null);

        if (user == null) {
            return new ReviewEligibilityResponse(
                    product.getId(),
                    false,
                    false,
                    false,
                    "Không tìm thấy tài khoản người dùng"
            );
        }

        boolean hasPurchased = orderItemRepository.existsPurchasedByUserIdAndProductId(user.getId(), product.getId());
        boolean alreadyReviewed = reviewRepository.existsByProductIdAndUserId(product.getId(), user.getId());

        if (!hasPurchased) {
            return new ReviewEligibilityResponse(
                    product.getId(),
                    false,
                    false,
                    alreadyReviewed,
                    "Chỉ khách hàng đã mua sản phẩm này mới có thể gửi đánh giá & bình luận"
            );
        }

        if (alreadyReviewed) {
            return new ReviewEligibilityResponse(
                    product.getId(),
                    false,
                    true,
                    true,
                    "Bạn đã gửi đánh giá cho sản phẩm này rồi"
            );
        }

        return new ReviewEligibilityResponse(
                product.getId(),
                true,
                true,
                false,
                "Bạn đủ điều kiện để đánh giá sản phẩm này"
        );
    }

    @Transactional
    public ReviewResponse createReview(
            UUID productId,
            String username,
            CreateReviewRequest request
    ) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy sản phẩm"));

        if (username == null || username.isBlank() || "anonymousUser".equalsIgnoreCase(username.trim())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Vui lòng đăng nhập để đánh giá sản phẩm.");
        }

        User user = userRepository.findByUsername(username)
                .or(() -> userRepository.findByEmailIgnoreCase(username))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Không tìm thấy tài khoản người dùng."));

        boolean hasPurchased = orderItemRepository.existsPurchasedByUserIdAndProductId(user.getId(), product.getId());
        if (!hasPurchased) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Chỉ khách hàng đã mua sản phẩm này mới có thể gửi đánh giá & bình luận."
            );
        }

        if (reviewRepository.existsByProductIdAndUserId(product.getId(), user.getId())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Bạn đã gửi đánh giá cho sản phẩm này rồi."
            );
        }

        String displayName = (user.getFullName() != null && !user.getFullName().isBlank())
                ? user.getFullName()
                : ((request.userFullName() != null && !request.userFullName().isBlank()) ? request.userFullName().trim() : user.getUsername());

        Review review = new Review();
        review.setProduct(product);
        review.setUser(user);
        review.setUserFullName(displayName);
        review.setUserAvatarUrl(user.getAvatarUrl());
        review.setRating(request.rating());
        review.setTitle(request.title());
        review.setComment(request.comment());
        review.setVerifiedPurchase(true);
        review.setLikesCount(0);
        review.setStatus("APPROVED");

        Review saved = reviewRepository.save(review);

        // Update product rating and review count
        updateProductRatingStats(product.getId());

        return toResponse(saved);
    }

    @Transactional
    public ReviewResponse likeReview(UUID reviewId) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy đánh giá"));

        review.setLikesCount(review.getLikesCount() + 1);
        return toResponse(reviewRepository.save(review));
    }

    @Transactional
    public void deleteReview(UUID reviewId, String username, boolean isAdmin) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy đánh giá"));

        if (!isAdmin) {
            if (username == null) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Không có quyền xóa đánh giá");
            }
            User user = userRepository.findByUsername(username)
                    .or(() -> userRepository.findByEmailIgnoreCase(username))
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Người dùng không hợp lệ"));

            if (review.getUser() == null || !review.getUser().getId().equals(user.getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không thể xóa đánh giá của người khác");
            }
        }

        UUID productId = review.getProduct().getId();
        reviewRepository.delete(review);

        // Recalculate stats
        updateProductRatingStats(productId);
    }

    @Transactional
    public ReviewResponse adminReply(UUID reviewId, AdminReplyReviewRequest request) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy đánh giá"));

        review.setAdminReply(request.reply());
        review.setAdminReplyAt(OffsetDateTime.now());
        return toResponse(reviewRepository.save(review));
    }

    @Transactional
    public ReviewResponse adminUpdateStatus(UUID reviewId, UpdateReviewStatusRequest request) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy đánh giá"));

        review.setStatus(request.status().toUpperCase());
        Review saved = reviewRepository.save(review);

        updateProductRatingStats(review.getProduct().getId());

        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public PageResponse<ReviewResponse> adminSearchReviews(
            String keyword,
            String status,
            Integer rating,
            UUID productId,
            Pageable pageable
    ) {
        String cleanKeyword = (keyword == null || keyword.isBlank()) ? null : keyword.trim();
        String cleanStatus = (status == null || status.isBlank() || status.equalsIgnoreCase("ALL")) ? null : status.trim();

        Page<Review> page = reviewRepository.searchReviews(
                cleanKeyword,
                cleanStatus,
                rating,
                productId,
                pageable
        );

        return PageResponse.from(page.map(this::toResponse));
    }

    private void updateProductRatingStats(UUID productId) {
        Optional<Product> productOpt = productRepository.findById(productId);
        if (productOpt.isEmpty()) return;

        Product product = productOpt.get();
        long totalApproved = reviewRepository.countByProductIdAndStatus(productId, "APPROVED");
        double avg = reviewRepository.calculateAverageRating(productId).orElse(0.0);

        BigDecimal rounded = BigDecimal.valueOf(avg).setScale(1, RoundingMode.HALF_UP);
        product.setRatingAverage(rounded);
        product.setReviewCount((int) totalApproved);

        productRepository.save(product);
    }

    public ReviewResponse toResponse(Review review) {
        return new ReviewResponse(
                review.getId(),
                review.getProduct().getId(),
                review.getProduct().getName(),
                review.getUser() != null ? review.getUser().getId() : null,
                review.getUserFullName(),
                review.getUserAvatarUrl(),
                review.getRating(),
                review.getTitle(),
                review.getComment(),
                review.isVerifiedPurchase(),
                review.getLikesCount(),
                review.getStatus(),
                review.getAdminReply(),
                review.getAdminReplyAt(),
                review.getCreatedAt(),
                review.getUpdatedAt()
        );
    }
}
