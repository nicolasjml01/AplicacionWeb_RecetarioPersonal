package backend.recetarioPersonal.view;

/**
 * Ingredient data returned by the API (search, or inside shopping list item).
 * {@code imageUrl} is null when the ingredient has no custom image (catalog uses optional image too).
 */
public record IngredientDto(
        Long ingredientId,
        String name,
        Long categoryId,
        String categoryName,
        String imageUrl
) {}