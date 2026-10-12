package com.university.regulation.service.storage;

import org.springframework.web.multipart.MultipartFile;

public interface ImageStorageService {

    ImageUploadResult upload(
            MultipartFile file,
            String folder
    );

    void delete(String publicId);
}
