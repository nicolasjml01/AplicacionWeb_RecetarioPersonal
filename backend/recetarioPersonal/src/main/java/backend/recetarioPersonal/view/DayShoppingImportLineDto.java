package backend.recetarioPersonal.view;

import java.util.List;

public record DayShoppingImportLineDto(
        String groupKey,
        IngredientDto ingredient,
        UnitOfMeasureDto unitOfMeasure,
        float suggestedQuantity,
        List<DayShoppingImportSourceDto> sources
) {}