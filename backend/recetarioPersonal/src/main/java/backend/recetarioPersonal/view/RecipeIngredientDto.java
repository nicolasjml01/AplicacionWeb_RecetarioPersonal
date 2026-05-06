package backend.recetarioPersonal.view;

public record RecipeIngredientDto(
    Long recipeIngredientId,
    IngredientDto ingredient,
    float quantity,
    UnitOfMeasureDto unitOfMeasure,
    int displayOrder
) {}
