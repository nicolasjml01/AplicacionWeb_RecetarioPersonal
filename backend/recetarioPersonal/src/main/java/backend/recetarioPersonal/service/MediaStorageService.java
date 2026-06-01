package backend.recetarioPersonal.service;

import backend.recetarioPersonal.config.MediaStorageProperties;
import backend.recetarioPersonal.exception.FileStorageException;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class MediaStorageService {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg", "image/png", "image/webp", "image/gif",
            "video/mp4", "video/webm"
    );

    private final MediaStorageProperties props;
    private final Path rootPath;

    public MediaStorageService(MediaStorageProperties props) {
        this.props = props;
        this.rootPath = Path.of(props.root()).toAbsolutePath().normalize();
    }

    public String store(long userId, long recipeId, MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Es obligatorio adjuntar un archivo.");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new IllegalArgumentException("Tipo de archivo no permitido: " + contentType);
        }
        if (file.getSize() > props.maxFileSizeBytes()) {
            throw new IllegalArgumentException("El archivo supera el tamaño máximo permitido.");
        }

        String ext = extensionFrom(file.getOriginalFilename(), contentType);
        String relative = userId + "/" + recipeId + "/" + UUID.randomUUID() + ext;

        Path target = rootPath.resolve(relative).normalize();
        if (!target.startsWith(rootPath)) {
            throw new IllegalArgumentException("Ruta de almacenamiento no válida.");
        }

        Files.createDirectories(target.getParent());
        try (InputStream in = file.getInputStream()) {
            Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
        }
        return relative.replace('\\', '/');
    }

    /**
     * Stores binary image data (e.g. downloaded during recipe URL import).
     */
    public String storeBytes(long userId, long recipeId, byte[] data, String contentType, String suggestedFilename)
            throws IOException {
        if (data == null || data.length == 0) {
            throw new IllegalArgumentException("Es obligatorio adjuntar un archivo.");
        }
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new IllegalArgumentException("Tipo de archivo no permitido: " + contentType);
        }
        if (data.length > props.maxFileSizeBytes()) {
            throw new IllegalArgumentException("El archivo supera el tamaño máximo permitido.");
        }

        String ext = extensionFrom(suggestedFilename, contentType);
        String relative = userId + "/" + recipeId + "/" + UUID.randomUUID() + ext;

        Path target = rootPath.resolve(relative).normalize();
        if (!target.startsWith(rootPath)) {
            throw new IllegalArgumentException("Ruta de almacenamiento no válida.");
        }

        Files.createDirectories(target.getParent());
        Files.write(target, data);
        return relative.replace('\\', '/');
    }

    /**
     * Stores an image for a user-owned ingredients catalog.
     */
    public String storeIngredientImage(long userId, long ingredientId, MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Es obligatorio adjuntar un archivo.");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new IllegalArgumentException("Tipo de archivo no permitido: " + contentType);
        }
        if (file.getSize() > props.maxFileSizeBytes()) {
            throw new IllegalArgumentException("El archivo supera el tamaño máximo permitido.");
        }

        String ext = extensionFrom(file.getOriginalFilename(), contentType);
        String relative = userId + "/ingredients/" + ingredientId + "/" + UUID.randomUUID() + ext;

        Path target = rootPath.resolve(relative).normalize();
        if (!target.startsWith(rootPath)) {
            throw new IllegalArgumentException("Ruta de almacenamiento no válida.");
        }

        Files.createDirectories(target.getParent());
        try (InputStream in = file.getInputStream()) {
            Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
        }
        return relative.replace('\\', '/');
    }

    public void deleteIfExists(String relativePath) {
        if (relativePath == null || relativePath.isBlank()) {
            return;
        }
        Path target = rootPath.resolve(relativePath).normalize();
        if (!target.startsWith(rootPath)) {
            return;
        }
        try {
            Files.deleteIfExists(target);
        } catch (IOException e) {
            throw new FileStorageException("No se pudo eliminar el archivo: " + relativePath, e);
        }
    }

    private static String extensionFrom(String originalName, String contentType) {
        if (originalName != null && originalName.contains(".")) {
            String ext = originalName.substring(originalName.lastIndexOf('.')).toLowerCase(Locale.ROOT);
            if (ext.length() <= 8 && ext.matches("\\.[a-z0-9]+")) {
                return ext;
            }
        }
        return switch (contentType.toLowerCase(Locale.ROOT)) {
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            case "image/gif" -> ".gif";
            case "video/mp4" -> ".mp4";
            case "video/webm" -> ".webm";
            default -> ".bin";
        };
    }
}
