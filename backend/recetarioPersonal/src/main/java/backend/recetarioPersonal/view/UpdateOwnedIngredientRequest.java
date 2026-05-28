package backend.recetarioPersonal.view;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Body for {@code PATCH /api/users/{userId}/ingredients/{ingredientId}} (user-owned rows only).
 * <p>
 * {@code ingredientCategoryId} must reference an existing row in {@code ingredient_categories}.
 * When {@code null}, the service assigns the default category {@code "Propios"}.
 * </p>
 */
public record UpdateOwnedIngredientRequest(
        @NotBlank(message = "El nombre del ingrediente es obligatorio")
        @Size(max = 255, message = "El nombre no puede superar 255 caracteres")
        String name,
        Long ingredientCategoryId
) {}
