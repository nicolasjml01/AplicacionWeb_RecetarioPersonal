package backend.recetarioPersonal.view;

import java.util.List;

public record MealBlockDto(
        MealTypeDto mealType,
        int mealSortOrder,
        List<CalendarEntryDto> entries
) {}