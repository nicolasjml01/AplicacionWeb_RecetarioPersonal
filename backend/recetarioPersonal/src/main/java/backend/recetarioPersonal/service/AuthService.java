package backend.recetarioPersonal.service;

import backend.recetarioPersonal.model.RecipeCategory;
import backend.recetarioPersonal.model.User;
import backend.recetarioPersonal.repository.RecipeCategoryRepository;
import backend.recetarioPersonal.repository.UserRepository;
import backend.recetarioPersonal.service.util.PasswordValidator;
import backend.recetarioPersonal.view.LoginRequest;
import backend.recetarioPersonal.view.RegisterRequest;
import backend.recetarioPersonal.view.UserDto;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * Registration and credential checks against PostgreSQL (BCrypt hashes).
 * Does not issue JWTs; {@link backend.recetarioPersonal.controller.AuthController} does that after success.
 */
@Service
public class AuthService {
    private static final String DEFAULT_CATEGORY_NAME = "Sin categoría";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final RecipeCategoryRepository recipeCategoryRepository;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            RecipeCategoryRepository recipeCategoryRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.recipeCategoryRepository = recipeCategoryRepository;
    }

    /** Maps entity to API DTO (never exposes password). */
    private UserDto toDto(User user) {
        return new UserDto(
                user.getUserId(),
                user.getName(),
                user.getLastName(),
                user.getUsername(),
                user.getEmail(),
                user.isVerified());
    }

    /**
     * Validates username or email + password. Empty if credentials do not match.
     * Email verification is not enforced yet ({@code verified} flag reserved for a future flow).
     */
    public Optional<UserDto> login(LoginRequest request) {
        String login = request.login();
        Optional<User> byUsername = userRepository.findByUsername(login);
        Optional<User> byEmail = userRepository.findByEmail(login);
        return byUsername.or(() -> byEmail)
                .filter(u -> passwordEncoder.matches(request.password(), u.getPassword()))
                .map(this::toDto);
    }

    /** Loads a user by primary key for {@code GET /api/auth/me}. */
    public Optional<UserDto> findById(long userId) {
        return userRepository.findById(userId).map(this::toDto);
    }

    /**
     * Creates account, default recipe category "Sin categoría", and returns profile data.
     * Throws {@link IllegalArgumentException} with a Spanish message for the client on validation errors.
     */
    public UserDto register(RegisterRequest request) {
        String passwordError = PasswordValidator.validate(request.password());
        if (passwordError != null) {
            throw new IllegalArgumentException(passwordError);
        }
        if (userRepository.existsByUsernameIgnoreCase(request.username())) {
            throw new IllegalArgumentException("El nombre de usuario ya existe.");
        }
        if (userRepository.existsByEmailIgnoreCase(request.email())) {
            throw new IllegalArgumentException("El correo ya está registrado.");
        }

        User user = new User();
        user.setName(request.name());
        user.setLastName(request.lastName());
        user.setUsername(request.username());
        user.setEmail(request.email());
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setVerified(false);
        User saved = userRepository.save(user);

        RecipeCategory defaultCategory = new RecipeCategory();
        defaultCategory.setOwner(saved);
        defaultCategory.setName(DEFAULT_CATEGORY_NAME);
        recipeCategoryRepository.save(defaultCategory);

        return toDto(saved);
    }
}
