package backend.recetarioPersonal.view;

import java.time.LocalDate;
import java.util.List;

public record DayShoppingImportPreviewDto(
        LocalDate date,
        List<DayShoppingImportSelectedEntryDto> entries,
        List<DayShoppingImportLineDto> lines,
        List<String> warnings
) {}