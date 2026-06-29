package backend.recetarioPersonal.view;

import java.time.LocalDate;
import java.util.List;

public record CalendarRangeDayDto(
        LocalDate date,
        int entryCount,
        List<MealBlockDto> mealBlocks
) {}