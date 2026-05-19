package backend.recetarioPersonal.view;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record DayShoppingImportPreviewRequest(
        @NotEmpty(message = "Debes seleccionar al menos una comida del día.")
        List<Long> calendarEntryIds
) {}