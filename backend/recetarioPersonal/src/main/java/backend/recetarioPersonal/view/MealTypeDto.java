package backend.recetarioPersonal.view;

public record MealTypeDto(
        Long mealTypeId,
        String name,
        boolean system,
        int defaultSortOrder
) {}