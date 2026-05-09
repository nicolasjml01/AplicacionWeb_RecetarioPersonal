package backend.recetarioPersonal;

import backend.recetarioPersonal.config.MediaStorageProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.security.autoconfigure.UserDetailsServiceAutoConfiguration;

// Auth is handled by AuthService (BCrypt), so we disable Spring Security's
// default in-memory user (otherwise it logs a random password at startup).
@SpringBootApplication(exclude = { UserDetailsServiceAutoConfiguration.class })
@EnableConfigurationProperties(MediaStorageProperties.class)
public class RecetarioBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(RecetarioBackendApplication.class, args);
	}

}
