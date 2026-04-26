package backend.recetarioPersonal.view;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

public record CreateRecipeRequest(
    @NotBlank String title,
    String description,
    List<Long> categoryIds
) {}