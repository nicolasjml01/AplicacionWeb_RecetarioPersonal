package backend.recetarioPersonal.service;

import org.springframework.stereotype.Service;
import backend.recetarioPersonal.model.User;
import backend.recetarioPersonal.service.util.PasswordValidator;
import backend.recetarioPersonal.view.LoginRequest;
import backend.recetarioPersonal.view.RegisterRequest;
import backend.recetarioPersonal.view.UserDto;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Service for authentication operations. Holds users in memory and checks login.
 */
@Service
public class AuthService {
    private final List<User> users = new ArrayList<>();

    public AuthService() {
        users.add(new User(1, "Nicolas", "Martin", "user", "nicolasml01", "123qweASD", true));
    }

    /**
     * Converts a User (internal model, has password) to UserDto (what we send to client, no password).
     */
    private UserDto toDto(User user) {
        return new UserDto(
                user.getId(),
                user.getName(),
                user.getLastName(),
                user.getUsername(),
                user.getEmail(),
                user.isVerified()
        );
    }

    /**
     * Tries to log in with the given username and password.
     * Returns the user data (without password) if found and verified, or empty if not.
     */
    public Optional<UserDto> login(LoginRequest request) {
        return users.stream()
                .filter(u -> u.getUsername().equals(request.username()) && u.getPassword().equals(request.password()))
                .filter(User::isVerified)
                .findFirst()
                .map(this::toDto);
    }

    /**
     * Registers a new user.
     * Returns the user data (without password) if successful, or throws an exception if not.
     */
    public UserDto register(RegisterRequest request) {
        String passwordError = PasswordValidator.validate(request.password());
        if (passwordError != null) {
            throw new IllegalArgumentException(passwordError);
        }
        boolean usernameExists = users.stream()
                .anyMatch(u -> u.getUsername().equalsIgnoreCase(request.username()));
        if (usernameExists) {
            throw new IllegalArgumentException("Username already exists.");
        }
        boolean emailExists = users.stream()
                .anyMatch(u -> u.getEmail().equalsIgnoreCase(request.email()));
        if (emailExists) {
            throw new IllegalArgumentException("Email already registered.");
        }
        long newId = users.stream()
                .mapToLong(User::getId)
                .max()
                .orElse(0L) + 1;
        User user = new User(
                newId,
                request.name(),
                request.lastName(),
                request.username(),
                request.email(),
                request.password(),
                false
        );
        users.add(user);
        return toDto(user);
    }

}
