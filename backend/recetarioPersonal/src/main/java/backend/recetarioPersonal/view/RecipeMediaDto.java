package backend.recetarioPersonal.view;

public record RecipeMediaDto(
        Long mediaId,
        Long recipeStepId,
        int displayOrder,
        String url,
        String contentType
) {}