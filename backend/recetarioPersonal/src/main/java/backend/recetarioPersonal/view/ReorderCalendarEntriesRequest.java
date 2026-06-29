package backend.recetarioPersonal.view;

import java.util.List;

import jakarta.validation.constraints.NotEmpty;

public record ReorderCalendarEntriesRequest(
    @NotEmpty List<CalendarEntryOrderItemRequest> items
) {}
