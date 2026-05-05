package backend.recetarioPersonal.view;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

public record CreateRecipeRequest(
        @NotBlank @Size(max = 255) String title,
        List<Long> categoryIds,
        List<@NotBlank @Size(max = 120) String> newCategoryNames,
        Boolean draft // true for draft, false for published
) {}