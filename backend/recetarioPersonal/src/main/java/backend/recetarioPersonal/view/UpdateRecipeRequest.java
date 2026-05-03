package backend.recetarioPersonal.view;

import jakarta.validation.constraints.Size;
import java.util.List;

/** At least one field should be sent; null means "no change". */
public record UpdateRecipeRequest(
        @Size(min = 1, max = 255) String title,
        List<Long> categoryIds
) {}