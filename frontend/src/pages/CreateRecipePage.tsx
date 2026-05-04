import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getCurrentUserId } from "../auth/session";
import {
  addRecipeStep,
  createRecipe,
  deleteRecipeStep,
  getRecipe,
  patchRecipe,
  patchRecipeStep,
  publishRecipe,
} from "../api/recipes";
import { deleteRecipeMedia, reorderRecipeMedia, uploadRecipeMedia } from "../api/recipeMedia";
import { getRecipeCategories } from "../api/recipeCategories";
import type { RecipeCategoryDto, RecipeDto, RecipeMediaDto } from "../types/recipes";
import { ConfirmDialog } from "../components/recipe/editor/ConfirmDialog";
import { MediaStripEditor } from "../components/recipe/editor/MediaStripEditor";
import { RecipePreviewModal } from "../components/recipe/editor/RecipePreviewModal";

const DEFAULT_CATEGORY = "Sin categoría";
const DRAFT_INIT_TITLE = "Receta nueva";

const RESERVED_TITLES = new Set(["receta nueva", "borrador", "sin título", "nueva receta"]);

function isGenericDraftTitle(t: string): boolean {
  const x = t.trim().toLowerCase();
  return x.length > 0 && RESERVED_TITLES.has(x);
}

function isValidPublishTitle(t: string): boolean {
  const x = t.trim().toLowerCase();
  return x.length >= 2 && !RESERVED_TITLES.has(x);
}

type StepRow = {
  key: string;
  stepId?: number;
  stepNumber: number;
  content: string;
  media: RecipeMediaDto[];
};

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

function applyStepsFromRecipe(sortedSteps: RecipeDto["steps"]): StepRow[] {
  return sortedSteps.map((s) => ({
    key: String(s.stepId),
    stepId: s.stepId,
    stepNumber: s.stepNumber,
    content: s.content.trim() === "." ? "" : s.content,
    media: [...s.media].sort((a, b) => a.displayOrder - b.displayOrder),
  }));
}

