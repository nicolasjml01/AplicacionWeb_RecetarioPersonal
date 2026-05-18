package backend.recetarioPersonal.view;

import java.time.LocalDate;
import java.util.List;

public record CalendarRangeDto(
        LocalDate from,
        LocalDate to,
        List<CalendarRangeDayDto> days
) {}