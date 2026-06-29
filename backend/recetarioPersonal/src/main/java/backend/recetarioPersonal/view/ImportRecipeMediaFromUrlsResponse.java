package backend.recetarioPersonal.view;

import java.util.List;

public record ImportRecipeMediaFromUrlsResponse(
        List<RecipeMediaDto> media,
        List<String> warnings
) {}
