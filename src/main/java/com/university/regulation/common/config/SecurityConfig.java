package com.university.regulation.common.config;

import java.util.Arrays;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.university.regulation.security.RestAccessDeniedHandler;
import com.university.regulation.security.RestAuthenticationEntryPoint;
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

        @Bean
        public SecurityFilterChain securityFilterChain(
                        HttpSecurity http,
                        CorsConfigurationSource corsConfigurationSource,
                        Converter<Jwt, ? extends AbstractAuthenticationToken> jwtAuthenticationConverter,
                        RestAuthenticationEntryPoint authenticationEntryPoint,
                        RestAccessDeniedHandler accessDeniedHandler) throws Exception {

                http            
                        .cors(cors -> cors.configurationSource(corsConfigurationSource))
                        .csrf(AbstractHttpConfigurer::disable)

                        .sessionManagement(session -> session.sessionCreationPolicy(
                                        SessionCreationPolicy.STATELESS))

                        .authorizeHttpRequests(authorize -> authorize

                                        // API công khai
                                        .requestMatchers(
                                                        "/actuator/health",
                                                        "/api/v1/auth/login",
                                                        "/api/v1/auth/register")
                                        .permitAll()

                                        .requestMatchers(
                                                        HttpMethod.GET,
                                                        "/api/v1/categories",
                                                        "/api/v1/categories/**",
                                                        "/api/v1/products",
                                                        "/api/v1/products/**",
                                                        "/api/v1/payments/vnpay/return",
                                                        "/api/v1/payments/vnpay/ipn")
                                        .permitAll()

                                        // API quản trị
                                        .requestMatchers("/api/v1/admin/**")
                                        .hasRole("ADMIN")
                                        .requestMatchers(
                                                        "/api/v1/cart",
                                                        "/api/v1/cart/**",
                                                        "/api/v1/orders",
                                                        "/api/v1/orders/**",
                                                        "/api/v1/payments",
                                                        "/api/v1/payments/**",
                                                        "/api/v1/favorites",
                                                        "/api/v1/favorites/**")
                                        .authenticated()

                                        // Các API còn lại cũng cần đăng nhập
                                        .anyRequest()
                                        .authenticated())

                        .exceptionHandling(exception -> exception
                                        .authenticationEntryPoint(
                                                        authenticationEntryPoint)
                                        .accessDeniedHandler(
                                                        accessDeniedHandler))

                        .oauth2ResourceServer(resourceServer -> resourceServer
                                        .authenticationEntryPoint(
                                                        authenticationEntryPoint)
                                        .accessDeniedHandler(
                                                        accessDeniedHandler)
                                        .jwt(jwt -> jwt.jwtAuthenticationConverter(
                                                        jwtAuthenticationConverter)));

        return http.build();
        }

        @Bean
        public CorsConfigurationSource corsConfigurationSource(
                        @Value("${app.cors.allowed-origins}") String allowedOrigins) {

                CorsConfiguration configuration = new CorsConfiguration();

                configuration.setAllowedOrigins(
                                Arrays.stream(allowedOrigins.split(","))
                                                .map(String::trim)
                                                .filter(origin -> !origin.isBlank())
                                                .toList());

                configuration.setAllowedMethods(
                                List.of(
                                                "GET",
                                                "POST",
                                                "PUT",
                                                "PATCH",
                                                "DELETE",
                                                "OPTIONS"));

                configuration.setAllowedHeaders(
                                List.of(
                                                "Authorization",
                                                "Content-Type",
                                                "Accept"));

                // JWT được gửi bằng Authorization
                configuration.setAllowCredentials(false);

                configuration.setMaxAge(3600L);

                UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();

                source.registerCorsConfiguration("/api/**", configuration);

                return source;
        }

        @Bean
        public AuthenticationManager authenticationManager(
                        AuthenticationConfiguration configuration) throws Exception {

                return configuration.getAuthenticationManager();
        }
}