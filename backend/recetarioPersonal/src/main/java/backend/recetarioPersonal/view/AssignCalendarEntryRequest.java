package backend.recetarioPersonal.view;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record AssignCalendarEntryRequest(
        @NotNull LocalDate planDate,
        Long mealTypeId,
        String mealTypeName,
        @NotNull Long recipeId
) {}