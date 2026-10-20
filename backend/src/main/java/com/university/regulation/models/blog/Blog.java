package com.university.regulation.models.blog;

import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.Set;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "blogs")
public class Blog {

    @Id
    @Column(nullable = false, length = 100)
    private String id;

    @Column(nullable = false, length = 500)
    private String title;

    @Column(nullable = false, unique = true, length = 500)
    private String slug;

    @Column(name = "author_id", nullable = false, length = 100)
    private String authorId;

    @Column(name = "main_image_url", length = 1000)
    private String mainImageUrl;

    @Column(name = "published_at", nullable = false)
    private OffsetDateTime publishedAt;

    @Column(name = "is_latest", nullable = false)
    private boolean isLatest = false;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String body;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "blog_category_mappings",
        joinColumns = @JoinColumn(name = "blog_id"),
        inverseJoinColumns = @JoinColumn(name = "category_id")
    )
    private Set<BlogCategory> categories = new HashSet<>();

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        OffsetDateTime now = OffsetDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
        if (publishedAt == null) {
            publishedAt = now;
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
