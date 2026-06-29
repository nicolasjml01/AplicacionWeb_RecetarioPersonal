package backend.recetarioPersonal.view;

public record DayShoppingImportSelectedEntryDto(
        Long calendarEntryId,
        Long recipeId,
        String recipeTitle,
        String coverImageUrl,
        String mealTypeName
) {}