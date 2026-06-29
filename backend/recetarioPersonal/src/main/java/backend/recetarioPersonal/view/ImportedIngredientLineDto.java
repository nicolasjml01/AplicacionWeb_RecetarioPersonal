package backend.recetarioPersonal.view;

/**
 * One ingredient line from an external recipe source (preview only).
 */
public record ImportedIngredientLineDto(
        String rawText,
        String ingredientName,
        Float quantity,
        String measurementUnit
) {}