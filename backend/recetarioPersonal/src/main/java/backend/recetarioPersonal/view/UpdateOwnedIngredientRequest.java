package backend.recetarioPersonal.view;

/**
 * Body for {@code PATCH /api/users/{userId}/ingredients/{ingredientId}} (user-owned rows only).
 * <p>
 * {@code ingredientCategoryId} must reference an existing row in {@code ingredient_categories}.
 * When {@code null} or omitted in JSON, the service assigns the default category {@code "Propios"}
 * (same rule as when creating a new user ingredient).
 * </p>
 * <p><b>Cliente:</b> conviene enviar siempre el id explícito de la categoría deseada (incluido el de
 * {@code "Propios"}) para no depender de un cuerpo vacío {@code {}} que deserializa a {@code null}
 * y reasigna a Propios sin que el usuario lo perciba como “sin cambios”.</p>
 */
public record UpdateOwnedIngredientRequest(Long ingredientCategoryId) {}
