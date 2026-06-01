package backend.recetarioPersonal.recipeimport;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import org.springframework.stereotype.Component;

/**
 * Downloads a remote image for recipe import (SSRF-safe URL validation, size and type limits).
 */
@Component
public class ImportImageFetcher {

    private static final String USER_AGENT = "RecetarioPersonal/1.0 (+recipe-import-images)";
    private static final Duration TIMEOUT = Duration.ofSeconds(10);
    private static final int MAX_BYTES = 5 * 1024 * 1024;
    /** Small og:image thumbnails are common; avoid rejecting valid covers. */
    private static final int MIN_BYTES = 800;

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg", "image/png", "image/webp", "image/gif");

    private final UrlValidator urlValidator;
    private final HttpClient httpClient;

    public ImportImageFetcher(UrlValidator urlValidator) {
        this.urlValidator = urlValidator;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(TIMEOUT)
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
    }

    public Optional<DownloadedImage> fetch(String rawUrl) {
        if (rawUrl == null || rawUrl.isBlank() || !isLikelyRecipeImageUrl(rawUrl.toLowerCase(Locale.ROOT))) {
            return Optional.empty();
        }

        final String url;
        try {
            url = urlValidator.validateAndNormalize(rawUrl.trim());
        } catch (IllegalArgumentException ex) {
            return Optional.empty();
        }

        HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                .timeout(TIMEOUT)
                .header("User-Agent", USER_AGENT)
                .header("Accept", "image/jpeg,image/png,image/webp,image/gif,*/*;q=0.8")
                .GET()
                .build();

        try {
            HttpResponse<InputStream> response = httpClient.send(request, HttpResponse.BodyHandlers.ofInputStream());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                return Optional.empty();
            }

            byte[] body = readBounded(response.body(), MAX_BYTES);
            if (body.length < MIN_BYTES) {
                return Optional.empty();
            }

            String contentType = normalizeContentType(response.headers().firstValue("Content-Type").orElse(null));
            if (contentType == null) {
                contentType = detectContentTypeFromBytes(body);
            }
            if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType)) {
                return Optional.empty();
            }

            String filename = filenameFromUrl(url, contentType);
            return Optional.of(new DownloadedImage(body, contentType, filename));
        } catch (IOException | InterruptedException ex) {
            if (ex instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            return Optional.empty();
        }
    }

    public static boolean isLikelyRecipeImageUrl(String urlLower) {
        if (urlLower.contains("logo")
                || urlLower.contains("favicon")
                || urlLower.contains("sprite")
                || urlLower.contains("avatar")
                || urlLower.contains("badge")
                || urlLower.contains("pixel")
                || urlLower.contains("tracking")
                || urlLower.contains("/ads/")
                || urlLower.contains("emoji")) {
            return false;
        }
        return !urlLower.endsWith(".svg");
    }

    private static String normalizeContentType(String header) {
        if (header == null || header.isBlank()) {
            return null;
        }
        String base = header.split(";", 2)[0].trim().toLowerCase(Locale.ROOT);
        if ("image/jpg".equals(base)) {
            return "image/jpeg";
        }
        return ALLOWED_CONTENT_TYPES.contains(base) ? base : null;
    }

    private static String detectContentTypeFromBytes(byte[] body) {
        if (body.length >= 3 && body[0] == (byte) 0xff && body[1] == (byte) 0xd8 && body[2] == (byte) 0xff) {
            return "image/jpeg";
        }
        if (body.length >= 8
                && body[0] == (byte) 0x89
                && body[1] == 0x50
                && body[2] == 0x4e
                && body[3] == 0x47) {
            return "image/png";
        }
        if (body.length >= 6) {
            String head = new String(body, 0, 6, java.nio.charset.StandardCharsets.US_ASCII);
            if (head.startsWith("GIF87a") || head.startsWith("GIF89a")) {
                return "image/gif";
            }
        }
        if (body.length >= 12) {
            String riff = new String(body, 0, 4, java.nio.charset.StandardCharsets.US_ASCII);
            String webp = new String(body, 8, 4, java.nio.charset.StandardCharsets.US_ASCII);
            if ("RIFF".equals(riff) && "WEBP".equals(webp)) {
                return "image/webp";
            }
        }
        return null;
    }

    private static byte[] readBounded(InputStream in, int maxBytes) throws IOException {
        try (in) {
            byte[] buffer = new byte[8192];
            int total = 0;
            var out = new java.io.ByteArrayOutputStream();
            int read;
            while ((read = in.read(buffer)) != -1) {
                total += read;
                if (total > maxBytes) {
                    throw new IOException("Image exceeds max size");
                }
                out.write(buffer, 0, read);
            }
            return out.toByteArray();
        }
    }

    private static String filenameFromUrl(String url, String contentType) {
        try {
            String path = URI.create(url).getPath();
            if (path != null) {
                int slash = path.lastIndexOf('/');
                String name = slash >= 0 ? path.substring(slash + 1) : path;
                if (!name.isBlank() && name.length() <= 120) {
                    return name;
                }
            }
        } catch (Exception ignored) {
            // fall through
        }
        return switch (contentType) {
            case "image/png" -> "import.png";
            case "image/webp" -> "import.webp";
            case "image/gif" -> "import.gif";
            default -> "import.jpg";
        };
    }

    public record DownloadedImage(byte[] data, String contentType, String filename) {}
}
