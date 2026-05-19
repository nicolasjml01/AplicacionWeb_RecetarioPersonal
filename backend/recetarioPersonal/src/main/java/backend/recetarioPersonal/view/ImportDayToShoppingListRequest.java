package backend.recetarioPersonal.view;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record ImportDayToShoppingListRequest(
        @NotEmpty(message = "Debes indicar al menos un ingrediente para importar.")
        List<@Valid ImportDayShoppingItemRequest> items
) {}