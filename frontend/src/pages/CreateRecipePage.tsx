import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUserId } from "../auth/session";
import { addRecipeStep, createRecipe } from "../api/recipes";
import { getRecipeCategories } from "../api/recipeCategories";
import type { RecipeCategoryDto } from "../types/recipes";

const DEFAULT_CATEGORY = "Sin categoría";

type StepRow = { key: string; content: string };

function sortCategories(items: RecipeCategoryDto[]): RecipeCategoryDto[] {
  const copy = [...items];
  copy.sort((a, b) => {
    const aDefault = a.name.trim().toLowerCase() === DEFAULT_CATEGORY.toLowerCase();
    const bDefault = b.name.trim().toLowerCase() === DEFAULT_CATEGORY.toLowerCase();
    if (aDefault && !bDefault) return -1;
    if (!aDefault && bDefault) return 1;
    return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
  });
  return copy;
}

function newStep(): StepRow {
  return { key: crypto.randomUUID(), content: "" };
}

/**
 * Create recipe: title (required), optional category, optional steps; then navigate to detail.
 */
export function CreateRecipePage() {
  const navigate = useNavigate();
  const userId = getCurrentUserId();

  const [categories, setCategories] = useState<RecipeCategoryDto[]>([]);
  const [loadError, setLoadError] = useState("");
  const [loadingCats, setLoadingCats] = useState(true);

  const [title, setTitle] = useState("");
  const [categoryQuery, setCategoryQuery] = useState("");
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const categoryWrapRef = useRef<HTMLDivElement | null>(null);

  const [steps, setSteps] = useState<StepRow[]>(() => [newStep()]);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setLoadingCats(true);
    getRecipeCategories(userId)
      .then((cats) => setCategories(sortCategories(cats)))
      .catch((e) =>
        setLoadError(e instanceof Error ? e.message : "No se pudieron cargar las categorías."),
      )
      .finally(() => setLoadingCats(false));
  }, [userId]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!categoryWrapRef.current?.contains(e.target as Node)) {
        setCategoryDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const selectableCategories = useMemo(
    () => categories.filter((c) => c.name.trim().toLowerCase() !== DEFAULT_CATEGORY.toLowerCase()),
    [categories],
  );

  const categoryResults = useMemo(() => {
    const q = categoryQuery.trim().toLowerCase();
    if (!q) return selectableCategories;
    return selectableCategories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categoryQuery, selectableCategories]);

  const selectedCategoryName =
    selectedCategoryId != null
      ? categories.find((c) => c.categoryId === selectedCategoryId)?.name ?? null
      : null;

  const updateStep = (key: string, content: string) => {
    setSteps((prev) => prev.map((s) => (s.key === key ? { ...s, content } : s)));
  };

  const addStepRow = () => setSteps((prev) => [...prev, newStep()]);

  const removeStepRow = (key: string) => {
    setSteps((prev) => (prev.length <= 1 ? prev : prev.filter((s) => s.key !== key)));
  };

  const handleBack = () => navigate("/home");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    if (!userId) return;

    const t = title.trim();
    if (!t) {
      setSubmitError("El nombre de la receta es obligatorio.");
      return;
    }

    const nonEmptySteps = steps.map((s) => s.content.trim()).filter(Boolean);
    if (nonEmptySteps.length === 0) {
      setSubmitError("Añade al menos un paso con texto o rellena el primer paso.");
      return;
    }

    setSubmitting(true);
    try {
      const created = await createRecipe(userId, {
        title: t,
        categoryIds: selectedCategoryId != null ? [selectedCategoryId] : null,
      });

      for (let i = 0; i < nonEmptySteps.length; i++) {
        await addRecipeStep(userId, created.recipeId, {
          stepNumber: i + 1,
          content: nonEmptySteps[i]!,
        });
      }

      navigate(`/home/recipes/${created.recipeId}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "No se pudo crear la receta.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!userId) return <p className="home-error">No hay usuario en sesión.</p>;

  return (
    <section className="create-recipe-page">
      <header className="category-recipes-header create-recipe-header">
        <button type="button" className="category-recipes-back" onClick={handleBack} aria-label="Volver">
          ←
        </button>
        <h1 className="category-recipes-title">Nueva receta</h1>
      </header>

      {loadError && <p className="home-error">{loadError}</p>}

      <form className="create-recipe-form" onSubmit={handleSubmit}>
        <div className="create-recipe-gallery-hint" aria-hidden="true">
          <div className="create-recipe-gallery-hint__strip">
            <span />
            <span />
            <span />
            <span />
          </div>
          <p>
            Tras guardar podrás subir fotos y vídeos a la galería de la receta y a cada paso desde el
            detalle.
          </p>
        </div>

        <div className="create-recipe-card">
          <label className="create-recipe-label" htmlFor="recipe-title">
            Nombre de la receta <span className="create-recipe-required">*</span>
          </label>
          <input
            id="recipe-title"
            className="create-recipe-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Tortilla de patatas"
            maxLength={255}
            autoComplete="off"
          />
        </div>

        <div className="create-recipe-card">
          <span className="create-recipe-label">Categoría</span>
          <p className="create-recipe-hint">
            Opcional. Si no eliges ninguna, se guardará en «{DEFAULT_CATEGORY}».
          </p>

          {selectedCategoryName ? (
            <div className="create-recipe-chip-row">
              <span className="create-recipe-chip">
                <span className="create-recipe-chip__label">{selectedCategoryName}</span>
                <button
                  type="button"
                  className="create-recipe-chip__remove"
                  onClick={() => {
                    setSelectedCategoryId(null);
                    setCategoryQuery("");
                  }}
                  aria-label="Quitar categoría"
                >
                  ×
                </button>
              </span>
            </div>
          ) : (
            <div className="create-recipe-category-wrap" ref={categoryWrapRef}>
              <input
                className="create-recipe-input"
                value={categoryQuery}
                onChange={(e) => {
                  setCategoryQuery(e.target.value);
                  setCategoryDropdownOpen(true);
                }}
                onFocus={() => setCategoryDropdownOpen(true)}
                placeholder={loadingCats ? "Cargando categorías…" : "Buscar categoría…"}
                disabled={loadingCats || !!loadError}
                autoComplete="off"
              />
              {categoryDropdownOpen && !loadError && (
                <div className="create-recipe-category-dropdown" role="listbox" aria-label="Categorías">
                  {categoryResults.length === 0 ? (
                    <div className="create-recipe-category-empty">Sin coincidencias</div>
                  ) : (
                    categoryResults.map((c) => (
                      <button
                        key={c.categoryId}
                        type="button"
                        className="create-recipe-category-option"
                        onClick={() => {
                          setSelectedCategoryId(c.categoryId);
                          setCategoryQuery("");
                          setCategoryDropdownOpen(false);
                        }}
                      >
                        {c.name}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="create-recipe-card create-recipe-card--steps">
          <div className="create-recipe-steps-head">
            <span className="create-recipe-label">Pasos</span>
            <button type="button" className="create-recipe-add-step" onClick={addStepRow}>
              + Paso
            </button>
          </div>
          <p className="create-recipe-hint">Describe cada paso de la preparación. El primero no puede ir vacío al guardar.</p>

          <ol className="create-recipe-step-list">
            {steps.map((row, index) => (
              <li key={row.key} className="create-recipe-step-item">
                <div className="create-recipe-step-head">
                  <span className="create-recipe-step-num">{index + 1}</span>
                  {steps.length > 1 && (
                    <button
                      type="button"
                      className="create-recipe-step-remove"
                      onClick={() => removeStepRow(row.key)}
                      aria-label={`Eliminar paso ${index + 1}`}
                    >
                      Quitar
                    </button>
                  )}
                </div>
                <textarea
                  className="create-recipe-textarea"
                  value={row.content}
                  onChange={(e) => updateStep(row.key, e.target.value)}
                  placeholder="Escribe el paso…"
                  rows={4}
                />
              </li>
            ))}
          </ol>
        </div>

        {submitError && <p className="home-error create-recipe-error">{submitError}</p>}

        <div className="create-recipe-actions">
          <button type="button" className="btn btn--secondary" onClick={handleBack} disabled={submitting}>
            Cancelar
          </button>
          <button type="submit" className="btn btn--primary create-recipe-submit" disabled={submitting}>
            {submitting ? "Guardando…" : "Crear receta"}
          </button>
        </div>
      </form>
    </section>
  );
}
