package backend.recetarioPersonal.view;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ImportRecipeFromUrlRequest(
        @NotBlank(message = "La URL es obligatoria.")
        @Size(max = 2048, message = "La URL es demasiado larga.")
        String url
) {}