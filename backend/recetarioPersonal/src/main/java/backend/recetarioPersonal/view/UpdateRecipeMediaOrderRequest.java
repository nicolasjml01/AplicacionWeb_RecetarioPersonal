package backend.recetarioPersonal.view;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;

/** All media IDs in this scope (global or one step), in desired display order (first = cover). */
public record UpdateRecipeMediaOrderRequest(@NotEmpty List<Long> mediaIdsInOrder) {}