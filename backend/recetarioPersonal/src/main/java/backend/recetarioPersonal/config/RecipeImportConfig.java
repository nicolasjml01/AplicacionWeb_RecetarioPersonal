package backend.recetarioPersonal.config;

import backend.recetarioPersonal.recipeimport.UrlValidator;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RecipeImportConfig {

    @Bean
    public UrlValidator urlValidator() {
        return new UrlValidator();
    }

    /** Used by SchemaOrgRecipeExtractor to parse JSON-LD (not auto-registered in this Boot setup). */
    @Bean
    public ObjectMapper recipeImportObjectMapper() {
        return new ObjectMapper();
    }
}