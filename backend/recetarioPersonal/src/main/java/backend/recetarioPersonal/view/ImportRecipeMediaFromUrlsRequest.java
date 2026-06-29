package backend.recetarioPersonal.view;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;

public record ImportRecipeMediaFromUrlsRequest(
        @NotEmpty @Size(max = 3) List<String> urls
) {}
