package backend.recetarioPersonal.view;

import jakarta.validation.constraints.Size;

public record UpdateRecipeStepRequest(
        Integer stepNumber,
        @Size(max = 20_000) String content
) {}