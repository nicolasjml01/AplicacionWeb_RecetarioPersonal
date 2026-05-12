package backend.recetarioPersonal.view;

import java.util.List;

/**
 * @param factor            multiplies quantities (default 1).
 * @param recipeIngredientIds if null, imports every recipe ingredient (legacy). If non-empty, only those rows.
 */
public record ImportRecipeIngredientsRequest(
        Float factor,
        List<Long> recipeIngredientIds
) {}
