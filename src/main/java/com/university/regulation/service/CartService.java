package com.university.regulation.service;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.university.regulation.dto.cart.AddCartItemRequest;
import com.university.regulation.dto.cart.CartItemResponse;
import com.university.regulation.dto.cart.CartResponse;
import com.university.regulation.dto.cart.UpdateCartItemRequest;
import com.university.regulation.models.cart.Cart;
import com.university.regulation.models.cart.CartItem;
import com.university.regulation.models.product.Product;
import com.university.regulation.models.user.User;
import com.university.regulation.repository.CartItemRepository;
import com.university.regulation.repository.CartRepository;
import com.university.regulation.repository.ProductRepository;
import com.university.regulation.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CartService {

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    @Transactional
    public CartResponse getCart(String username) {

        Cart cart = getOrCreateCart(username);

        return toCartResponse(cart);
    }


    @Transactional
    public CartResponse addItem(
            String username,
            AddCartItemRequest request
    ) {

        Cart cart = getOrCreateCart(username);

        Product product = productRepository
                .findById(request.productId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy sản phẩm"
                ));

        validateProductAvailable(product);

        CartItem cartItem = cartItemRepository
                .findByCartIdAndProductId(
                        cart.getId(),
                        product.getId()
                )
                .orElse(null);

        int newQuantity;

        if (cartItem == null) {
            newQuantity = request.quantity();

            cartItem = new CartItem();
            cartItem.setCart(cart);
            cartItem.setProduct(product);
        } else {
            newQuantity =
                    cartItem.getQuantity() + request.quantity();
        }

        validateStock(product, newQuantity);

        cartItem.setQuantity(newQuantity);

        cartItemRepository.save(cartItem);

        touchCart(cart);

        return toCartResponse(cart);
    }

    @Transactional
    public CartResponse updateItem(
            String username,
            UUID itemId,
            UpdateCartItemRequest request
    ) {

        Cart cart = getOrCreateCart(username);

        CartItem cartItem = cartItemRepository
                .findByIdAndCartId(itemId, cart.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy sản phẩm trong giỏ hàng"
                ));

        Product product = cartItem.getProduct();

        validateProductAvailable(product);
        validateStock(product, request.quantity());

        cartItem.setQuantity(request.quantity());

        cartItemRepository.save(cartItem);

        touchCart(cart);

        return toCartResponse(cart);
    }

    @Transactional
    public CartResponse removeItem(
            String username,
            UUID itemId
    ) {

        Cart cart = getOrCreateCart(username);

        CartItem cartItem = cartItemRepository
                .findByIdAndCartId(itemId, cart.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy sản phẩm trong giỏ hàng"
                ));

        cartItemRepository.delete(cartItem);

        touchCart(cart);

        return toCartResponse(cart);
    }

    @Transactional
    public CartResponse clearCart(String username) {

        Cart cart = getOrCreateCart(username);

        cartItemRepository.deleteAllByCartId(cart.getId());

        touchCart(cart);

        return toCartResponse(cart);
    }

    private Cart getOrCreateCart(String username) {

        User user = userRepository
                .findByUsernameIgnoreCase(username)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy người dùng"
                ));

        return cartRepository.findByUserId(user.getId())
                .orElseGet(() -> {
                    Cart cart = new Cart();
                    cart.setUser(user);

                    return cartRepository.save(cart);
                });
    }

    private void validateProductAvailable(Product product) {

        if (!product.isActive()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Sản phẩm hiện không còn được bán"
            );
        }

        if (product.getCategory() == null
                || !product.getCategory().isActive()) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Danh mục của sản phẩm hiện không hoạt động"
            );
        }

        if (product.getStockQuantity() <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Sản phẩm đã hết hàng"
            );
        }
    }

    private void validateStock(
            Product product,
            int requestedQuantity
    ) {

        if (requestedQuantity <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Số lượng sản phẩm phải lớn hơn 0"
            );
        }

        if (requestedQuantity > product.getStockQuantity()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Số lượng yêu cầu vượt quá số lượng tồn kho. "
                            + "Hiện còn "
                            + product.getStockQuantity()
                            + " sản phẩm"
            );
        }
    }

    private void touchCart(Cart cart) {

        cart.setUpdatedAt(OffsetDateTime.now());

        cartRepository.save(cart);
    }

    private CartResponse toCartResponse(Cart cart) {

        List<CartItem> cartItems =
                cartItemRepository
                        .findAllByCartIdOrderByCreatedAtAsc(
                                cart.getId()
                        );

        List<CartItemResponse> itemResponses = cartItems
                .stream()
                .map(this::toCartItemResponse)
                .toList();

        int totalItems = itemResponses.size();

        int totalQuantity = itemResponses.stream()
                .mapToInt(CartItemResponse::quantity)
                .sum();

        /*
         * Chỉ tính tiền những sản phẩm vẫn còn khả dụng.
         */
        BigDecimal totalAmount = itemResponses.stream()
                .filter(CartItemResponse::available)
                .map(CartItemResponse::subtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new CartResponse(
                cart.getId(),
                itemResponses,
                totalItems,
                totalQuantity,
                totalAmount,
                cart.getUpdatedAt()
        );
    }

    private CartItemResponse toCartItemResponse(
            CartItem cartItem
    ) {

        Product product = cartItem.getProduct();

        BigDecimal unitPrice = product.getPrice();

        BigDecimal subtotal = unitPrice.multiply(
                BigDecimal.valueOf(cartItem.getQuantity())
        );

        boolean available =
                product.isActive()
                && product.getCategory() != null
                && product.getCategory().isActive()
                && product.getStockQuantity() > 0
                && cartItem.getQuantity()
                    <= product.getStockQuantity();

        return new CartItemResponse(
                cartItem.getId(),
                product.getId(),
                product.getSku(),
                product.getName(),
                product.getSlug(),
                product.getThumbnailUrl(),
                unitPrice,
                product.getOriginalPrice(),
                cartItem.getQuantity(),
                subtotal,
                product.getStockQuantity(),
                available
        );
    }
}
