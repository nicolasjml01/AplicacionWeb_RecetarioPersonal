package backend.recetarioPersonal.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import backend.recetarioPersonal.model.User;
import backend.recetarioPersonal.repository.UserRepository;
import backend.recetarioPersonal.service.util.PasswordValidator;
import backend.recetarioPersonal.view.LoginRequest;
import backend.recetarioPersonal.view.RegisterRequest;
import backend.recetarioPersonal.view.UserDto;

import java.util.Optional;

/**
 * Service for authentication operations. Holds users in memory and checks login.
 */
@Service
public class AuthService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    
    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
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
        String login = request.login();
        Optional<User> byUsername = userRepository.findByUsername(login);
        Optional<User> byEmail = userRepository.findByEmail(login);
        return byUsername.or(() -> byEmail)
            .filter(u -> passwordEncoder.matches(request.password(), u.getPassword()))
            //.filter(User::isVerified)
            .map(this::toDto);
    }

    /**
     * Registers a new user.
     * Returns the user data (without password) if successful, or throws an exception if not.
     */
    public UserDto register(RegisterRequest request) {
        // Checks if the password is valid
        String passwordError = PasswordValidator.validate(request.password());
        if (passwordError != null) {
            throw new IllegalArgumentException(passwordError);
        }
        // Checks if the username already exists
        if (userRepository.existsByUsernameIgnoreCase(request.username())) {
            throw new IllegalArgumentException("Username already exists.");
        }
        // Checks if the email is already registered
        if (userRepository.existsByEmailIgnoreCase(request.email())) {
            throw new IllegalArgumentException("Email already registered.");
        }
       // Creates the user
        User user = new User();
        user.setName(request.name());
        user.setLastName(request.lastName());
        user.setUsername(request.username());
        user.setEmail(request.email());
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setVerified(false);
        // Saves the user in the database
        User saved = userRepository.save(user);
        return toDto(saved);
    }

}
