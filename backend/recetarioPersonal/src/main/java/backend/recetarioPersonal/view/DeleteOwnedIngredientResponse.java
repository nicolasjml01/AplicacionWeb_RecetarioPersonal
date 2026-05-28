package backend.recetarioPersonal.view;

public record DeleteOwnedIngredientResponse(
        String message,
        int shoppingListItemsRemoved,
        int recipeIngredientLinesRemoved,
        int recentEntriesRemoved
) {}
