package backend.recetarioPersonal.security;

import backend.recetarioPersonal.config.JwtProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;

@Service
public class JwtService {

    private final JwtProperties properties;
    private final SecretKey signingKey;

    public JwtService(JwtProperties properties) {
        this.properties = properties;
        byte[] keyBytes = properties.secret().getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < 32) {
            throw new IllegalStateException(
                    "app.jwt.secret must be at least 32 characters (set APP_JWT_SECRET in .env)");
        }
        this.signingKey = Keys.hmacShaKeyFor(keyBytes);
    }

    public String createToken(long userId, String username) {
        Instant now = Instant.now();
        Instant expiry = now.plusSeconds(properties.expirationHours() * 3600);
        return Jwts.builder()
                .subject(Long.toString(userId))
                .claim("username", username)
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiry))
                .signWith(signingKey)
                .compact();
    }

    public Optional<AuthenticatedUser> parseToken(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(signingKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            long userId = Long.parseLong(claims.getSubject());
            String username = claims.get("username", String.class);
            return Optional.of(new AuthenticatedUser(userId, username != null ? username : ""));
        } catch (JwtException | NumberFormatException e) {
            return Optional.empty();
        }
    }

    public long expirationSeconds() {
        return properties.expirationHours() * 3600;
    }
}
