package com.university.regulation.config;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@Configuration
public class AiConfig {

    @Bean
    RestClient aiEmbeddingRestClient(AiProperties props) {
        return build(props.getEmbeddingBaseUrl(), props.getEmbeddingApiKey(), props.getTimeoutSeconds());
    }

    @Bean
    RestClient aiChatRestClient(AiProperties props) {
        return build(props.getChatBaseUrl(), props.getChatApiKey(), props.getChatTimeoutSeconds());
    }

    /** Pool nhỏ cho việc gọi AI ở nền (tạo embedding, sinh nhãn/lý do) để không chặn request của khách. */
    @Bean(name = "aiExecutor")
    ExecutorService aiExecutor() {
        return Executors.newFixedThreadPool(2, runnable -> {
            Thread thread = new Thread(runnable, "ai-worker");
            thread.setDaemon(true);
            return thread;
        });
    }

    private RestClient build(String baseUrl, String apiKey, int timeoutSeconds) {
        HttpClient httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofSeconds(5))
                .build();

        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(httpClient);
        factory.setReadTimeout(Duration.ofSeconds(timeoutSeconds));

        RestClient.Builder builder = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(factory)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE);

        if (apiKey != null && !apiKey.isBlank()) {
            builder.defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey);
        }
        return builder.build();
    }
}
