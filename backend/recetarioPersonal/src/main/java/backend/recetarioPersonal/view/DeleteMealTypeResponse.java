package backend.recetarioPersonal.view;

public record DeleteMealTypeResponse(
        String message,
        int calendarEntriesRemoved,
        int layoutRowsRemoved
) {}