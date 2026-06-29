package backend.recetarioPersonal.recipeimport;

import backend.recetarioPersonal.view.RecipeImportPreviewDto;
import java.util.Optional;

/**
 * Strategy for extracting recipe preview data from HTML of a recipe page.
 */
public interface RecipeExtractor {

    /**
     * @param html      page body
     * @param sourceUrl canonical URL requested by the user (for matching when several Recipe blocks exist)
     */
    Optional<RecipeImportPreviewDto> extract(String html, String sourceUrl);
}