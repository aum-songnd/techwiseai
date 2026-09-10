package com.university.regulation.service;

import java.math.BigInteger;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.university.regulation.dto.payment.PaymentRequest;
import com.university.regulation.dto.payment.PaymentResponse;
import com.university.regulation.dto.payment.VnpayIpnResponse;
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
    private final VnpayService vnpayService;

    /**
     * Tạo thanh toán cho đơn hàng của khách hàng.
     */
    @Transactional
    public PaymentResponse createPayment(
            PaymentRequest request,
            String username,
            String clientIp) {
        Order order = getOwnedOrder(request.orderId(), username);

        if (paymentRepository.existsByOrderId(order.getId())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Đơn hàng đã có thông tin thanh toán");
        }

        if (order.getStatus() == OrderStatus.CANCELLED) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Không thể thanh toán đơn hàng đã hủy");
        }

        Payment payment = new Payment();

        payment.setOrder(order);
        payment.setPaymentMethod(request.paymentMethod());
        payment.setStatus(PaymentStatus.PENDING);
        payment.setAmount(order.getTotalAmount());
        payment.setCurrency("VND");
        payment.setTransactionCode(generateTransactionCode());

        Payment savedPayment = paymentRepository.save(payment);

        if (request.paymentMethod() == PaymentMethod.VNPAY) {
            String paymentUrl = vnpayService.createPaymentUrl(
                    savedPayment,
                    clientIp);

            savedPayment.setPaymentUrl(paymentUrl);
            savedPayment = paymentRepository.save(savedPayment);
        }

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

    @Transactional(readOnly = true)
    public PaymentResponse processVnpayReturn(
            Map<String, String> params) {
        if (!vnpayService.verifySignature(params)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Chữ ký VNPAY không hợp lệ");
        }

        String transactionCode = params.get("vnp_TxnRef");

        if (transactionCode == null || transactionCode.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Thiếu mã giao dịch VNPAY");
        }

        Payment payment = paymentRepository
                .findByTransactionCode(transactionCode)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy giao dịch thanh toán"));

        if (payment.getPaymentMethod() != PaymentMethod.VNPAY) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Giao dịch không sử dụng VNPAY");
        }

        if (!isValidVnpayAmount(
                payment,
                params.get("vnp_Amount"))) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Số tiền thanh toán không hợp lệ");
        }

        // Không cập nhật database tại Return URL.
        return toResponse(payment);
    }

    @Transactional
    public VnpayIpnResponse processVnpayIpn(
            Map<String, String> params) {
        // 1. Kiểm tra request
        if (params == null || params.isEmpty()) {
            return new VnpayIpnResponse(
                    "99",
                    "Invalid request");
        }

        // 2. Kiểm tra chữ ký
        if (!vnpayService.verifySignature(params)) {
            return new VnpayIpnResponse(
                    "97",
                    "Invalid signature");
        }

        String transactionCode = params.get("vnp_TxnRef");

        if (transactionCode == null
                || transactionCode.isBlank()) {
            return new VnpayIpnResponse(
                    "01",
                    "Order not found");
        }

        // 3. Tìm giao dịch
        Optional<Payment> paymentOptional = paymentRepository.findByTransactionCode(
                transactionCode);

        if (paymentOptional.isEmpty()) {
            return new VnpayIpnResponse(
                    "01",
                    "Order not found");
        }

        Payment payment = paymentOptional.get();

        if (payment.getPaymentMethod() != PaymentMethod.VNPAY) {
            return new VnpayIpnResponse(
                    "01",
                    "Order not found");
        }

        // 4. Kiểm tra số tiền
        if (!isValidVnpayAmount(
                payment,
                params.get("vnp_Amount"))) {
            return new VnpayIpnResponse(
                    "04",
                    "Invalid amount");
        }

        // 5. Chống xử lý callback nhiều lần
        if (payment.getStatus() != PaymentStatus.PENDING) {
            return new VnpayIpnResponse(
                    "02",
                    "Order already confirmed");
        }

        String responseCode = params.get("vnp_ResponseCode");

        String transactionStatus = params.get("vnp_TransactionStatus");

        String providerTransactionId = params.get("vnp_TransactionNo");

        payment.setProviderTransactionId(
                emptyToNull(providerTransactionId));

        // URL cũ không cần sử dụng sau khi giao dịch hoàn tất.
        payment.setPaymentUrl(null);

        if ("00".equals(responseCode)
                && "00".equals(transactionStatus)) {

            payment.setStatus(PaymentStatus.PAID);
            payment.setPaidAt(OffsetDateTime.now());
            payment.setFailureReason(null);

        } else {

            payment.setStatus(PaymentStatus.FAILED);
            payment.setPaidAt(null);
            payment.setFailureReason(
                    "Thanh toán VNPAY thất bại, mã phản hồi: "
                            + responseCode);
        }

        paymentRepository.save(payment);

        return new VnpayIpnResponse(
                "00",
                "Confirm Success");
    }

    private boolean isValidVnpayAmount(
            Payment payment,
            String vnpAmount) {
        if (vnpAmount == null || vnpAmount.isBlank()) {
            return false;
        }

        try {
            BigInteger receivedAmount = new BigInteger(vnpAmount);

            BigInteger expectedAmount = payment.getAmount()
                    .movePointRight(2)
                    .toBigIntegerExact();

            return expectedAmount.equals(receivedAmount);

        } catch (NumberFormatException
                | ArithmeticException exception) {
            return false;
        }
    }

    private String emptyToNull(String value) {
        return value == null || value.isBlank()
                ? null
                : value;
    }
}
