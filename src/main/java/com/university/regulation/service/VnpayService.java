package com.university.regulation.service;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.TreeMap;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.stereotype.Service;

import com.university.regulation.config.properties.VnpayProperties;
import com.university.regulation.models.payment.Payment;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class VnpayService {

    private static final String VERSION = "2.1.0";
    private static final String COMMAND = "pay";
    private static final String ORDER_TYPE = "other";
    private static final String CURRENCY = "VND";
    private static final String LOCALE = "vn";

    private static final ZoneId VIETNAM_ZONE =
            ZoneId.of("Asia/Ho_Chi_Minh");

    private static final DateTimeFormatter DATE_FORMAT =
            DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    private final VnpayProperties properties;

    /**
     * Sinh URL đưa khách hàng sang cổng thanh toán VNPAY.
     */
    public String createPaymentUrl(
            Payment payment,
            String ipAddress
    ) {
        LocalDateTime createTime =
                LocalDateTime.now(VIETNAM_ZONE);

        LocalDateTime expireTime =
                createTime.plusMinutes(properties.expireMinutes());

        Map<String, String> parameters = new TreeMap<>();

        parameters.put("vnp_Version", VERSION);
        parameters.put("vnp_Command", COMMAND);
        parameters.put("vnp_TmnCode", properties.tmnCode());

        parameters.put(
                "vnp_Amount",
                convertAmount(payment.getAmount())
        );

        parameters.put("vnp_CurrCode", CURRENCY);

        parameters.put(
                "vnp_TxnRef",
                payment.getTransactionCode()
        );

        parameters.put(
                "vnp_OrderInfo",
                "Thanh toan don hang "
                        + payment.getOrder().getId()
        );

        parameters.put("vnp_OrderType", ORDER_TYPE);
        parameters.put("vnp_Locale", LOCALE);

        parameters.put(
                "vnp_ReturnUrl",
                properties.returnUrl()
        );

        parameters.put(
                "vnp_IpAddr",
                normalizeIpAddress(ipAddress)
        );

        parameters.put(
                "vnp_CreateDate",
                createTime.format(DATE_FORMAT)
        );

        parameters.put(
                "vnp_ExpireDate",
                expireTime.format(DATE_FORMAT)
        );

        String queryString = buildQueryString(parameters);

        String secureHash = hmacSha512(
                properties.hashSecret(),
                queryString
        );

        return properties.paymentUrl()
                + "?"
                + queryString
                + "&vnp_SecureHash="
                + secureHash;
    }

    /**
     * Kiểm tra dữ liệu callback/IPN có thật sự đến từ VNPAY.
     */
    public boolean verifySignature(
            Map<String, String> callbackParameters
    ) {
        String receivedHash =
                callbackParameters.get("vnp_SecureHash");

        if (receivedHash == null || receivedHash.isBlank()) {
            return false;
        }

        Map<String, String> signedParameters =
                new TreeMap<>();

        callbackParameters.forEach((key, value) -> {
            if (!key.equals("vnp_SecureHash")
                    && !key.equals("vnp_SecureHashType")
                    && value != null
                    && !value.isBlank()) {

                signedParameters.put(key, value);
            }
        });

        String hashData =
                buildQueryString(signedParameters);

        String calculatedHash = hmacSha512(
                properties.hashSecret(),
                hashData
        );

        return MessageDigest.isEqual(
                calculatedHash.toLowerCase()
                        .getBytes(StandardCharsets.UTF_8),
                receivedHash.toLowerCase()
                        .getBytes(StandardCharsets.UTF_8)
        );
    }

    /**
     * VNPAY yêu cầu số tiền được nhân 100.
     *
     * Ví dụ: 100.000 VND → 10.000.000.
     */
    private String convertAmount(BigDecimal amount) {
        return amount
                .movePointRight(2)
                .longValueExact()
                + "";
    }

    private String buildQueryString(
            Map<String, String> parameters
    ) {
        StringBuilder result = new StringBuilder();

        for (Map.Entry<String, String> entry
                : parameters.entrySet()) {

            String value = entry.getValue();

            if (value == null || value.isBlank()) {
                continue;
            }

            if (!result.isEmpty()) {
                result.append("&");
            }

            result.append(urlEncode(entry.getKey()));
            result.append("=");
            result.append(urlEncode(value));
        }

        return result.toString();
    }

    private String urlEncode(String value) {
        return URLEncoder.encode(
                value,
                StandardCharsets.UTF_8
        );
    }

    private String hmacSha512(
            String secret,
            String data
    ) {
        try {
            Mac mac = Mac.getInstance("HmacSHA512");

            SecretKeySpec key = new SecretKeySpec(
                    secret.getBytes(StandardCharsets.UTF_8),
                    "HmacSHA512"
            );

            mac.init(key);

            byte[] hash = mac.doFinal(
                    data.getBytes(StandardCharsets.UTF_8)
            );

            return bytesToHex(hash);

        } catch (Exception exception) {
            throw new IllegalStateException(
                    "Không thể tạo chữ ký VNPAY",
                    exception
            );
        }
    }

    private String bytesToHex(byte[] bytes) {
        StringBuilder result =
                new StringBuilder(bytes.length * 2);

        for (byte value : bytes) {
            result.append(
                    String.format("%02x", value)
            );
        }

        return result.toString();
    }

    private String normalizeIpAddress(String ipAddress) {
        if (ipAddress == null || ipAddress.isBlank()) {
            return "127.0.0.1";
        }

        if (ipAddress.contains(",")) {
            return ipAddress
                    .substring(0, ipAddress.indexOf(","))
                    .trim();
        }

        return ipAddress;
    }
}
