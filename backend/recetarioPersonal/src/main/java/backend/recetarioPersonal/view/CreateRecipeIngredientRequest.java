package backend.recetarioPersonal.view;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record CreateRecipeIngredientRequest(
    @NotBlank @Size(max = 255) String ingredientName,
    @PositiveOrZero float quantity,
    @Size(max = 80) String measurementUnit
) {}
