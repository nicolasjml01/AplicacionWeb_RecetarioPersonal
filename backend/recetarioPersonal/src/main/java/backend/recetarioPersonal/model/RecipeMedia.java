package backend.recetarioPersonal.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "recipe_media")
public class RecipeMedia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "media_id")
    private Long mediaId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recipe_id", nullable = false)
    private Recipe recipe;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipe_step_id")
    private RecipeStep step;

    @Column(name = "relative_path", nullable = false, length = 512)
    private String relativePath;

    @Column(name = "content_type", nullable = false)
    private String contentType;

    @Column(name = "original_filename")
    private String originalFilename;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    public Long getMediaId() {
        return mediaId;
    }

    public void setMediaId(Long mediaId) {
        this.mediaId = mediaId;
    }

    public Recipe getRecipe() {
        return recipe;
    }

    public void setRecipe(Recipe recipe) {
        this.recipe = recipe;
    }

    public RecipeStep getStep() {
        return step;
    }

    public void setStep(RecipeStep step) {
        this.step = step;
    }

    public String getRelativePath() {
        return relativePath;
    }

    public void setRelativePath(String relativePath) {
        this.relativePath = relativePath;
    }

    public String getContentType() {
        return contentType;
    }

    public void setContentType(String contentType) {
        this.contentType = contentType;
    }

    public String getOriginalFilename() {
        return originalFilename;
    }

    public void setOriginalFilename(String originalFilename) {
        this.originalFilename = originalFilename;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public int getDisplayOrder() {
        return displayOrder;
    }

    public void setDisplayOrder(int displayOrder) {
        this.displayOrder = displayOrder;
    }
}