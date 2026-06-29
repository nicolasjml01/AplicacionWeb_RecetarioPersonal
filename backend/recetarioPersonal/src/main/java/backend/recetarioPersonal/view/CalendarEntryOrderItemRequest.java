package backend.recetarioPersonal.view;

import jakarta.validation.constraints.NotNull;

public record CalendarEntryOrderItemRequest(
    @NotNull Long calendarEntryId,
    @NotNull Integer sortOrder
) {}
