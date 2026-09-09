package com.university.regulation.service;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.university.regulation.dto.payment.PaymentRequest;
import com.university.regulation.dto.payment.PaymentResponse;
import com.university.regulation.models.enums.OrderStatus;
import com.university.regulation.models.enums.PaymentMethod;
import com.university.regulation.models.enums.PaymentStatus;
import com.university.regulation.models.order.Order;
import com.university.regulation.models.payment.Payment;
import com.university.regulation.repository.OrderRepository;
import com.university.regulation.repository.PaymentRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final OrderRepository orderRepository;

    /**
     * Tạo thanh toán cho đơn hàng của khách hàng.
     */
    @Transactional
    public PaymentResponse createPayment(
            PaymentRequest request,
            String username) {
        Order order = getOwnedOrder(request.orderId(), username);

        if (order.getStatus() == OrderStatus.CANCELLED) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Không thể thanh toán đơn hàng đã hủy");
        }

        if (paymentRepository.existsByOrderId(order.getId())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Đơn hàng đã có thông tin thanh toán");
        }

        Payment payment = new Payment();

        payment.setOrder(order);
        payment.setPaymentMethod(request.paymentMethod());
        payment.setStatus(PaymentStatus.PENDING);
        payment.setAmount(order.getTotalAmount());
        payment.setCurrency("VND");
        payment.setTransactionCode(generateTransactionCode());

        /*
         * COD không có đường dẫn thanh toán.
         * VNPAY sẽ được bổ sung paymentUrl ở bước tích hợp VNPAY.
         */
        payment.setPaymentUrl(null);

        Payment savedPayment = paymentRepository.save(payment);

        return toResponse(savedPayment);
    }

    /**
     * Khách hàng xem thanh toán của đơn hàng thuộc tài khoản mình.
     */
    @Transactional(readOnly = true)
    public PaymentResponse getMyPaymentByOrderId(
            UUID orderId,
            String username) {
        Order order = getOwnedOrder(orderId, username);

        Payment payment = paymentRepository
                .findByOrderId(order.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Đơn hàng chưa có thông tin thanh toán"));

        return toResponse(payment);
    }

    /**
     * Admin xem thanh toán theo đơn hàng.
     */
    @Transactional(readOnly = true)
    public PaymentResponse getPaymentByOrderId(UUID orderId) {
        Payment payment = paymentRepository
                .findByOrderId(orderId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy thông tin thanh toán"));

        return toResponse(payment);
    }

    /**
     * Đánh dấu COD đã thanh toán khi giao hàng thành công.
     */
    @Transactional
    public void markCodAsPaid(UUID orderId) {
        Payment payment = paymentRepository
                .findByOrderId(orderId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy thông tin thanh toán"));

        if (payment.getPaymentMethod() != PaymentMethod.COD) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Thanh toán của đơn hàng không phải COD");
        }

        if (payment.getStatus() == PaymentStatus.PAID) {
            return;
        }

        if (payment.getStatus() == PaymentStatus.CANCELLED) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Thanh toán đã bị hủy");
        }

        payment.setStatus(PaymentStatus.PAID);
        payment.setPaidAt(OffsetDateTime.now());
        payment.setFailureReason(null);
    }

    /**
     * Hủy thanh toán khi đơn hàng bị hủy.
     */
    @Transactional
    public void cancelPayment(UUID orderId) {
        paymentRepository.findByOrderId(orderId)
                .ifPresent(payment -> {
                    if (payment.getStatus() == PaymentStatus.PENDING
                            || payment.getStatus() == PaymentStatus.FAILED) {

                        payment.setStatus(PaymentStatus.CANCELLED);
                        payment.setPaymentUrl(null);
                    }
                });
    }

    private String generateTransactionCode() {
        return "PAY-"
                + UUID.randomUUID()
                        .toString()
                        .replace("-", "")
                        .toUpperCase();
    }

    private PaymentResponse toResponse(Payment payment) {
        return new PaymentResponse(
                payment.getId(),
                payment.getOrder().getId(),
                payment.getPaymentMethod(),
                payment.getStatus(),
                payment.getAmount(),
                payment.getCurrency(),
                payment.getTransactionCode(),
                payment.getProviderTransactionId(),
                payment.getPaymentUrl(),
                payment.getFailureReason(),
                payment.getPaidAt(),
                payment.getCreatedAt(),
                payment.getUpdatedAt());
    }

    private Order getOwnedOrder(
            UUID orderId,
            String username) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy đơn hàng"));

        if (!order.getUser()
                .getUsername()
                .equalsIgnoreCase(username)) {

            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Không tìm thấy đơn hàng");
        }

        return order;
    }
}
