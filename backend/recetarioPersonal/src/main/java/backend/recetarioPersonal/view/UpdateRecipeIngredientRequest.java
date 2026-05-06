package backend.recetarioPersonal.view;

import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record UpdateRecipeIngredientRequest(
    String ingredientName,
    @PositiveOrZero Float quantity,
    @Size(max = 80) String measurementUnit
) {}
