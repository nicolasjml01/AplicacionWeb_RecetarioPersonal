package backend.recetarioPersonal.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final MediaStorageProperties mediaStorageProperties;

    public WebConfig(MediaStorageProperties mediaStorageProperties) {
        this.mediaStorageProperties = mediaStorageProperties;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String rootStr = mediaStorageProperties.root();
        if (rootStr == null || rootStr.isBlank()) {
            throw new IllegalStateException("app.media.root must be configured.");
        }
        Path root = Path.of(rootStr).toAbsolutePath().normalize();
        String location = root.toUri().toString();
        if (!location.endsWith("/")) {
            location = location + "/";
        }
        registry.addResourceHandler("/media/**").addResourceLocations(location);
    }
}