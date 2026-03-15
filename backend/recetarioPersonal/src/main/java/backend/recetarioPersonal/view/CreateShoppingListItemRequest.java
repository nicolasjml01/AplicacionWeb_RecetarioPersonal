package backend.recetarioPersonal.view;

/**
 * Request to add an item to the shopping list.
 * The ingredient is identified by name; if it does not exist, it is created with category "Own".
 */
public record CreateShoppingListItemRequest(
    String ingredientName,
    float quantity,
    String measurementUnit
) {}