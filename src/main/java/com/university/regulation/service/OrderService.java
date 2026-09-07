package com.university.regulation.service;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.university.regulation.dto.order.CancelOrderRequest;
import com.university.regulation.dto.order.CreateOrderRequest;
import com.university.regulation.dto.order.OrderDetailResponse;
import com.university.regulation.dto.order.OrderItemResponse;
import com.university.regulation.dto.order.OrderStatusHistoryResponse;
import com.university.regulation.dto.order.OrderSummaryResponse;
import com.university.regulation.dto.order.UpdateOrderStatusRequest;
import com.university.regulation.models.cart.Cart;
import com.university.regulation.models.cart.CartItem;
import com.university.regulation.models.enums.OrderStatus;
import com.university.regulation.models.order.Order;
import com.university.regulation.models.order.OrderItem;
import com.university.regulation.models.order.OrderStatusHistory;
import com.university.regulation.models.product.Product;
import com.university.regulation.models.user.User;
import com.university.regulation.repository.CartItemRepository;
import com.university.regulation.repository.CartRepository;
import com.university.regulation.repository.OrderItemRepository;
import com.university.regulation.repository.OrderRepository;
import com.university.regulation.repository.OrderStatusHistoryRepository;
import com.university.regulation.repository.ProductRepository;
import com.university.regulation.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class OrderService {

    private static final BigDecimal DEFAULT_SHIPPING_FEE =
            BigDecimal.ZERO;

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final OrderStatusHistoryRepository historyRepository;

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;

    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    /**
     * Tạo đơn hàng từ toàn bộ sản phẩm trong giỏ.
     */
    @Transactional
    public OrderDetailResponse createOrder(
            String username,
            CreateOrderRequest request
    ) {

        User user = getUser(username);

        Cart cart = cartRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Giỏ hàng đang trống"
                ));

        List<CartItem> cartItems =
                cartItemRepository
                        .findAllByCartIdOrderByCreatedAtAsc(
                                cart.getId()
                        );

        if (cartItems.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Giỏ hàng đang trống"
            );
        }

        /*
         * Sắp xếp theo Product ID trước khi khóa để giảm nguy cơ deadlock
         * khi nhiều người đặt hàng cùng lúc.
         */
        List<CartItem> sortedCartItems = cartItems.stream()
                .sorted(Comparator.comparing(
                        item -> item.getProduct()
                                .getId()
                                .toString()
                ))
                .toList();

        Map<UUID, Product> lockedProducts = new HashMap<>();

        BigDecimal subtotal = BigDecimal.ZERO;

        /*
         * Khóa và kiểm tra lại toàn bộ sản phẩm.
         */
        for (CartItem cartItem : sortedCartItems) {

            UUID productId = cartItem.getProduct().getId();

            Product product = productRepository
                    .findByIdForUpdate(productId)
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND,
                            "Không tìm thấy sản phẩm trong giỏ hàng"
                    ));

            validateProductForOrder(
                    product,
                    cartItem.getQuantity()
            );

            lockedProducts.put(productId, product);

            BigDecimal itemSubtotal = product.getPrice()
                    .multiply(
                            BigDecimal.valueOf(
                                    cartItem.getQuantity()
                            )
                    );

            subtotal = subtotal.add(itemSubtotal);
        }

        BigDecimal discountAmount = BigDecimal.ZERO;
        BigDecimal shippingFee = DEFAULT_SHIPPING_FEE;

        BigDecimal totalAmount = subtotal
                .subtract(discountAmount)
                .add(shippingFee);

        Order order = new Order();

        order.setUser(user);
        order.setOrderCode(generateOrderCode());
        order.setStatus(OrderStatus.PENDING);

        order.setRecipientName(
                request.recipientName().trim()
        );

        order.setRecipientPhone(
                request.recipientPhone().trim()
        );

        order.setShippingAddress(
                request.shippingAddress().trim()
        );

        order.setSubtotal(subtotal);
        order.setDiscountAmount(discountAmount);
        order.setShippingFee(shippingFee);
        order.setTotalAmount(totalAmount);
        order.setNote(normalizeNullable(request.note()));

        Order savedOrder = orderRepository.save(order);

        List<OrderItem> orderItems = new ArrayList<>();

        /*
         * Sao chép thông tin sản phẩm vào order_items
         * và trừ tồn kho.
         */
        for (CartItem cartItem : sortedCartItems) {

            Product product = lockedProducts.get(
                    cartItem.getProduct().getId()
            );

            int quantity = cartItem.getQuantity();

            BigDecimal itemSubtotal = product.getPrice()
                    .multiply(BigDecimal.valueOf(quantity));

            OrderItem orderItem = new OrderItem();

            orderItem.setOrder(savedOrder);
            orderItem.setProduct(product);
            orderItem.setProductName(product.getName());
            orderItem.setProductSku(product.getSku());
            orderItem.setProductThumbnailUrl(
                    product.getThumbnailUrl()
            );
            orderItem.setUnitPrice(product.getPrice());
            orderItem.setQuantity(quantity);
            orderItem.setSubtotal(itemSubtotal);

            orderItems.add(orderItem);

            product.setStockQuantity(
                    product.getStockQuantity() - quantity
            );
        }

        orderItemRepository.saveAll(orderItems);

        productRepository.saveAll(
                new ArrayList<>(lockedProducts.values())
        );

        saveStatusHistory(
                savedOrder,
                user,
                null,
                OrderStatus.PENDING,
                "Khách hàng tạo đơn hàng"
        );

        /*
         * Tạo đơn thành công thì xóa sản phẩm trong giỏ.
         * Không xóa bản ghi carts.
         */
        cartItemRepository.deleteAllByCartId(cart.getId());

        return toOrderDetailResponse(savedOrder);
    }

    /**
     * Lấy danh sách đơn của khách hàng hiện tại.
     */
    @Transactional(readOnly = true)
    public Page<OrderSummaryResponse> getMyOrders(
            String username,
            Pageable pageable
    ) {

        User user = getUser(username);

        return orderRepository
                .findAllByUserIdOrderByCreatedAtDesc(
                        user.getId(),
                        pageable
                )
                .map(this::toOrderSummaryResponse);
    }

    /**
     * Khách hàng xem chi tiết đơn của chính mình.
     */
    @Transactional(readOnly = true)
    public OrderDetailResponse getMyOrderDetail(
            String username,
            UUID orderId
    ) {

        User user = getUser(username);

        Order order = orderRepository
                .findByIdAndUserId(orderId, user.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy đơn hàng"
                ));

        return toOrderDetailResponse(order);
    }

    /**
     * Khách hàng hủy đơn.
     */
    @Transactional
    public OrderDetailResponse cancelOrder(
            String username,
            UUID orderId,
            CancelOrderRequest request
    ) {

        User user = getUser(username);

        Order order = orderRepository
                .findByIdAndUserId(orderId, user.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy đơn hàng"
                ));

        if (order.getStatus() != OrderStatus.PENDING
                && order.getStatus() != OrderStatus.CONFIRMED) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Chỉ có thể hủy đơn đang chờ hoặc đã xác nhận"
            );
        }

        OrderStatus oldStatus = order.getStatus();

        restoreStock(order);

        order.setStatus(OrderStatus.CANCELLED);
        orderRepository.save(order);

        saveStatusHistory(
                order,
                user,
                oldStatus,
                OrderStatus.CANCELLED,
                request.reason().trim()
        );

        return toOrderDetailResponse(order);
    }

    /**
     * Admin lấy danh sách đơn hàng.
     * status có thể null.
     */
    @Transactional(readOnly = true)
    public Page<OrderSummaryResponse> getAdminOrders(
            OrderStatus status,
            Pageable pageable
    ) {

        Page<Order> orders;

        if (status == null) {
            orders = orderRepository
                    .findAllByOrderByCreatedAtDesc(pageable);
        } else {
            orders = orderRepository
                    .findAllByStatusOrderByCreatedAtDesc(
                            status,
                            pageable
                    );
        }

        return orders.map(this::toOrderSummaryResponse);
    }

    /**
     * Admin xem chi tiết bất kỳ đơn hàng nào.
     */
    @Transactional(readOnly = true)
    public OrderDetailResponse getAdminOrderDetail(
            UUID orderId
    ) {

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy đơn hàng"
                ));

        return toOrderDetailResponse(order);
    }

    /**
     * Admin cập nhật trạng thái đơn hàng.
     */
    @Transactional
    public OrderDetailResponse updateOrderStatus(
            String adminUsername,
            UUID orderId,
            UpdateOrderStatusRequest request
    ) {

        User admin = getUser(adminUsername);

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy đơn hàng"
                ));

        OrderStatus oldStatus = order.getStatus();
        OrderStatus newStatus = request.status();

        if (oldStatus == newStatus) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Đơn hàng đã ở trạng thái này"
            );
        }

        validateStatusTransition(oldStatus, newStatus);

        /*
         * Hủy đơn hoặc trả hàng thì hoàn lại tồn kho.
         */
        if (newStatus == OrderStatus.CANCELLED
                || newStatus == OrderStatus.RETURNED) {

            restoreStock(order);
        }

        order.setStatus(newStatus);
        orderRepository.save(order);

        saveStatusHistory(
                order,
                admin,
                oldStatus,
                newStatus,
                normalizeNullable(request.note())
        );

        return toOrderDetailResponse(order);
    }

    /**
     * Kiểm tra sản phẩm trước khi đặt hàng.
     */
    private void validateProductForOrder(
            Product product,
            int quantity
    ) {

        if (!product.isActive()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Sản phẩm "
                            + product.getName()
                            + " hiện không còn được bán"
            );
        }

        if (product.getCategory() == null
                || !product.getCategory().isActive()) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Danh mục của sản phẩm "
                            + product.getName()
                            + " hiện không hoạt động"
            );
        }

        if (quantity <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Số lượng sản phẩm không hợp lệ"
            );
        }

        if (quantity > product.getStockQuantity()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Sản phẩm "
                            + product.getName()
                            + " chỉ còn "
                            + product.getStockQuantity()
                            + " sản phẩm"
            );
        }
    }

    /**
     * Hoàn lại tồn kho khi hủy hoặc trả hàng.
     */
    private void restoreStock(Order order) {

        List<OrderItem> orderItems =
                orderItemRepository
                        .findAllByOrderIdOrderByCreatedAtAsc(
                                order.getId()
                        );

        List<OrderItem> sortedItems = orderItems.stream()
                .sorted(Comparator.comparing(
                        item -> item.getProduct()
                                .getId()
                                .toString()
                ))
                .toList();

        List<Product> products = new ArrayList<>();

        for (OrderItem orderItem : sortedItems) {

            UUID productId =
                    orderItem.getProduct().getId();

            Product product = productRepository
                    .findByIdForUpdate(productId)
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND,
                            "Không tìm thấy sản phẩm của đơn hàng"
                    ));

            product.setStockQuantity(
                    product.getStockQuantity()
                            + orderItem.getQuantity()
            );

            products.add(product);
        }

        productRepository.saveAll(products);
    }

    /**
     * Kiểm tra luồng chuyển trạng thái hợp lệ.
     */
    private void validateStatusTransition(
            OrderStatus currentStatus,
            OrderStatus newStatus
    ) {

        boolean valid = switch (currentStatus) {

            case PENDING ->
                    newStatus == OrderStatus.CONFIRMED
                    || newStatus == OrderStatus.CANCELLED;

            case CONFIRMED ->
                    newStatus == OrderStatus.PROCESSING
                    || newStatus == OrderStatus.CANCELLED;

            case PROCESSING ->
                    newStatus == OrderStatus.SHIPPING
                    || newStatus == OrderStatus.CANCELLED;

            case SHIPPING ->
                    newStatus == OrderStatus.DELIVERED;

            case DELIVERED ->
                    newStatus == OrderStatus.RETURNED;

            case CANCELLED, RETURNED -> false;
        };

        if (!valid) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Không thể chuyển trạng thái từ "
                            + currentStatus
                            + " sang "
                            + newStatus
            );
        }
    }

    private void saveStatusHistory(
            Order order,
            User changedBy,
            OrderStatus oldStatus,
            OrderStatus newStatus,
            String note
    ) {

        OrderStatusHistory history =
                new OrderStatusHistory();

        history.setOrder(order);
        history.setChangedBy(changedBy);
        history.setOldStatus(oldStatus);
        history.setNewStatus(newStatus);
        history.setNote(note);

        historyRepository.save(history);
    }

    private User getUser(String username) {

        return userRepository
                .findByUsernameIgnoreCase(username)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy người dùng"
                ));
    }

    private String generateOrderCode() {

        String time = OffsetDateTime.now().format(
                DateTimeFormatter.ofPattern("yyyyMMddHHmmss")
        );

        String random = UUID.randomUUID()
                .toString()
                .substring(0, 8)
                .toUpperCase();

        return "ORD-" + time + "-" + random;
    }

    private String normalizeNullable(String value) {

        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }

    private OrderSummaryResponse toOrderSummaryResponse(
            Order order
    ) {

        List<OrderItem> items =
                orderItemRepository
                        .findAllByOrderIdOrderByCreatedAtAsc(
                                order.getId()
                        );

        int totalQuantity = items.stream()
                .mapToInt(OrderItem::getQuantity)
                .sum();

        return new OrderSummaryResponse(
                order.getId(),
                order.getOrderCode(),
                order.getStatus(),
                order.getRecipientName(),
                order.getTotalAmount(),
                totalQuantity,
                order.getCreatedAt()
        );
    }

    private OrderDetailResponse toOrderDetailResponse(
            Order order
    ) {

        List<OrderItemResponse> items =
                orderItemRepository
                        .findAllByOrderIdOrderByCreatedAtAsc(
                                order.getId()
                        )
                        .stream()
                        .map(this::toOrderItemResponse)
                        .toList();

        List<OrderStatusHistoryResponse> history =
                historyRepository
                        .findAllByOrderIdOrderByCreatedAtAsc(
                                order.getId()
                        )
                        .stream()
                        .map(this::toHistoryResponse)
                        .toList();

        int totalQuantity = items.stream()
                .mapToInt(OrderItemResponse::quantity)
                .sum();

        return new OrderDetailResponse(
                order.getId(),
                order.getOrderCode(),
                order.getUser().getId(),
                order.getUser().getUsername(),
                order.getStatus(),
                order.getRecipientName(),
                order.getRecipientPhone(),
                order.getShippingAddress(),
                order.getSubtotal(),
                order.getDiscountAmount(),
                order.getShippingFee(),
                order.getTotalAmount(),
                order.getNote(),
                totalQuantity,
                items,
                history,
                order.getCreatedAt(),
                order.getUpdatedAt()
        );
    }

    private OrderItemResponse toOrderItemResponse(
            OrderItem item
    ) {

        return new OrderItemResponse(
                item.getId(),
                item.getProduct().getId(),
                item.getProductName(),
                item.getProductSku(),
                item.getProductThumbnailUrl(),
                item.getUnitPrice(),
                item.getQuantity(),
                item.getSubtotal()
        );
    }

    private OrderStatusHistoryResponse toHistoryResponse(
            OrderStatusHistory history
    ) {

        User changedBy = history.getChangedBy();

        return new OrderStatusHistoryResponse(
                history.getId(),
                history.getOldStatus(),
                history.getNewStatus(),
                changedBy == null ? null : changedBy.getId(),
                changedBy == null
                        ? null
                        : changedBy.getUsername(),
                history.getNote(),
                history.getCreatedAt()
        );
    }
}
