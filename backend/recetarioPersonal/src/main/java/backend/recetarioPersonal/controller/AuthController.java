package backend.recetarioPersonal.controller;

import backend.recetarioPersonal.security.AuthCookieSupport;
import backend.recetarioPersonal.security.AuthenticatedUser;
import backend.recetarioPersonal.security.SecurityUtils;
import backend.recetarioPersonal.service.AuthService;
import backend.recetarioPersonal.view.AuthResponse;
import backend.recetarioPersonal.view.LoginRequest;
import backend.recetarioPersonal.view.RegisterRequest;
import backend.recetarioPersonal.view.UserDto;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.Optional;

/**
 * Public login/register; authenticated profile and logout.
 * On success, returns JWT in JSON and sets an HttpOnly cookie for {@code /media/**} browser requests.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;
    private final AuthCookieSupport authCookieSupport;

    public AuthController(AuthService authService, AuthCookieSupport authCookieSupport) {
        this.authService = authService;
        this.authCookieSupport = authCookieSupport;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @RequestBody LoginRequest request,
            HttpServletResponse response) {
        Optional<UserDto> user = authService.login(request);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(buildAuthResponse(user.get(), response));
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(
            @RequestBody @Valid RegisterRequest request,
            HttpServletResponse response) {
        try {
            UserDto user = authService.register(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(buildAuthResponse(user, response));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        }
    }

    /** Returns the profile for the user embedded in the current JWT. */
    @GetMapping("/me")
    public ResponseEntity<UserDto> me() {
        AuthenticatedUser current = SecurityUtils.requireCurrentUser();
        return authService.findById(current.userId())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
    }

    /** Clears the auth cookie; client should drop the stored access token too. */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletResponse response) {
        authCookieSupport.clearAuthCookie(response);
        return ResponseEntity.noContent().build();
    }

    private AuthResponse buildAuthResponse(UserDto user, HttpServletResponse response) {
        String token = authCookieSupport.issueToken(user.id(), user.username());
        authCookieSupport.attachAuthCookie(response, token);
        return new AuthResponse(user, token);
    }
}
