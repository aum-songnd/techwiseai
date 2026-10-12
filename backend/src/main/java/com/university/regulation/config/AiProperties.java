package com.university.regulation.config;

import java.time.Duration;
import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import lombok.Getter;
import lombok.Setter;

/**
 * Cấu hình AI. Embedding và Chat tách riêng vì có thể chạy ở 2 nơi khác nhau
 * (ví dụ: embedding chạy local bằng sentence-transformers, chat chạy bằng Ollama hoặc tắt hẳn).
 */
@Component
@ConfigurationProperties(prefix = "ai")
@Getter
@Setter
public class AiProperties {

    // ---- Embedding (server Python sentence-transformers, API giống OpenAI) ----
    private boolean embeddingEnabled = false;
    private String embeddingBaseUrl = "http://localhost:8000/v1";
    private String embeddingApiKey = "";
    private String embeddingModel = "all-MiniLM-L6-v2";
    /** Phải khớp với vector(N) trong migration. all-MiniLM-L6-v2 = 384. */
    private int embeddingDimensions = 384;
    /** Chỉ bật với OpenAI text-embedding-3-*; model local không cần. */
    private boolean sendDimensions = false;
    private int timeoutSeconds = 20;

    // ---- Chat/LLM (tùy chọn): sinh nhãn Best/Hot/Choice và lý do. Tắt thì dùng luật có sẵn ----
    private boolean chatEnabled = false;
    private String chatBaseUrl = "http://localhost:11434/v1"; // Ollama
    private String chatApiKey = "";
    private String chatModel = "qwen2.5:7b";
    private int chatTimeoutSeconds = 60;

    /** Các nhãn thông số hiển thị trong thẻ so sánh (khớp không phân biệt hoa/thường, dấu). */
    private List<String> keySpecLabels = List.of("CPU", "RAM", "VGA", "Màn hình", "Phân Loại Laptop");

    /** Thời gian cache nhãn/lý do do LLM sinh ra cho mỗi sản phẩm. */
    private Duration annotationTtl = Duration.ofHours(12);
}