export function CreateRecipePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const userId = getCurrentUserId();

  const globalFileRef = useRef<HTMLInputElement>(null);
  const stepFileRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<RecipeCategoryDto[]>([]);
  const [loadError, setLoadError] = useState("");
  const [loadingCats, setLoadingCats] = useState(true);

  const [booting, setBooting] = useState(true);
  const [recipeId, setRecipeId] = useState<number | null>(null);

  const [title, setTitle] = useState("");
  const [globalMedia, setGlobalMedia] = useState<RecipeMediaDto[]>([]);
  const [uploadingGlobal, setUploadingGlobal] = useState(false);

  const [categoryQuery, setCategoryQuery] = useState("");
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const categoryWrapRef = useRef<HTMLDivElement | null>(null);

  const [steps, setSteps] = useState<StepRow[]>([]);
  const [submitError, setSubmitError] = useState("");
  const [previewError, setPreviewError] = useState("");
  const [publishing, setPublishing] = useState(false);

  const [dirty, setDirty] = useState(false);
  const [backDialogOpen, setBackDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [stepUploadTarget, setStepUploadTarget] = useState<number | null>(null);

  const draftIdParam = searchParams.get("draftId");

  const previewCategories = useMemo(() => {
    if (selectedCategoryId == null) return [];
    const c = categories.find((x) => x.categoryId === selectedCategoryId);
    return c ? [c] : [];
  }, [categories, selectedCategoryId]);

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

  const applyRecipe = useCallback((r: RecipeDto) => {
    setTitle(r.title);
    setGlobalMedia([...r.recipeLevelMedia].sort((a, b) => a.displayOrder - b.displayOrder));
    const nonDefault = r.categories.find(
      (c) => c.name.trim().toLowerCase() !== DEFAULT_CATEGORY.toLowerCase(),
    );
    setSelectedCategoryId(nonDefault?.categoryId ?? null);
    const sorted = [...r.steps].sort((a, b) => a.stepNumber - b.stepNumber);
    setSteps(applyStepsFromRecipe(sorted));
  }, []);

  const refreshRecipe = useCallback(async () => {
    if (!userId || recipeId == null) return;
    const r = await getRecipe(userId, recipeId);
    applyRecipe(r);
  }, [userId, recipeId, applyRecipe]);

  const bootstrapDraft = useCallback(async () => {
    if (!userId) return;
    const parsed = draftIdParam != null && draftIdParam !== "" ? Number(draftIdParam) : NaN;

    if (draftIdParam && !Number.isFinite(parsed)) {
      setLoadError("Identificador de borrador no válido.");
      setBooting(false);
      return;
    }

    if (Number.isFinite(parsed)) {
      setBooting(true);
      try {
        const r = await getRecipe(userId, parsed);
        if (r.publicationState !== "DRAFT") {
          navigate(`/home/recipes/${parsed}`, { replace: true });
          return;
        }
        setRecipeId(parsed);
        applyRecipe(r);
        const sorted = [...r.steps].sort((a, b) => a.stepNumber - b.stepNumber);
        if (sorted.length === 0) {
          const created = await addRecipeStep(userId, parsed, { stepNumber: 1, content: "." });
          setSteps([
            {
              key: String(created.stepId),
              stepId: created.stepId,
              stepNumber: created.stepNumber,
              content: "",
              media: [],
            },
          ]);
        }
        setDirty(false);
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : "No se pudo cargar el borrador.");
      } finally {
        setBooting(false);
      }
      return;
    }

    const lockKey = `recetario_draft_init_${userId}`;
    if (sessionStorage.getItem(lockKey)) {
      setBooting(false);
      return;
    }
    sessionStorage.setItem(lockKey, "1");
    setBooting(true);
    try {
      const created = await createRecipe(userId, {
        title: DRAFT_INIT_TITLE,
        categoryIds: null,
        draft: true,
      });
      sessionStorage.removeItem(lockKey);
      navigate(`/home/recipes/new?draftId=${created.recipeId}`, { replace: true });
    } catch (e) {
      sessionStorage.removeItem(lockKey);
      setLoadError(e instanceof Error ? e.message : "No se pudo crear el borrador.");
      setBooting(false);
    }
  }, [userId, draftIdParam, navigate, applyRecipe]);

  useEffect(() => {
    void bootstrapDraft();
  }, [bootstrapDraft]);

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

  const persistTitle = async (value: string) => {
    if (!userId || recipeId == null) return;
    const t = value.trim();
    if (!t) return;
    try {
      await patchRecipe(userId, recipeId, { title: t });
    } catch {
      /* silent */
    }
  };

  const persistCategory = async (categoryId: number | null) => {
    if (!userId || recipeId == null) return;
    try {
      await patchRecipe(userId, recipeId, {
        categoryIds: categoryId != null ? [categoryId] : [],
      });
    } catch {
      /* silent */
    }
  };

  const persistStepContent = async (row: StepRow, content: string) => {
    if (!userId || recipeId == null || row.stepId == null) return;
    const trimmed = content.trim();
    const toSend = trimmed.length === 0 ? "." : trimmed;
    try {
      await patchRecipeStep(userId, recipeId, row.stepId, { content: toSend });
    } catch {
      /* silent */
    }
  };

  const updateStep = (key: string, content: string) => {
    setDirty(true);
    setSteps((prev) => prev.map((s) => (s.key === key ? { ...s, content } : s)));
  };

  const addStepRow = async () => {
    if (!userId || recipeId == null) return;
    const nextNum = steps.length ? Math.max(...steps.map((s) => s.stepNumber)) + 1 : 1;
    try {
      const created = await addRecipeStep(userId, recipeId, { stepNumber: nextNum, content: "." });
      setDirty(true);
      setSteps((prev) => [
        ...prev,
        {
          key: String(created.stepId),
          stepId: created.stepId,
          stepNumber: created.stepNumber,
          content: "",
          media: [],
        },
      ]);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "No se pudo añadir el paso.");
    }
  };

  const removeStepRow = async (row: StepRow) => {
    if (steps.length <= 1) return;
    if (!userId || recipeId == null || row.stepId == null) {
      setSteps((prev) => (prev.length <= 1 ? prev : prev.filter((s) => s.key !== row.key)));
      return;
    }
    try {
      setDirty(true);
      await deleteRecipeStep(userId, recipeId, row.stepId);
      setSteps((prev) => prev.filter((s) => s.key !== row.key));
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "No se pudo eliminar el paso.");
    }
  };

  const handleGlobalReorder = async (from: number, to: number) => {
    if (!userId || recipeId == null) return;
    const list = [...globalMedia].sort((a, b) => a.displayOrder - b.displayOrder);
    const [m] = list.splice(from, 1);
    list.splice(to, 0, m);
    setDirty(true);
    try {
      await reorderRecipeMedia(
        userId,
        recipeId,
        list.map((x) => x.mediaId),
        undefined,
      );
      await refreshRecipe();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "No se pudo reordenar.");
    }
  };

  const handleGlobalRemove = async (mediaId: number) => {
    if (!userId || recipeId == null) return;
    setDirty(true);
    try {
      await deleteRecipeMedia(userId, recipeId, mediaId);
      await refreshRecipe();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "No se pudo eliminar el archivo.");
    }
  };

  const handleGlobalFiles = async (files: FileList | null) => {
    if (!userId || recipeId == null || !files?.length) return;
    setUploadingGlobal(true);
    setDirty(true);
    setSubmitError("");
    try {
      for (let i = 0; i < files.length; i++) {
        await uploadRecipeMedia(userId, recipeId, files[i]!);
      }
      await refreshRecipe();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Error al subir archivos.");
    } finally {
      setUploadingGlobal(false);
      if (globalFileRef.current) globalFileRef.current.value = "";
    }
  };

  const handleStepReorder = async (stepId: number, from: number, to: number) => {
    if (!userId || recipeId == null) return;
    const row = steps.find((s) => s.stepId === stepId);
    if (!row) return;
    const list = [...row.media].sort((a, b) => a.displayOrder - b.displayOrder);
    const [m] = list.splice(from, 1);
    list.splice(to, 0, m);
    setDirty(true);
    try {
      await reorderRecipeMedia(
        userId,
        recipeId,
        list.map((x) => x.mediaId),
        stepId,
      );
      await refreshRecipe();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "No se pudo reordenar.");
    }
  };

  const handleStepRemove = async (stepId: number, mediaId: number) => {
    if (!userId || recipeId == null) return;
    setDirty(true);
    try {
      await deleteRecipeMedia(userId, recipeId, mediaId);
      await refreshRecipe();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "No se pudo eliminar.");
    }
  };

  const handleStepFiles = async (stepId: number, files: FileList | null) => {
    if (!userId || recipeId == null || !files?.length) return;
    setDirty(true);
    setSubmitError("");
    try {
      for (let i = 0; i < files.length; i++) {
        await uploadRecipeMedia(userId, recipeId, files[i]!, stepId);
      }
      await refreshRecipe();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Error al subir archivos del paso.");
    } finally {
      if (stepFileRef.current) stepFileRef.current.value = "";
      setStepUploadTarget(null);
    }
  };

  const openStepPicker = (stepId: number) => {
    setStepUploadTarget(stepId);
    requestAnimationFrame(() => stepFileRef.current?.click());
  };

  const goHome = () => navigate("/home");

  const handleBackClick = () => {
    if (dirty) setBackDialogOpen(true);
    else goHome();
  };

  const validateBeforePreview = (): string | null => {
    if (!title.trim()) return "Escribe un nombre para la receta.";
    if (!isValidPublishTitle(title)) return "El nombre debe ser más descriptivo (evita solo «Receta nueva» o similares).";
    const hasStep = steps.some((s) => s.content.trim().length > 0);
    if (!hasStep) return "Añade al menos un paso con texto.";
    return null;
  };

  const openPreview = () => {
    setPreviewError("");
    const err = validateBeforePreview();
    if (err) {
      setSubmitError(err);
      return;
    }
    setSubmitError("");
    setPreviewOpen(true);
  };

  const runPublish = async () => {
    if (!userId || recipeId == null) return;
    const err = validateBeforePreview();
    if (err) {
      setPreviewError(err);
      return;
    }
    setPublishing(true);
    setPreviewError("");
    try {
      await persistTitle(title);
      for (const s of steps) {
        if (s.stepId != null) await persistStepContent(s, s.content);
      }
      await publishRecipe(userId, recipeId);
      setPreviewOpen(false);
      navigate(`/home/recipes/${recipeId}`);
    } catch (e) {
      setPreviewError(e instanceof Error ? e.message : "No se pudo publicar.");
    } finally {
      setPublishing(false);
    }
  };

  if (!userId) return <p className="home-error">No hay usuario en sesión.</p>;

  return (
    <section className="create-recipe-page">
      <header className="category-recipes-header create-recipe-header">
        <button type="button" className="category-recipes-back" onClick={handleBackClick} aria-label="Volver">
          ←
        </button>
        <h1 className="category-recipes-title">Nueva receta</h1>
      </header>

      {loadError && <p className="home-error">{loadError}</p>}
      {booting && <p className="create-recipe-hint">Preparando tu receta…</p>}

      <input
        ref={globalFileRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="create-recipe-file-input"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => void handleGlobalFiles(e.target.files)}
      />
      <input
        ref={stepFileRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="create-recipe-file-input"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => {
          if (stepUploadTarget != null) void handleStepFiles(stepUploadTarget, e.target.files);
        }}
      />

      {!booting && recipeId != null && (
        <div className="create-recipe-form">
          <div className="create-recipe-card create-recipe-card--gallery">
            <span className="create-recipe-label">Galería de la receta</span>
            <p className="create-recipe-hint">
              Sube fotos o vídeos y ordénalas arrastrando. La primera será la portada en listados.
            </p>
            <MediaStripEditor
              media={[...globalMedia].sort((a, b) => a.displayOrder - b.displayOrder)}
              disabled={uploadingGlobal}
              onAdd={() => globalFileRef.current?.click()}
              onRemove={handleGlobalRemove}
              onReorder={handleGlobalReorder}
            />
            {uploadingGlobal && <p className="create-recipe-hint">Subiendo archivos…</p>}
          </div>

          <div className="create-recipe-card">
            <label className="create-recipe-label" htmlFor="recipe-title">
              Nombre de la receta <span className="create-recipe-required">*</span>
            </label>
            <input
              id="recipe-title"
              className="create-recipe-input"
              value={isGenericDraftTitle(title) ? "" : title}
              onChange={(e) => {
                setDirty(true);
                setTitle(e.target.value);
              }}
              onFocus={() => {
                if (isGenericDraftTitle(title)) {
                  setTitle("");
                  setDirty(true);
                }
              }}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (!v) {
                  setTitle(DRAFT_INIT_TITLE);
                  void persistTitle(DRAFT_INIT_TITLE);
                } else {
                  setTitle(v);
                  void persistTitle(v);
                }
              }}
              placeholder="Obligatorio — ej. Tortilla de patatas"
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
                      setDirty(true);
                      setSelectedCategoryId(null);
                      setCategoryQuery("");
                      void persistCategory(null);
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
                    setDirty(true);
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
                            setDirty(true);
                            setSelectedCategoryId(c.categoryId);
                            setCategoryQuery("");
                            setCategoryDropdownOpen(false);
                            void persistCategory(c.categoryId);
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
              <button type="button" className="create-recipe-add-step" onClick={() => void addStepRow()}>
                + Paso
              </button>
            </div>
            <p className="create-recipe-hint">
              Texto que crece con el contenido. Usa el icono 📷 para adjuntar fotos o vídeos a cada paso.
            </p>

            <ol className="create-recipe-step-list">
              {steps.map((row, index) => (
                <li key={row.key} className="create-recipe-step-item">
                  <div className="create-recipe-step-head">
                    <span className="create-recipe-step-num">{index + 1}</span>
                    <div className="create-recipe-step-actions">
                      {row.stepId != null && (
                        <button
                          type="button"
                          className="create-recipe-step-attach"
                          onClick={() => openStepPicker(row.stepId!)}
                          aria-label="Añadir imagen o vídeo a este paso"
                          title="Biblioteca / archivos"
                        >
                          📷
                        </button>
                      )}
                      {steps.length > 1 && (
                        <button
                          type="button"
                          className="create-recipe-step-remove"
                          onClick={() => void removeStepRow(row)}
                          aria-label={`Eliminar paso ${index + 1}`}
                        >
                          Quitar
                        </button>
                      )}
                    </div>
                  </div>
                  {row.stepId != null && row.media.length > 0 && (
                    <div className="create-recipe-step-media">
                      <MediaStripEditor
                        dense
                        hideHint
                        media={row.media}
                        addLabel="Añadir"
                        onAdd={() => openStepPicker(row.stepId!)}
                        onRemove={(id) => void handleStepRemove(row.stepId!, id)}
                        onReorder={(from, to) => void handleStepReorder(row.stepId!, from, to)}
                      />
                    </div>
                  )}
                  {row.stepId != null && row.media.length === 0 && (
                    <button
                      type="button"
                      className="create-recipe-step-attach-inline"
                      onClick={() => openStepPicker(row.stepId!)}
                    >
                      📷 Añadir imagen o vídeo a este paso
                    </button>
                  )}
                  <textarea
                    className="create-recipe-textarea create-recipe-textarea--grow"
                    value={row.content}
                    onChange={(e) => updateStep(row.key, e.target.value)}
                    onBlur={(e) => void persistStepContent(row, e.currentTarget.value)}
                    placeholder="Describe este paso…"
                    rows={2}
                  />
                </li>
              ))}
            </ol>
          </div>

          {submitError && <p className="home-error create-recipe-error">{submitError}</p>}

          <div className="create-recipe-actions">
            <button type="button" className="btn btn--secondary" onClick={() => setCancelDialogOpen(true)} disabled={publishing}>
              Cancelar
            </button>
            <button type="button" className="btn btn--primary create-recipe-submit" onClick={openPreview} disabled={publishing || uploadingGlobal}>
              Previsualizar
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={backDialogOpen}
        title="¿Salir de la edición?"
        message="Tienes cambios sin publicar. Puedes seguir editando o volver al inicio: el borrador se guarda en Borradores para continuar más tarde."
        cancelLabel="Seguir editando"
        confirmLabel="Salir y guardar borrador"
        confirmVariant="primary"
        onCancel={() => setBackDialogOpen(false)}
        onConfirm={() => {
          setBackDialogOpen(false);
          goHome();
        }}
      />

      <ConfirmDialog
        open={cancelDialogOpen}
        title="¿Salir sin publicar?"
        message="Los últimos cambios ya están guardados en el borrador. Podrás abrirlo desde el menú + → Borradores."
        cancelLabel="Seguir editando"
        confirmLabel="Salir"
        confirmVariant="primary"
        onCancel={() => setCancelDialogOpen(false)}
        onConfirm={() => {
          setCancelDialogOpen(false);
          goHome();
        }}
      />

      <RecipePreviewModal
        open={previewOpen}
        title={isGenericDraftTitle(title) ? "" : title}
        categories={previewCategories}
        steps={steps.map((s) => ({
          stepNumber: s.stepNumber,
          content: s.content,
          media: s.media,
        }))}
        globalMedia={globalMedia}
        publishing={publishing}
        error={previewError}
        onClose={() => setPreviewOpen(false)}
        onPublish={() => void runPublish()}
      />
    </section>
  );
}
