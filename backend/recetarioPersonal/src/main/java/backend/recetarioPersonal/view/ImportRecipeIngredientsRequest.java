package backend.recetarioPersonal.view;

import jakarta.validation.Valid;
import java.util.List;

/**
 * @param factor            multiplies quantities (legacy, ignored when {@code items} is non-empty).
 * @param recipeIngredientIds legacy selection without per-row quantity.
 * @param items               preferred: each row with explicit quantity to add to the shopping list.
 */
public record ImportRecipeIngredientsRequest(
        Float factor,
        List<Long> recipeIngredientIds,
        List<@Valid ImportRecipeIngredientItemRequest> items
) {}
