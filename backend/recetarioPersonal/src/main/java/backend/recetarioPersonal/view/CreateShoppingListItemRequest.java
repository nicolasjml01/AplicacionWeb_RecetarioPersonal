package backend.recetarioPersonal.view;

/**
 * Request to add an item to the shopping list.
 * The ingredient is identified by name; if it does not exist, it is created.
 * {@code ingredientCategoryId} null or omitted → category "Propios".
 * If set, must reference an existing row in {@code ingredient_categories}.
 */
public record CreateShoppingListItemRequest(
        String ingredientName,
        float quantity,
        String measurementUnit,
        Long ingredientCategoryId
) {}