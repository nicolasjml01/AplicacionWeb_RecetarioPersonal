package backend.recetarioPersonal.config;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Filesystem root and per-file size limit for recipe media.
 */
@Validated
@ConfigurationProperties(prefix = "app.media")
public record MediaStorageProperties(
        @NotBlank(message = "app.media.root must not be blank")
        String root,
        @Min(value = 1024, message = "app.media.max-file-size-bytes must be at least 1024")
        long maxFileSizeBytes
) {}