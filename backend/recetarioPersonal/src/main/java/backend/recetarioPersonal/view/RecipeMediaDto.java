package backend.recetarioPersonal.view;

public record RecipeMediaDto(
        Long mediaId,
        Long recipeStepId,
        String url,
        String contentType
) {}