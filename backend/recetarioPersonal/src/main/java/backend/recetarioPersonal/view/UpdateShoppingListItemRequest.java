package backend.recetarioPersonal.view;

/**
 * Request to update a shopping list item (e.g. mark as bought, change quantity).
 * All fields optional; only provided fields are updated.
 */
public record UpdateShoppingListItemRequest(
    Boolean bought,
    Float quantity,
    String measurementUnit
) {}