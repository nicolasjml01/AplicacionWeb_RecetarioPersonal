package backend.recetarioPersonal.view;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateMealTypeRequest(
        @NotBlank(message = "El nombre del tipo de comida es obligatorio")
        @Size(max = 120, message = "El nombre no puede superar 120 caracteres")
        String name
) {}