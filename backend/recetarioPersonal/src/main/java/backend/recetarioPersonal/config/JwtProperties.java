package backend.recetarioPersonal.config;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "app.jwt")
public record JwtProperties(
        @NotBlank(message = "app.jwt.secret must be set (env APP_JWT_SECRET)")
        String secret,
        @Min(1)
        long expirationHours,
        @NotBlank
        String cookieName,
        boolean cookieSecure
) {}
