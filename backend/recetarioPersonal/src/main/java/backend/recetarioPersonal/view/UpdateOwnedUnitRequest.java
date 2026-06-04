package backend.recetarioPersonal.view;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateOwnedUnitRequest(
        @NotBlank @Size(max = 255) String name,
        @Size(max = 20) String symbol
) {}
