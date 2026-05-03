package backend.recetarioPersonal.view;

import java.util.List;

public record RecipeStepDto(
        Long stepId,
        int stepNumber,
        String content,
        List<RecipeMediaDto> media
) {}