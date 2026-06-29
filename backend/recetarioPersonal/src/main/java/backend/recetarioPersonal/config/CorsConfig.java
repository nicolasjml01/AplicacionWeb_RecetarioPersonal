package backend.recetarioPersonal.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Configuration
public class CorsConfig {

    private final CorsProperties corsProperties;
    private final String corsPatternsFromEnv;

    public CorsConfig(
            CorsProperties corsProperties,
            @Value("${APP_CORS_ALLOWED_ORIGIN_PATTERNS:}") String corsPatternsFromEnv) {
        this.corsProperties = corsProperties;
        this.corsPatternsFromEnv = corsPatternsFromEnv;
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        List<String> patterns = resolvePatterns();
        if (patterns.isEmpty()) {
            config.setAllowedOriginPatterns(List.of(
                    "http://localhost:*",
                    "http://127.0.0.1:*",
                    "http://192.168.*.*:*",
                    "http://10.*.*.*:*",
                    "http://172.16.*.*:*"
            ));
        } else {
            config.setAllowedOriginPatterns(patterns);
        }
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        source.registerCorsConfiguration("/media/**", config);
        return source;
    }

    private List<String> resolvePatterns() {
        if (corsPatternsFromEnv != null && !corsPatternsFromEnv.isBlank()) {
            return Arrays.stream(corsPatternsFromEnv.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .collect(Collectors.toList());
        }
        List<String> fromProps = corsProperties.allowedOriginPatterns();
        return fromProps != null ? fromProps : List.of();
    }
}
