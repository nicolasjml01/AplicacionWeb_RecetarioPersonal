import { useEffect, useMemo, useState } from "react";
import { assignCalendarEntry } from "../../api/calendar";
import { searchMealTypes } from "../../api/mealTypes";
import { getRecipeCategories } from "../../api/recipeCategories";
import { getRecipes } from "../../api/recipes";
import { buildRecipeSearchOptions } from "../../utils/buildRecipeSearchOptions";
import type { MealTypeDto } from "../../types/calendar";
import type { RecipeDto } from "../../types/recipes";
import { RECIPE_DEFAULT_COVER_PATH } from "../../constants/recipeAssets";
import { resolveMediaUrl } from "../../utils/mediaUrl";
import { getRecipeCoverMedia } from "../../utils/recipeCover";
import { ModalBackdrop, ModalPanel } from "../ui/ModalBackdrop";

type Props = {
  open: boolean;
  userId: number;
  planDate: string;
  onClose: () => void;
  /** Called after recipes are added; receives how many were added. */
  onAdded: (count: number) => void;
};

export function AddCalendarEntryModal({ open, userId, planDate, onClose, onAdded }: Props) {
  const [mealQuery, setMealQuery] = useState("");
  const [mealTypes, setMealTypes] = useState<MealTypeDto[]>([]);
  const [selectedMeal, setSelectedMeal] = useState<MealTypeDto | null>(null);
  const [customMealName, setCustomMealName] = useState("");

  const [recipeQuery, setRecipeQuery] = useState("");
  const [recipeTags, setRecipeTags] = useState<{ categoryId: number; name: string }[]>([]);
  const [recipes, setRecipes] = useState<RecipeDto[]>([]);
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<number[]>([]);

  const [loadingMeals, setLoadingMeals] = useState(false);
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const recipeById = useMemo(() => {
    const map = new Map<number, RecipeDto>();
    for (const r of recipes) map.set(r.recipeId, r);
    return map;
  }, [recipes]);

  useEffect(() => {
    if (!open) {
      setMealQuery("");
      setMealTypes([]);
      setSelectedMeal(null);
      setCustomMealName("");
      setRecipeQuery("");
      setRecipeTags([]);
      setRecipes([]);
      setSelectedRecipeIds([]);
      setError("");
      return;
    }
    let cancelled = false;
    setLoadingMeals(true);
    void searchMealTypes(userId, "")
      .then((list) => {
        if (!cancelled) setMealTypes(list);
      })
      .catch(() => {
        if (!cancelled) setMealTypes([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingMeals(false);
      });
    void getRecipeCategories(userId)
      .then((list) => {
        if (!cancelled) setRecipeTags(list);
      })
      .catch(() => {
        if (!cancelled) setRecipeTags([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, userId]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      setLoadingMeals(true);
      void searchMealTypes(userId, mealQuery)
        .then(setMealTypes)
        .catch(() => setMealTypes([]))
        .finally(() => setLoadingMeals(false));
    }, 250);
    return () => window.clearTimeout(t);
  }, [open, userId, mealQuery]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      setLoadingRecipes(true);
      const searchOpts = buildRecipeSearchOptions(recipeQuery, recipeTags);
      void getRecipes(userId, searchOpts)
        .then(setRecipes)
        .catch(() => setRecipes([]))
        .finally(() => setLoadingRecipes(false));
    }, 300);
    return () => window.clearTimeout(t);
  }, [open, userId, recipeQuery, recipeTags]);

  const mealLabel = useMemo(() => {
    if (selectedMeal) return selectedMeal.name;
    return customMealName.trim();
  }, [selectedMeal, customMealName]);

  const hasMealType = Boolean(selectedMeal || customMealName.trim());

  if (!open) return null;

  const pickMealByName = (name: string) => {
    const trimmed = name.trim();
    const found = mealTypes.find((m) => m.name.toLowerCase() === trimmed.toLowerCase());
    if (found) {
      setSelectedMeal(found);
      setCustomMealName("");
    } else {
      setSelectedMeal(null);
      setCustomMealName(trimmed);
    }
    setMealQuery(trimmed);
  };

  const toggleRecipe = (recipeId: number) => {
    setSelectedRecipeIds((prev) =>
      prev.includes(recipeId) ? prev.filter((id) => id !== recipeId) : [...prev, recipeId],
    );
    setError("");
  };

  const resolveMealPayload = () => {
    if (!selectedMeal && !customMealName.trim()) {
      throw new Error("Selecciona o escribe un tipo de comida.");
    }
    return {
      mealTypeId: selectedMeal?.mealTypeId ?? null,
      mealTypeName: selectedMeal ? null : customMealName.trim(),
    };
  };

  const handleAddSelected = async () => {
    if (selectedRecipeIds.length === 0) {
      setError("Selecciona al menos una receta.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const meal = resolveMealPayload();
      let added = 0;
      for (const recipeId of selectedRecipeIds) {
        await assignCalendarEntry(userId, {
          planDate,
          ...meal,
          recipeId,
        });
        added++;
      }
      onAdded(added);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron añadir las recetas.");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedTitles = selectedRecipeIds
    .map((id) => recipeById.get(id)?.title)
    .filter((t): t is string => Boolean(t));

  return (
    <ModalBackdrop onDismiss={onClose} disabled={submitting}>
      <ModalPanel
        className="create-recipe-dialog cal-add-dialog"
        aria-labelledby="add-cal-entry-title"
      >
        <button type="button" className="cal-modal__close" onClick={onClose} aria-label="Cerrar">
          ✕
        </button>
        <h2 id="add-cal-entry-title" className="create-recipe-dialog__title">
          Añadir comida
        </h2>
        <p className="create-recipe-dialog__msg">
          Elige el tipo de comida, marca las recetas y pulsa <strong>Añadir</strong>. Usa{" "}
          <strong>Cancelar</strong> para salir sin guardar.
        </p>

        <label className="form-group cal-search-field">
          <span>Tipo de comida</span>
          <div className="cal-search-field__row">
            <input
              className="form-input"
              value={mealQuery}
              onChange={(e) => {
                setMealQuery(e.target.value);
                setSelectedMeal(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && mealQuery.trim()) pickMealByName(mealQuery);
              }}
              placeholder="Desayuno, Merienda…"
            />
          </div>
          {loadingMeals && <p className="create-recipe-hint">Buscando tipos…</p>}
          {!loadingMeals && mealTypes.length > 0 && (
            <ul className="cal-picker-list cal-picker-list--compact" role="listbox">
              {mealTypes.map((m) => (
                <li key={m.mealTypeId}>
                  <button
                    type="button"
                    className={`cal-picker-list__item${selectedMeal?.mealTypeId === m.mealTypeId ? " cal-picker-list__item--active" : ""}`}
                    onClick={() => {
                      setSelectedMeal(m);
                      setCustomMealName("");
                      setMealQuery(m.name);
                    }}
                  >
                    {m.name}
                    {m.system && <span className="cal-picker-list__badge">Sistema</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {mealQuery.trim() &&
            !mealTypes.some((m) => m.name.toLowerCase() === mealQuery.trim().toLowerCase()) && (
              <button
                type="button"
                className="cal-picker-list__create"
                onClick={() => pickMealByName(mealQuery)}
              >
                Usar «{mealQuery.trim()}» (se creará si no existe)
              </button>
            )}
        </label>

        <label className={`form-group cal-search-field${!hasMealType ? " cal-search-field--disabled" : ""}`}>
          <span>
            Recetas{" "}
            {selectedRecipeIds.length > 0 && (
              <strong className="cal-add-dialog__count">({selectedRecipeIds.length} seleccionadas)</strong>
            )}
          </span>
          <div className="cal-search-field__row">
            <input
              className="form-input"
              value={recipeQuery}
              disabled={!hasMealType}
              onChange={(e) => setRecipeQuery(e.target.value)}
              placeholder={
                hasMealType
                  ? "Buscar receta o etiqueta (p. ej. Pastas)…"
                  : "Primero elige tipo de comida"
              }
            />
          </div>
          {!hasMealType && (
            <p className="create-recipe-hint">Selecciona un tipo de comida para buscar recetas.</p>
          )}
          {loadingRecipes && <p className="create-recipe-hint">Buscando recetas…</p>}
          {!loadingRecipes && hasMealType && recipes.length > 0 && (
            <ul className="cal-picker-list cal-picker-list--recipes cal-picker-list--compact" role="listbox">
              {recipes.map((r) => {
                const cover = getRecipeCoverMedia(r);
                const src = cover ? resolveMediaUrl(cover.url) : RECIPE_DEFAULT_COVER_PATH;
                const selected = selectedRecipeIds.includes(r.recipeId);
                return (
                  <li key={r.recipeId}>
                    <button
                      type="button"
                      className={`cal-picker-list__item cal-picker-list__item--recipe${selected ? " cal-picker-list__item--active" : ""}`}
                      onClick={() => toggleRecipe(r.recipeId)}
                    >
                      <span className="cal-picker-list__check" aria-hidden>
                        {selected ? "✓" : ""}
                      </span>
                      <img src={src} alt="" className="cal-picker-list__thumb" />
                      <span>{r.title}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </label>

        {hasMealType && selectedTitles.length > 0 && (
          <p className="create-recipe-hint cal-add-dialog__summary">
            En <strong>{mealLabel}</strong>: {selectedTitles.join(", ")}
          </p>
        )}

        {error && <p className="home-error">{error}</p>}

        <div className="create-recipe-dialog__actions cal-add-dialog__actions">
          <button type="button" className="btn btn--secondary" onClick={onClose} disabled={submitting}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={submitting || !hasMealType || selectedRecipeIds.length === 0}
            onClick={() => void handleAddSelected()}
          >
            {submitting
              ? "Añadiendo…"
              : selectedRecipeIds.length > 0
                ? `Añadir (${selectedRecipeIds.length})`
                : "Añadir"}
          </button>
        </div>
      </ModalPanel>
    </ModalBackdrop>
  );
}
