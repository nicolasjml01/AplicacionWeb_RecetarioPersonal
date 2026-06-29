package backend.recetarioPersonal.view;

public record DeleteOwnedUnitResponse(
        String message,
        int recipeIngredientLinesCleared,
        int shoppingListItemsCleared
) {}
