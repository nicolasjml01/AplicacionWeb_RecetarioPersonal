package backend.recetarioPersonal.view;

/**
 * One item in the shopping list returned to the client.
 */
public record ShoppingListItemDto(
    Long shoppingListItemId,
    Long userId,
    IngredientDto ingredient,
    float quantity,
    UnitOfMeasureDto unitOfMeasure,
    boolean bought
) {}