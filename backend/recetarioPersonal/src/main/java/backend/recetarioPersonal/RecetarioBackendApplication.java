package backend.recetarioPersonal;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import backend.recetarioPersonal.config.MediaStorageProperties;


@SpringBootApplication
@EnableConfigurationProperties(MediaStorageProperties.class)
public class RecetarioBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(RecetarioBackendApplication.class, args);
	}

}
