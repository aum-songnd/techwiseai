package com.university.regulation.service.storage;

import java.io.IOException;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CloudinaryImageStorageService implements ImageStorageService {

    private final Cloudinary cloudinary;

    @Override
    public ImageUploadResult upload(
            MultipartFile file,
            String folder
    ) {
        try {
            Map<?, ?> result =
                    cloudinary.uploader().upload(
                            file.getBytes(),
                            ObjectUtils.asMap(
                                    "folder", folder,
                                    "resource_type", "image",
                                    "unique_filename", true,
                                    "overwrite", false
                            )
                    );

            String imageUrl =
                    result.get("secure_url").toString();

            String publicId =
                    result.get("public_id").toString();

            return new ImageUploadResult(
                    imageUrl,
                    publicId
            );

        } catch (IOException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Không thể tải ảnh lên Cloudinary",
                    exception
            );
        }
    }

    @Override
    public void delete(String publicId) {
        try {
            Map<?, ?> result =
                    cloudinary.uploader().destroy(
                            publicId,
                            ObjectUtils.asMap(
                                    "resource_type", "image",
                                    "invalidate", true
                            )
                    );

            String status =
                    String.valueOf(result.get("result"));

            if (!"ok".equals(status)
                    && !"not found".equals(status)) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Không thể xóa ảnh trên Cloudinary"
                );
            }

        } catch (IOException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Không thể xóa ảnh trên Cloudinary",
                    exception
            );
        }
    }
}
