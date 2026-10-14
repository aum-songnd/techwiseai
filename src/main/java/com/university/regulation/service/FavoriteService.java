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
import com.university.regulation.repository.FavoriteRepository;
import com.university.regulation.repository.ProductRepository;
import com.university.regulation.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class FavoriteService {

    private final FavoriteRepository favoriteRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final ProductService productService;

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
