package backend.recetarioPersonal.view;

/**
 * Unit of measure data returned by the API (for dropdown, or inside shopping list item).
 */
public record UnitOfMeasureDto(
    Long unitId,
    String name,
    String symbol
) {}