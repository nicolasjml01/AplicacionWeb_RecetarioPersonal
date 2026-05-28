package backend.recetarioPersonal.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import backend.recetarioPersonal.model.User;

/** Persistence for {@link User} accounts. */
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    boolean existsByUsernameIgnoreCase(String username);
    boolean existsByEmailIgnoreCase(String email);
}
