package backend.recetarioPersonal.view;

public record DayShoppingImportSourceDto(
        Long calendarEntryId,
        Long recipeId,
        String recipeTitle,
        Long recipeIngredientId,
        float quantity
) {}