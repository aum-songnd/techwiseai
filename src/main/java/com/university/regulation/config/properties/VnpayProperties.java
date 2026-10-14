package com.university.regulation.config.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.vnpay")
public record VnpayProperties(

        String tmnCode,

        String hashSecret,

        String paymentUrl,

        String returnUrl,

        String ipnUrl,

        int expireMinutes

) {
}
