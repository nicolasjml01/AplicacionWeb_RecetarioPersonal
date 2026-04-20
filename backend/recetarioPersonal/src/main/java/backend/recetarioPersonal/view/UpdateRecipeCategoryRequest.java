package backend.recetarioPersonal.view;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateRecipeCategoryRequest(
        @NotBlank(message = "Category name is required")
        @Size(max = 120, message = "Category name must be <= 120 chars")
        String name
) {}