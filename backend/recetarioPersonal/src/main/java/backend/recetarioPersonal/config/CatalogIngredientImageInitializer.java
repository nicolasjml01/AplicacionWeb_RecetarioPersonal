package backend.recetarioPersonal.config;

import backend.recetarioPersonal.service.util.IngredientNameNormalizer;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Locale;

/**
 * On startup: copies bundled catalog PNGs into {@code app.media.root} and links
 * {@code ingredients.image_relative_path} from {@code catalog/ingredients.json}.
 * <p>Idempotent — safe on every boot; does not overwrite existing image files.</p>
 */
@Component
public class CatalogIngredientImageInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(CatalogIngredientImageInitializer.class);
    private static final String CATALOG_JSON = "/catalog/ingredients.json";
    private static final String IMAGES_PREFIX = "/catalog/images/";
    private static final String MEDIA_SUBDIR = "catalog/ingredients/";
    private static final ObjectMapper JSON = new ObjectMapper();

    private final MediaStorageProperties mediaStorageProperties;
    private final JdbcTemplate jdbcTemplate;

    public CatalogIngredientImageInitializer(
            MediaStorageProperties mediaStorageProperties,
            JdbcTemplate jdbcTemplate
    ) {
        this.mediaStorageProperties = mediaStorageProperties;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        List<CatalogEntry> entries = loadCatalog();
        Path mediaRoot = Path.of(mediaStorageProperties.root()).toAbsolutePath().normalize();
        Files.createDirectories(mediaRoot);

        int copied = copyMissingImages(mediaRoot, entries);
        int linked = linkDatabasePaths(entries);

        if (copied > 0 || linked > 0) {
            log.info("Catalog ingredient images: {} file(s) copied, {} DB row(s) linked", copied, linked);
        }
    }

    private int copyMissingImages(Path mediaRoot, List<CatalogEntry> entries) throws IOException {
        Path targetDir = mediaRoot.resolve(MEDIA_SUBDIR).normalize();
        if (!targetDir.startsWith(mediaRoot)) {
            throw new IllegalStateException("Invalid catalog image target directory.");
        }
        Files.createDirectories(targetDir);

        int copied = 0;
        for (CatalogEntry entry : entries) {
            try {
                String imageFile = trimToNull(entry.imageFile());
                if (imageFile == null) {
                    continue;
                }
                String safeName = safeFileName(imageFile);
                Path target = targetDir.resolve(safeName).normalize();
                if (!target.startsWith(targetDir) || Files.exists(target)) {
                    continue;
                }
                String resourcePath = IMAGES_PREFIX + safeName;
                try (InputStream input = getClass().getResourceAsStream(resourcePath)) {
                    if (input == null) {
                        log.warn("Catalog image missing on classpath: {}", resourcePath);
                        continue;
                    }
                    Files.copy(input, target, StandardCopyOption.REPLACE_EXISTING);
                    copied++;
                }
            } catch (Exception e) {
                log.warn("Skipping catalog image for {}: {}", entry.name(), e.getMessage());
            }
        }
        return copied;
    }

    private int linkDatabasePaths(List<CatalogEntry> entries) {
        int linked = 0;
        for (CatalogEntry entry : entries) {
            try {
                String imageFile = trimToNull(entry.imageFile());
                String name = trimToNull(entry.name());
                if (imageFile == null || name == null) {
                    continue;
                }
                String normalized = IngredientNameNormalizer.normalize(name);
                if (normalized.isEmpty()) {
                    continue;
                }
                String relativePath = MEDIA_SUBDIR + safeFileName(imageFile);
                linked += jdbcTemplate.update(
                        """
                        UPDATE ingredients
                        SET image_relative_path = ?
                        WHERE owner_user_id IS NULL
                          AND normalized_name = ?
                          AND (image_relative_path IS NULL OR image_relative_path <> ?)
                        """,
                        relativePath,
                        normalized,
                        relativePath
                );
            } catch (Exception e) {
                log.warn("Skipping catalog image link for {}: {}", entry.name(), e.getMessage());
            }
        }
        return linked;
    }

    private static List<CatalogEntry> loadCatalog() throws IOException {
        try (InputStream input = CatalogIngredientImageInitializer.class.getResourceAsStream(CATALOG_JSON)) {
            if (input == null) {
                throw new IllegalStateException("Catalog resource not found: " + CATALOG_JSON);
            }
            List<CatalogEntry> entries = JSON.readValue(input, new TypeReference<>() {});
            if (entries == null || entries.isEmpty()) {
                throw new IllegalStateException("Catalog is empty: " + CATALOG_JSON);
            }
            return entries;
        }
    }

    private static String safeFileName(String imageFile) {
        String fileName = Path.of(imageFile).getFileName().toString();
        if (!fileName.toLowerCase(Locale.ROOT).endsWith(".png")) {
            throw new IllegalArgumentException("Catalog image must be a PNG: " + imageFile);
        }
        if (fileName.contains("..") || fileName.contains("/") || fileName.contains("\\")) {
            throw new IllegalArgumentException("Invalid catalog image file name: " + imageFile);
        }
        return fileName;
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record CatalogEntry(String category, String name, String imageFile) {
    }
}
