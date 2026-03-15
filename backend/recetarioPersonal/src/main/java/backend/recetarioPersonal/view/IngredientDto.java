package backend.recetarioPersonal.view;

/**
 * Ingredient data returned by the API (search, or inside shopping list item).
 */
public record IngredientDto(
    Long ingredientId,
    String name,
    Long categoryId,
    String categoryName
) {}