package backend.recetarioPersonal.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Ensures {@code /api/users/{userId}/...} and {@code /media/{userId}/...} only match the authenticated user.
 */
@Component
public class PathUserAuthorizationFilter extends OncePerRequestFilter {

    private static final Pattern API_USER_PATH =
            Pattern.compile("^/api/users/(\\d+)(?:/.*)?$");
    private static final Pattern MEDIA_USER_PATH =
            Pattern.compile("^/media/(\\d+)(?:/.*)?$");

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof AuthenticatedUser user)) {
            filterChain.doFilter(request, response);
            return;
        }

        String path = request.getRequestURI();
        Long pathUserId = extractUserId(path);
        if (pathUserId != null && pathUserId != user.userId()) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding(StandardCharsets.UTF_8.name());
            response.getWriter().write("{\"message\":\"No puedes acceder a datos de otro usuario.\",\"status\":403}");
            return;
        }
        filterChain.doFilter(request, response);
    }

    private static Long extractUserId(String path) {
        Matcher api = API_USER_PATH.matcher(path);
        if (api.matches()) {
            return Long.parseLong(api.group(1));
        }
        Matcher media = MEDIA_USER_PATH.matcher(path);
        if (media.matches()) {
            return Long.parseLong(media.group(1));
        }
        return null;
    }
}
