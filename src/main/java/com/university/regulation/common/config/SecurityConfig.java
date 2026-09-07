package com.university.regulation.common.config;

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

import com.university.regulation.security.RestAccessDeniedHandler;
import com.university.regulation.security.RestAuthenticationEntryPoint;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            Converter<Jwt, ? extends AbstractAuthenticationToken>
                    jwtAuthenticationConverter,
            RestAuthenticationEntryPoint authenticationEntryPoint,
            RestAccessDeniedHandler accessDeniedHandler
    ) throws Exception {

        http
                .csrf(AbstractHttpConfigurer::disable)

                .sessionManagement(session ->
                        session.sessionCreationPolicy(
                                SessionCreationPolicy.STATELESS
                        )
                )

                .authorizeHttpRequests(authorize -> authorize

                        // API công khai
                        .requestMatchers(
                                "/actuator/health",
                                "/api/v1/auth/login",
                                "/api/v1/auth/register"
                        )
                        .permitAll()

                        // Danh mục và sản phẩm công khai chỉ cho phép GET
                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/v1/categories",
                                "/api/v1/categories/**",
                                "/api/v1/products",
                                "/api/v1/products/**"
                        )
                        .permitAll()

                        // API quản trị
                        .requestMatchers("/api/v1/admin/**")
                        .hasRole("ADMIN")

                        // Giỏ hàng bắt buộc đăng nhập
                        .requestMatchers(
                                "/api/v1/cart",
                                "/api/v1/cart/**",
                                "/api/v1/orders",
                                "/api/v1/orders/**"
                        )
                        .authenticated()
                        

                        // Các API còn lại cũng cần đăng nhập
                        .anyRequest()
                        .authenticated()
                )

                .exceptionHandling(exception -> exception
                        .authenticationEntryPoint(
                                authenticationEntryPoint
                        )
                        .accessDeniedHandler(
                                accessDeniedHandler
                        )
                )

                .oauth2ResourceServer(resourceServer ->
                        resourceServer
                                .authenticationEntryPoint(
                                        authenticationEntryPoint
                                )
                                .accessDeniedHandler(
                                        accessDeniedHandler
                                )
                                .jwt(jwt ->
                                        jwt.jwtAuthenticationConverter(
                                                jwtAuthenticationConverter
                                        )
                                )
                );

        return http.build();
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration configuration
    ) throws Exception {

        return configuration.getAuthenticationManager();
    }
}