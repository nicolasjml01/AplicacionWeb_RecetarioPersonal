package backend.recetarioPersonal.view;

import java.util.List;

public record RecipeDto(
    Long recipeId,
    Long ownerUserId,
    String title,
    String description,
    List<RecipeCategoryDto> categories,
    List<RecipeStepDto> steps,
    List<RecipeMediaDto> recipeLevelMedia
) {}