package backend.recetarioPersonal.recipeimport;

import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;
import java.util.Locale;

/**
 * Validates user-supplied URLs before outbound HTTP (SSRF mitigation).
 */
public class UrlValidator {

    private static final int MAX_URL_LENGTH = 2048;

    public String validateAndNormalize(String rawUrl) {
        if (rawUrl == null || rawUrl.isBlank()) {
            throw new IllegalArgumentException("La URL es obligatoria.");
        }
        String trimmed = rawUrl.trim();
        if (trimmed.length() > MAX_URL_LENGTH) {
            throw new IllegalArgumentException("La URL es demasiado larga.");
        }

        URI uri;
        try {
            uri = URI.create(trimmed);
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("La URL no es válida.");
        }

        String scheme = uri.getScheme();
        if (scheme == null) {
            throw new IllegalArgumentException("La URL debe incluir http:// o https://");
        }
        String schemeLower = scheme.toLowerCase(Locale.ROOT);
        if (!"http".equals(schemeLower) && !"https".equals(schemeLower)) {
            throw new IllegalArgumentException("Solo se permiten enlaces http o https.");
        }

        String host = uri.getHost();
        if (host == null || host.isBlank()) {
            throw new IllegalArgumentException("La URL no es válida.");
        }

        String hostLower = host.toLowerCase(Locale.ROOT);
        if (isBlockedHost(hostLower)) {
            throw new IllegalArgumentException("Esa URL no está permitida.");
        }

        try {
            for (InetAddress address : InetAddress.getAllByName(host)) {
                if (address.isAnyLocalAddress()
                        || address.isLoopbackAddress()
                        || address.isLinkLocalAddress()
                        || address.isSiteLocalAddress()) {
                    throw new IllegalArgumentException("Esa URL no está permitida.");
                }
            }
        } catch (UnknownHostException ex) {
            throw new IllegalArgumentException("No se pudo resolver el dominio de la URL.");
        }

        return trimmed;
    }

    private static boolean isBlockedHost(String hostLower) {
        return hostLower.equals("localhost")
                || hostLower.endsWith(".localhost")
                || hostLower.equals("0.0.0.0");
    }
}