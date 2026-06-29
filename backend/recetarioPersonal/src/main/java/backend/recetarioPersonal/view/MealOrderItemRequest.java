package backend.recetarioPersonal.view;

import jakarta.validation.constraints.NotNull;

public record MealOrderItemRequest(
        @NotNull Long mealTypeId,
        @NotNull Integer sortOrder
) {}