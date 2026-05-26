package backend.recetarioPersonal.view;

import java.util.List;

/**
 * Recipe data extracted from a URL. Not persisted until the user saves in the editor.
 */
public record RecipeImportPreviewDto(
        String title,
        String sourceUrl,
        String imageUrl,
        List<ImportedIngredientLineDto> ingredients,
        List<ImportedStepLineDto> steps,
        List<String> warnings
) {}