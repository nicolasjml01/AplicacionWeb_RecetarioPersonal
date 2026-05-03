package backend.recetarioPersonal.view;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

public record CreateRecipeRequest(
        @NotBlank @Size(max = 255) String title,
        List<Long> categoryIds
) {}