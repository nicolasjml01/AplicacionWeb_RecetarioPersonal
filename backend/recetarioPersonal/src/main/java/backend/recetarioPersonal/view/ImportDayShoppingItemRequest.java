package backend.recetarioPersonal.view;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ImportDayShoppingItemRequest(
        @NotBlank(message = "groupKey es obligatorio (mismo valor que en la vista previa).")
        String groupKey,
        @NotNull(message = "ingredientId es obligatorio.")
        Long ingredientId,
        float quantity,
        String unitName
) {}