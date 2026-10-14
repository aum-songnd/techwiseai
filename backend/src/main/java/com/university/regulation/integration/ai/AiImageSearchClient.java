package com.university.regulation.integration.ai;

import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.multipart.MultipartFile;

import com.university.regulation.dto.ai.AiImageSearchResponse;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class AiImageSearchClient {

    private final RestClient aiServiceRestClient;

    public AiImageSearchResponse searchByImage(
            MultipartFile image,
            int topK
    ) {
        try {
            byte[] imageContent = image.getBytes();

            ByteArrayResource imageResource =
                    new ByteArrayResource(imageContent) {
                        @Override
                        public String getFilename() {
                            String originalFilename =
                                    image.getOriginalFilename();

                            return originalFilename != null
                                    ? originalFilename
                                    : "search-image";
                        }
                    };

            MultiValueMap<String, Object> multipartBody =
                    new LinkedMultiValueMap<>();

            multipartBody.add("file", imageResource);

            AiImageSearchResponse response = aiServiceRestClient
                    .post()
                    .uri(uriBuilder -> uriBuilder
                            .path("/api/v1/search/image")
                            .queryParam("top_k", topK)
                            .build())
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(multipartBody)
                    .retrieve()
                    .body(AiImageSearchResponse.class);

            if (response == null) {
                throw new IllegalStateException(
                        "AI Service không trả về dữ liệu"
                );
            }

            return response;
        } catch (Exception exception) {
            throw new IllegalStateException(
                    "Không thể tìm kiếm sản phẩm bằng hình ảnh",
                    exception
            );
        }
    }
}