package backend.recetarioPersonal.view;

import java.time.LocalDate;
import java.util.List;

public record DayPlanDto(
        LocalDate date,
        List<MealBlockDto> mealBlocks
) {}