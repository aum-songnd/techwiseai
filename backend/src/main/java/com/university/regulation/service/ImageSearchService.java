package com.university.regulation.service;

import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.university.regulation.dto.ai.AiImageSearchData;
import com.university.regulation.dto.ai.AiImageSearchResponse;
import com.university.regulation.integration.ai.AiImageSearchClient;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ImageSearchService {

    private static final long MAX_FILE_SIZE =
            10L * 1024L * 1024L;

    private static final int MAX_TOP_K = 50;

    private static final Set<String> ALLOWED_CONTENT_TYPES =
            Set.of(
                    "image/jpeg",
                    "image/png",
                    "image/webp"
            );

    private final AiImageSearchClient aiImageSearchClient;

    public AiImageSearchData searchByImage(
            MultipartFile image,
            int topK
    ) {
        validateImage(image);
        validateTopK(topK);

        AiImageSearchResponse response =
                aiImageSearchClient.searchByImage(image, topK);

        if (!response.success() || response.data() == null) {
            throw new IllegalStateException(
                    response.message() != null
                            ? response.message()
                            : "AI Service xử lý tìm kiếm thất bại"
            );
        }

        return response.data();
    }

    private void validateImage(MultipartFile image) {
        if (image == null || image.isEmpty()) {
            throw new IllegalArgumentException(
                    "Vui lòng chọn ảnh cần tìm kiếm"
            );
        }

        if (image.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException(
                    "Dung lượng ảnh không được vượt quá 10 MB"
            );
        }

        String contentType = image.getContentType();

        if (contentType == null
                || !ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new IllegalArgumentException(
                    "Chỉ hỗ trợ ảnh JPEG, PNG hoặc WEBP"
            );
        }
    }

    private void validateTopK(int topK) {
        if (topK < 1 || topK > MAX_TOP_K) {
            throw new IllegalArgumentException(
                    "topK phải nằm trong khoảng từ 1 đến 50"
            );
        }
    }
}