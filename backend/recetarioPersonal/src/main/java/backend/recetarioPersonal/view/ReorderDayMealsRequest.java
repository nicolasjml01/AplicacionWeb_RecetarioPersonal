package backend.recetarioPersonal.view;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record ReorderDayMealsRequest(
        @NotEmpty List<MealOrderItemRequest> items
) {}