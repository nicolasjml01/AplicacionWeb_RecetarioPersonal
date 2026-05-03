package backend.recetarioPersonal.view;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateRecipeStepRequest(
        @Min(value = 1, message = "El número de paso debe ser al menos 1.")
        int stepNumber,
        @NotBlank(message = "El contenido del paso es obligatorio.")
        @Size(max = 20_000, message = "El contenido del paso es demasiado largo.")
        String content
) {}