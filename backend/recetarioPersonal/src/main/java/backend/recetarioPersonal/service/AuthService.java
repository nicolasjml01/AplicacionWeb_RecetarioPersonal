package backend.recetarioPersonal.service;

import org.springframework.stereotype.Service;
import backend.recetarioPersonal.model.User;
import backend.recetarioPersonal.view.LoginRequest;
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
        users.add(new User(1, "Nicolas", "user", "nicolasml01", "123qweASD", true));
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
     * Converts a User (internal model, has password) to UserDto (what we send to client, no password).
     */
    private UserDto toDto(User user) {
        return new UserDto(
                user.getId(),
                user.getName(),
                user.getUsername(),
                user.getEmail(),
                user.isVerified()
        );
    }
}
