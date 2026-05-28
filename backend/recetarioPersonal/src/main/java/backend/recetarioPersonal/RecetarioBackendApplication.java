package backend.recetarioPersonal;

import backend.recetarioPersonal.config.CorsProperties;
import backend.recetarioPersonal.config.JwtProperties;
import backend.recetarioPersonal.config.MediaStorageProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.security.autoconfigure.UserDetailsServiceAutoConfiguration;

// Disable Spring Security's default generated user; we use JWT + AuthService instead.
@SpringBootApplication(exclude = { UserDetailsServiceAutoConfiguration.class })
@EnableConfigurationProperties({MediaStorageProperties.class, JwtProperties.class, CorsProperties.class})
public class RecetarioBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(RecetarioBackendApplication.class, args);
	}

}
