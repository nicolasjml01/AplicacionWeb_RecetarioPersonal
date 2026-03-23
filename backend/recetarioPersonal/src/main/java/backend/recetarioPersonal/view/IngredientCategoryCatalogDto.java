package backend.recetarioPersonal.view;

import java.util.List;

/**
 * One ingredient category with its ingredient list for catalog screens.
 */
public record IngredientCategoryCatalogDto(
    Long categoryId,
    String categoryName,
    List<IngredientDto> ingredients
) {}