package backend.recetarioPersonal.view;

import jakarta.validation.constraints.NotNull;

public record ImportDayShoppingItemRequest(
        @NotNull(message = "ingredientId es obligatorio.")
        Long ingredientId,
        float quantity,
        String unitName
) {}