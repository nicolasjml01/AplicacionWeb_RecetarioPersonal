package backend.recetarioPersonal.view;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record ImportRecipeIngredientItemRequest(
        @NotNull(message = "recipeIngredientId es obligatorio.")
        Long recipeIngredientId,
        @NotNull(message = "quantity es obligatorio.")
        @Positive(message = "quantity debe ser mayor que cero.")
        Float quantity,
        /** Optional override; blank uses the unit from the recipe row. */
        String unitName
) {}
