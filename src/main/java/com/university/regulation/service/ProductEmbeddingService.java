package com.university.regulation.service;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ExecutorService;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import com.university.regulation.ai.AiClient;
import com.university.regulation.models.product.Product;
import com.university.regulation.repository.ProductEmbeddingRepository;
import com.university.regulation.repository.ProductRepository;

import lombok.extern.slf4j.Slf4j;

/**
 * Tạo và cập nhật embedding cho sản phẩm.
 * - Khi sản phẩm được tạo/sửa: ProductService publish ProductChangedEvent -> embedding được tạo lại ở nền.
 * - Khi ứng dụng khởi động: tự động tạo embedding cho các sản phẩm còn thiếu (backfill).
 *
 * Việc gọi API AI được thực hiện NGOÀI transaction để không giữ kết nối DB trong lúc chờ mạng.
 */
@Slf4j
@Service
public class ProductEmbeddingService implements ApplicationRunner {

    public record ProductChangedEvent(UUID productId) {
    }

    private final ProductRepository productRepository;
    private final ProductEmbeddingRepository embeddingRepository;
    private final AiClient aiClient;
    private final ProductSpecReader specReader;
    private final TransactionTemplate tx;
    private final ExecutorService aiExecutor;

    public ProductEmbeddingService(
            ProductRepository productRepository,
            ProductEmbeddingRepository embeddingRepository,
            AiClient aiClient,
            ProductSpecReader specReader,
            TransactionTemplate tx,
            @Qualifier("aiExecutor") ExecutorService aiExecutor) {
        this.productRepository = productRepository;
        this.embeddingRepository = embeddingRepository;
        this.aiClient = aiClient;
        this.specReader = specReader;
        this.tx = tx;
        this.aiExecutor = aiExecutor;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onProductChanged(ProductChangedEvent event) {
        reindexAsync(event.productId());
    }

    public void reindexAsync(UUID productId) {
        if (!aiClient.isEmbeddingEnabled()) {
            return;
        }
        aiExecutor.submit(() -> {
            try {
                reindex(productId);
            } catch (Exception e) {
                log.warn("Không tạo được embedding cho sản phẩm {}: {}", productId, e.getMessage());
            }
        });
    }

    public void reindex(UUID productId) {
        String text = tx.execute(status -> productRepository.findById(productId)
                .map(this::buildText)
                .orElse(null));
        if (text == null) {
            return;
        }
        embeddingRepository.save(productId, aiClient.embed(text));
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!aiClient.isEmbeddingEnabled()) {
            log.info("ai.embedding-enabled=false: bỏ qua backfill embedding, đề xuất sẽ dùng logic cũ");
            return;
        }
        aiExecutor.submit(this::backfill);
    }

    private void backfill() {
        Set<UUID> failed = new HashSet<>();
        int done = 0;

        while (true) {
            List<UUID> ids = embeddingRepository.findIdsWithoutEmbedding(50 + failed.size()).stream()
                    .filter(id -> !failed.contains(id))
                    .limit(50)
                    .toList();
            if (ids.isEmpty()) {
                break;
            }
            for (UUID id : ids) {
                try {
                    reindex(id);
                    done++;
                } catch (Exception e) {
                    failed.add(id);
                    log.warn("Backfill lỗi sản phẩm {}: {}", id, e.getMessage());
                }
            }
            // Lỗi hệ thống (sai API key, hết quota...): dừng thay vì lặp vô ích.
            if (done == 0 && failed.size() >= 5) {
                log.error("Backfill embedding dừng do liên tục lỗi, kiểm tra cấu hình ai.*");
                return;
            }
        }
        log.info("Backfill embedding xong: {} thành công, {} lỗi", done, failed.size());
    }

    private String buildText(Product product) {
        StringBuilder sb = new StringBuilder();
        sb.append("Tên: ").append(product.getName()).append('\n');

        if (product.getBrand() != null && !product.getBrand().isBlank()) {
            sb.append("Thương hiệu: ").append(product.getBrand()).append('\n');
        }
        if (product.getCategory() != null) {
            sb.append("Danh mục: ").append(product.getCategory().getName()).append('\n');
        }
        if (product.getShortDescription() != null && !product.getShortDescription().isBlank()) {
            String shortDescription = product.getShortDescription().trim();
            sb.append("Mô tả: ")
                    .append(shortDescription.length() > 500 ? shortDescription.substring(0, 500) : shortDescription)
                    .append('\n');
        }

        Map<String, String> specs = specReader.flatten(product.getSpecifications());
        if (!specs.isEmpty()) {
            sb.append("Thông số: ");
            specs.forEach((key, value) -> sb.append(key).append(": ").append(value).append("; "));
        }
        return sb.toString();
    }
}
