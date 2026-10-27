package com.university.regulation.service;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.university.regulation.dto.favorites.AddFavoriteRequest;
import com.university.regulation.dto.favorites.FavoriteCheckResponse;
import com.university.regulation.dto.favorites.FavoriteResponse;
import com.university.regulation.models.favorite.Favorite;
import com.university.regulation.models.product.Product;
import com.university.regulation.models.user.User;
import com.university.regulation.models.recommendation.InteractionEventType;
import com.university.regulation.models.recommendation.UserInteractionEvent;
import com.university.regulation.repository.FavoriteRepository;
import com.university.regulation.repository.ProductRepository;
import com.university.regulation.repository.UserInteractionRepository;
import com.university.regulation.repository.UserRepository;
import com.university.regulation.service.recommendation.UserProfileService;

import org.springframework.context.ApplicationEventPublisher;
import com.university.regulation.event.recommendation.UserInteractionRecordedEvent;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class FavoriteService {

    private final FavoriteRepository favoriteRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final ProductService productService;
    private final UserInteractionRepository interactionRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional(readOnly = true)
    public List<FavoriteResponse> getFavorites(String username) {
        return favoriteRepository
                .findAllActiveByUsername(username)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public FavoriteResponse addFavorite(
            String username,
            AddFavoriteRequest request
    ) {
        User user = userRepository
                .findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy người dùng"
                ));

        Product product = productRepository
                .findByIdAndActiveTrue(request.productId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy sản phẩm"
                ));

        return favoriteRepository
                .findByUserUsernameAndProductId(
                        username,
                        request.productId()
                )
                .map(this::toResponse)
                .orElseGet(() -> {
                    Favorite favorite = new Favorite();
                    favorite.setUser(user);
                    favorite.setProduct(product);

                    Favorite savedFavorite =
                            favoriteRepository.save(favorite);

                    try {
                        UserInteractionEvent event = UserInteractionEvent.builder()
                                .user(user)
                                .sessionId("u:" + user.getId().toString())
                                .product(product)
                                .eventType(InteractionEventType.FAVORITE)
                                .durationSeconds(15)
                                .metadata("{\"source\":\"WISHLIST\"}")
                                .build();
                        interactionRepository.save(event);
                        eventPublisher.publishEvent(new UserInteractionRecordedEvent(
                                user.getId(), "u:" + user.getId().toString(), product.getId()));
                    } catch (Exception e) {
                        log.warn("Không thể ghi nhận interaction FAVORITE: {}", e.getMessage());
                    }

                    return toResponse(savedFavorite);
                });
    }

    @Transactional
    public void removeFavorite(
            String username,
            UUID productId
    ) {
        favoriteRepository
                .deleteByUserUsernameAndProductId(
                        username,
                        productId
                );
    }

    @Transactional
    public void clearFavorites(String username) {
        favoriteRepository.deleteAllByUserUsername(username);
    }

    @Transactional(readOnly = true)
    public FavoriteCheckResponse checkFavorite(
            String username,
            UUID productId
    ) {
        boolean favorite = favoriteRepository
                .existsByUserUsernameAndProductId(
                        username,
                        productId
                );

        return new FavoriteCheckResponse(
                productId,
                favorite
        );
    }

    private FavoriteResponse toResponse(Favorite favorite) {
        return new FavoriteResponse(
                favorite.getId(),
                favorite.getCreatedAt(),
                productService.toResponse(favorite.getProduct())
        );
    }
}
