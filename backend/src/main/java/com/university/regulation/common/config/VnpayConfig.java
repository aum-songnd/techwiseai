package com.university.regulation.common.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import com.university.regulation.config.properties.VnpayProperties;

@Configuration
@EnableConfigurationProperties(VnpayProperties.class)
public class VnpayConfig {
}
