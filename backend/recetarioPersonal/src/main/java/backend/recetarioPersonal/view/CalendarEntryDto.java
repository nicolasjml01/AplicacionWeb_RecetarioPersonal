package backend.recetarioPersonal.view;

import java.time.LocalDate;

public record CalendarEntryDto(
        Long calendarEntryId,
        Long ownerUserId,
        LocalDate planDate,
        MealTypeDto mealType,
        Long recipeId,
        String recipeTitle,
        String coverImageUrl,
        int recipeSortOrder
) {}