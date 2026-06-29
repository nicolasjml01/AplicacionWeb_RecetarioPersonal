package backend.recetarioPersonal.view;

import java.util.List;

/**
 * Recipe data extracted from a URL. Not persisted until the user saves in the editor.
 */
public record RecipeImportPreviewDto(
        String title,
        String sourceUrl,
        /** First image URL (same as {@code imageUrls[0]} when present). */
        String imageUrl,
        /** Recipe image URLs found on the page (Schema.org + Open Graph). */
        List<String> imageUrls,
        List<ImportedIngredientLineDto> ingredients,
        List<ImportedStepLineDto> steps,
        List<String> warnings
) {}