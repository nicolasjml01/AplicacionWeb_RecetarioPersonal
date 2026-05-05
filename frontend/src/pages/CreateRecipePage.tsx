import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getCurrentUserId } from "../auth/session";
import {
  addRecipeStep,
  createRecipe,
  deleteRecipe,
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

const DEFAULT_CATEGORY = "Sin categoría";
const DRAFT_INIT_TITLE = "Receta nueva";
const RESERVED_TITLES = new Set(["receta nueva", "borrador", "sin título", "nueva receta"]);

type StepRow = {
  key: string;
  stepId?: number;
  stepNumber: number;
  content: string;
  media: RecipeMediaDto[];
};

function isGenericDraftTitle(t: string): boolean {
  const x = t.trim().toLowerCase();
  return x.length > 0 && RESERVED_TITLES.has(x);
}

function isValidPublishTitle(t: string): boolean {
  const x = t.trim().toLowerCase();
  return x.length >= 2 && !RESERVED_TITLES.has(x);
}

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

/** Resolves existing category by id, exact match by name or new name to create in the backend. */
function buildCategoryPayload(
  selectedCategoryId: number | null,
  categoryQuery: string,
  allCategories: RecipeCategoryDto[],
): { categoryIds: number[] | null; newCategoryNames: string[] | null } {
  const q = categoryQuery.trim();
  if (selectedCategoryId != null) {
    return { categoryIds: [selectedCategoryId], newCategoryNames: null };
  }
  if (!q) {
    return { categoryIds: null, newCategoryNames: null };
  }
  if (q.toLowerCase() === DEFAULT_CATEGORY.toLowerCase()) {
    return { categoryIds: null, newCategoryNames: null };
  }
  const exact = allCategories.find((c) => c.name.trim().toLowerCase() === q.toLowerCase());
  if (exact) {
    return { categoryIds: [exact.categoryId], newCategoryNames: null };
  }
  return { categoryIds: null, newCategoryNames: [q] };
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

function makeLocalStep(stepNumber: number): StepRow {
  return {
    key: `local-${stepNumber}-${Date.now()}`,
    stepNumber,
    content: "",
    media: [],
  };
}

export function CreateRecipePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const userId = getCurrentUserId();
  const draftIdParam = searchParams.get("draftId");
  const editIdParam = searchParams.get("editId");
  const openedExistingDraft = draftIdParam != null && draftIdParam !== "";

  const globalFileRef = useRef<HTMLInputElement>(null);
  const stepFileRef = useRef<HTMLInputElement>(null);
  const categoryWrapRef = useRef<HTMLDivElement | null>(null);

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
  const [steps, setSteps] = useState<StepRow[]>([makeLocalStep(1)]);

  const [submitError, setSubmitError] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [exitBusy, setExitBusy] = useState(false);
  const [stepUploadTarget, setStepUploadTarget] = useState<number | null>(null);
  const [createdDraftThisSession, setCreatedDraftThisSession] = useState(false);
  const [isPublishedEditMode, setIsPublishedEditMode] = useState(false);
  const [initialStepIds, setInitialStepIds] = useState<number[]>([]);
  const [baselineKey, setBaselineKey] = useState("");

  const hasMeaningfulChanges = useMemo(() => {
    const hasTitle = title.trim().length > 0 && !isGenericDraftTitle(title);
    const hasStepText = steps.some((s) => s.content.trim().length > 0);
    const hasMultipleSteps = steps.length > 1;
    const q = categoryQuery.trim();
    const hasCategory =
      selectedCategoryId != null ||
      (q.length > 0 && q.toLowerCase() !== DEFAULT_CATEGORY.toLowerCase());
    const hasMedia = globalMedia.length > 0 || steps.some((s) => s.media.length > 0);
    return hasTitle || hasStepText || hasMultipleSteps || hasCategory || hasMedia;
  }, [title, steps, selectedCategoryId, categoryQuery, globalMedia]);

  const currentStateKey = useMemo(
    () =>
      JSON.stringify({
        title: title.trim(),
        selectedCategoryId,
        categoryQuery: categoryQuery.trim(),
        steps: steps.map((s, idx) => ({
          id: s.stepId ?? null,
          n: idx + 1,
          c: s.content.trim(),
        })),
      }),
    [title, selectedCategoryId, categoryQuery, steps],
  );

  const hasUnsavedChanges = baselineKey !== "" && currentStateKey !== baselineKey;

  const goHome = useCallback(() => {
    navigate("/home");
  }, [navigate]);

  const goAfterExit = useCallback(() => {
    if (isPublishedEditMode && recipeId != null) {
      navigate(`/home/recipes/${recipeId}`);
      return;
    }
    goHome();
  }, [isPublishedEditMode, recipeId, navigate, goHome]);

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
      if (!categoryWrapRef.current?.contains(e.target as Node)) setCategoryDropdownOpen(false);
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
    setSteps(sorted.length > 0 ? applyStepsFromRecipe(sorted) : [makeLocalStep(1)]);
    setInitialStepIds(sorted.map((s) => s.stepId));
    setIsPublishedEditMode(r.publicationState === "PUBLISHED");
  }, []);

  const refreshRecipe = useCallback(async () => {
    if (!userId || recipeId == null) return;
    const r = await getRecipe(userId, recipeId);
    applyRecipe(r);
    try {
      const cats = await getRecipeCategories(userId);
      setCategories(sortCategories(cats));
    } catch {
      // La receta ya está actualizada; el listado de categorías puede refrescarse al volver a home.
    }
  }, [userId, recipeId, applyRecipe]);

  const bootstrap = useCallback(async () => {
    if (!userId) return;
    const parsedEdit = editIdParam != null && editIdParam !== "" ? Number(editIdParam) : NaN;
    const parsed = draftIdParam != null && draftIdParam !== "" ? Number(draftIdParam) : NaN;

    if (editIdParam && !Number.isFinite(parsedEdit)) {
      setLoadError("Identificador de receta no válido.");
      setBooting(false);
      return;
    }

    if (draftIdParam && !Number.isFinite(parsed)) {
      setLoadError("Identificador de borrador no válido.");
      setBooting(false);
      return;
    }

    if (Number.isFinite(parsedEdit)) {
      try {
        const r = await getRecipe(userId, parsedEdit);
        setRecipeId(parsedEdit);
        applyRecipe(r);
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : "No se pudo cargar la receta.");
      } finally {
        setBooting(false);
      }
      return;
    }

    if (Number.isFinite(parsed)) {
      try {
        const r = await getRecipe(userId, parsed);
        if (r.publicationState !== "DRAFT") {
          navigate(`/home/recipes/${parsed}`, { replace: true });
          return;
        }
        setRecipeId(parsed);
        applyRecipe(r);
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : "No se pudo cargar el borrador.");
      } finally {
        setBooting(false);
      }
      return;
    }

    setTitle("");
    setSelectedCategoryId(null);
    setGlobalMedia([]);
    setSteps([makeLocalStep(1)]);
    setInitialStepIds([]);
    setIsPublishedEditMode(false);
    setBooting(false);
  }, [userId, draftIdParam, editIdParam, navigate, applyRecipe]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (booting || baselineKey !== "") return;
    setBaselineKey(currentStateKey);
  }, [booting, baselineKey, currentStateKey]);

  useEffect(() => {
    const areas = document.querySelectorAll<HTMLTextAreaElement>(".create-recipe-textarea--grow");
    for (const el of areas) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [steps]);

  const ensureDraftId = useCallback(async (): Promise<number> => {
    if (!userId) throw new Error("No hay usuario en sesión.");
    if (recipeId != null) return recipeId;
    const draftTitle =
      title.trim().length > 0 && !isGenericDraftTitle(title) ? title.trim() : DRAFT_INIT_TITLE;
    const cat = buildCategoryPayload(selectedCategoryId, categoryQuery, categories);
    const created = await createRecipe(userId, {
      title: draftTitle,
      categoryIds: cat.categoryIds,
      newCategoryNames: cat.newCategoryNames,
      draft: true,
    });
    setCreatedDraftThisSession(true);
    setRecipeId(created.recipeId);
    try {
      const cats = await getRecipeCategories(userId);
      setCategories(sortCategories(cats));
    } catch {
      // ignorar
    }
    return created.recipeId;
  }, [userId, recipeId, title, selectedCategoryId, categoryQuery, categories]);

  const saveCurrentAsDraft = useCallback(async (): Promise<number | null> => {
    if (!userId) return null;
    if (!hasMeaningfulChanges && recipeId == null) return null;

    const rid = await ensureDraftId();
    const finalTitle =
      title.trim().length > 0 && !isGenericDraftTitle(title) ? title.trim() : DRAFT_INIT_TITLE;

    const cat = buildCategoryPayload(selectedCategoryId, categoryQuery, categories);
    await patchRecipe(userId, rid, {
      title: finalTitle,
      categoryIds: cat.categoryIds === null ? null : cat.categoryIds.length > 0 ? cat.categoryIds : [],
      newCategoryNames: cat.newCategoryNames,
    });

    const usableSteps = steps.length > 0 ? steps : [makeLocalStep(1)];
    for (let i = 0; i < usableSteps.length; i++) {
      const row = usableSteps[i]!;
      const content = row.content.trim().length > 0 ? row.content.trim() : ".";
      if (row.stepId == null) {
        await addRecipeStep(userId, rid, { stepNumber: i + 1, content });
      } else {
        await patchRecipeStep(userId, rid, row.stepId, { stepNumber: i + 1, content });
      }
    }

    await refreshRecipe();
    setBaselineKey(
      JSON.stringify({
        title: finalTitle,
        selectedCategoryId,
        categoryQuery: categoryQuery.trim(),
        steps: steps.map((s, idx) => ({ id: s.stepId ?? null, n: idx + 1, c: s.content.trim() })),
      }),
    );
    return rid;
  }, [
    userId,
    hasMeaningfulChanges,
    recipeId,
    ensureDraftId,
    title,
    selectedCategoryId,
    categoryQuery,
    categories,
    steps,
    refreshRecipe,
  ]);

  const savePublishedChanges = useCallback(async (): Promise<number> => {
    if (!userId || recipeId == null) throw new Error("No se pudo guardar.");
    const cleanTitle = title.trim();
    if (!cleanTitle) throw new Error("Escribe un nombre para la receta.");
    const hasStep = steps.some((s) => s.content.trim().length > 0);
    if (!hasStep) throw new Error("Añade al menos un paso con texto.");

    const cat = buildCategoryPayload(selectedCategoryId, categoryQuery, categories);
    await patchRecipe(userId, recipeId, {
      title: cleanTitle,
      categoryIds: cat.categoryIds === null ? null : cat.categoryIds.length > 0 ? cat.categoryIds : [],
      newCategoryNames: cat.newCategoryNames,
    });

    const normalized = steps.map((s, i) => ({ ...s, stepNumber: i + 1 }));
    const currentIds = new Set(normalized.map((s) => s.stepId).filter((x): x is number => x != null));
    for (const oldId of initialStepIds) {
      if (!currentIds.has(oldId)) {
        await deleteRecipeStep(userId, recipeId, oldId);
      }
    }

    for (const row of normalized) {
      const content = row.content.trim().length > 0 ? row.content.trim() : ".";
      if (row.stepId == null) {
        await addRecipeStep(userId, recipeId, { stepNumber: row.stepNumber, content });
      } else {
        await patchRecipeStep(userId, recipeId, row.stepId, {
          stepNumber: row.stepNumber,
          content,
        });
      }
    }

    await refreshRecipe();
    return recipeId;
  }, [
    userId,
    recipeId,
    title,
    selectedCategoryId,
    categoryQuery,
    categories,
    initialStepIds,
    steps,
    refreshRecipe,
  ]);

  const discardAndExit = useCallback(async () => {
    if (!userId) {
      goAfterExit();
      return;
    }
    const shouldDeleteBlankNewDraft =
      recipeId != null && createdDraftThisSession && !openedExistingDraft && !hasMeaningfulChanges;
    if (shouldDeleteBlankNewDraft) {
      try {
        await deleteRecipe(userId, recipeId);
      } catch {
        // Si ya no existe, simplemente salimos.
      }
    }
    goAfterExit();
  }, [userId, recipeId, createdDraftThisSession, openedExistingDraft, hasMeaningfulChanges, goAfterExit]);

  const selectableCategories = useMemo(
    () => categories.filter((c) => c.name.trim().toLowerCase() !== DEFAULT_CATEGORY.toLowerCase()),
    [categories],
  );

  const categoryResults = useMemo(() => {
    const q = categoryQuery.trim().toLowerCase();
    if (!q) return selectableCategories;
    return selectableCategories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categoryQuery, selectableCategories]);

  const trimmedCategoryQuery = categoryQuery.trim();
  const categoryExactMatch =
    trimmedCategoryQuery.length > 0
      ? categories.find((c) => c.name.trim().toLowerCase() === trimmedCategoryQuery.toLowerCase())
      : undefined;
  const canOfferNewCategory =
    trimmedCategoryQuery.length > 0 &&
    !categoryExactMatch &&
    trimmedCategoryQuery.toLowerCase() !== DEFAULT_CATEGORY.toLowerCase();

  const selectedCategoryName =
    selectedCategoryId != null
      ? categories.find((c) => c.categoryId === selectedCategoryId)?.name ?? null
      : null;

  const updateStep = (key: string, content: string) => {
    setSteps((prev) => prev.map((s) => (s.key === key ? { ...s, content } : s)));
  };

  const autoGrowTextarea = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  const addStepRow = async () => {
    const nextNum = steps.length + 1;
    if (isPublishedEditMode || !userId || recipeId == null) {
      setSteps((prev) => [...prev, makeLocalStep(nextNum)]);
      return;
    }
    try {
      const created = await addRecipeStep(userId, recipeId, { stepNumber: nextNum, content: "." });
      setSteps((prev) => [
        ...prev,
        { key: String(created.stepId), stepId: created.stepId, stepNumber: created.stepNumber, content: "", media: [] },
      ]);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "No se pudo añadir el paso.");
    }
  };

  const removeStepRow = async (row: StepRow) => {
    if (steps.length <= 1) return;
    if (isPublishedEditMode || !userId || recipeId == null || row.stepId == null) {
      setSteps((prev) => prev.filter((s) => s.key !== row.key).map((s, i) => ({ ...s, stepNumber: i + 1 })));
      return;
    }
    try {
      await deleteRecipeStep(userId, recipeId, row.stepId);
      setSteps((prev) => prev.filter((s) => s.key !== row.key).map((s, i) => ({ ...s, stepNumber: i + 1 })));
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "No se pudo eliminar el paso.");
    }
  };

  const handleGlobalReorder = async (from: number, to: number) => {
    if (!userId || recipeId == null) return;
    const list = [...globalMedia].sort((a, b) => a.displayOrder - b.displayOrder);
    const [m] = list.splice(from, 1);
    list.splice(to, 0, m);
    try {
      await reorderRecipeMedia(userId, recipeId, list.map((x) => x.mediaId), undefined);
      await refreshRecipe();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "No se pudo reordenar.");
    }
  };

  const handleGlobalRemove = async (mediaId: number) => {
    if (!userId || recipeId == null) return;
    try {
      await deleteRecipeMedia(userId, recipeId, mediaId);
      await refreshRecipe();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "No se pudo eliminar el archivo.");
    }
  };

  const handleGlobalFiles = async (files: FileList | null) => {
    if (!userId || !files?.length) return;
    setUploadingGlobal(true);
    setSubmitError("");
    try {
      const rid = await ensureDraftId();
      for (let i = 0; i < files.length; i++) {
        await uploadRecipeMedia(userId, rid, files[i]!);
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
    try {
      await reorderRecipeMedia(userId, recipeId, list.map((x) => x.mediaId), stepId);
      await refreshRecipe();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "No se pudo reordenar.");
    }
  };

  const handleStepRemove = async (mediaId: number) => {
    if (!userId || recipeId == null) return;
    try {
      await deleteRecipeMedia(userId, recipeId, mediaId);
      await refreshRecipe();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "No se pudo eliminar.");
    }
  };

  const handleStepFiles = async (stepId: number, files: FileList | null) => {
    if (!userId || recipeId == null || !files?.length) return;
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

  const openStepPicker = async (rowKey: string) => {
    const row = steps.find((s) => s.key === rowKey);
    if (!row || !userId) return;
    try {
      let rid = recipeId;
      if (rid == null) {
        rid = await ensureDraftId();
      }

      let sid = row.stepId;
      if (sid == null) {
        const stepNumber = steps.findIndex((s) => s.key === rowKey) + 1;
        const content = row.content.trim().length > 0 ? row.content.trim() : ".";
        const created = await addRecipeStep(userId, rid, { stepNumber, content });
        sid = created.stepId;
        setSteps((prev) =>
          prev.map((s, idx) =>
            s.key === rowKey ? { ...s, stepId: sid, stepNumber: idx + 1 } : { ...s, stepNumber: idx + 1 },
          ),
        );
      }

      setStepUploadTarget(sid);
      requestAnimationFrame(() => stepFileRef.current?.click());
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "No se pudo preparar el paso para adjuntar archivos.");
    }
  };

  const handleExitIntent = () => {
    if (!hasUnsavedChanges) {
      goAfterExit();
      return;
    }
    setExitDialogOpen(true);
  };

  const validateBeforePreview = (): string | null => {
    if (!title.trim()) return "Escribe un nombre para la receta.";
    if (!isValidPublishTitle(title)) {
      return "El nombre debe ser más descriptivo (evita solo «Receta nueva» o similares).";
    }
    const hasStepText = steps.some((s) => s.content.trim().length > 0);
    const hasMedia = globalMedia.length > 0 || steps.some((s) => s.media.length > 0);
    if (!hasStepText && !hasMedia) return "Añade al menos texto en un paso o alguna foto/vídeo.";
    return null;
  };

  const publishDirectly = async () => {
    if (isPublishedEditMode) return;
    const err = validateBeforePreview();
    if (err) {
      setSubmitError(err);
      return;
    }
    setPublishing(true);
    setSubmitError("");
    try {
      const rid = await saveCurrentAsDraft();
      if (rid == null) throw new Error("No se pudo preparar la receta para publicar.");
      await publishRecipe(userId!, rid);
      navigate(`/home/recipes/${rid}`);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "No se pudo publicar.");
    } finally {
      setPublishing(false);
    }
  };

  const runSavePublished = async () => {
    if (!isPublishedEditMode) return;
    setPublishing(true);
    setSubmitError("");
    try {
      const rid = await savePublishedChanges();
      navigate(`/home/recipes/${rid}`);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "No se pudieron guardar los cambios.");
    } finally {
      setPublishing(false);
    }
  };

  if (!userId) return <p className="home-error">No hay usuario en sesión.</p>;

  return (
    <section className="create-recipe-page">
      <header className="category-recipes-header create-recipe-header">
        <button type="button" className="category-recipes-back" onClick={handleExitIntent} aria-label="Volver">
          ←
        </button>
        <h1 className="category-recipes-title">{isPublishedEditMode ? "Editar receta" : "Nueva receta"}</h1>
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

      {!booting && (
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
              onChange={(e) => setTitle(e.target.value)}
              onFocus={() => {
                if (isGenericDraftTitle(title)) setTitle("");
              }}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (!v) setTitle("");
              }}
              placeholder="Obligatorio — ej. Tortilla de patatas"
              maxLength={255}
              autoComplete="off"
            />
          </div>

          <div className="create-recipe-card">
            <span className="create-recipe-label">Categoría</span>
            <p className="create-recipe-hint">
              Opcional. Elige una categoría o escribe un nombre nuevo: se creará al guardar. Si lo dejas vacío, se
              usará «{DEFAULT_CATEGORY}».
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
                    {canOfferNewCategory && (
                      <button
                        type="button"
                        className="create-recipe-category-option create-recipe-category-option--new"
                        onClick={() => setCategoryDropdownOpen(false)}
                      >
                        Usar «{trimmedCategoryQuery}» (nueva categoría)
                      </button>
                    )}
                    {categoryResults.length === 0 && !canOfferNewCategory ? (
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
                      {
                        <button
                          type="button"
                          className="create-recipe-step-attach"
                          onClick={() => void openStepPicker(row.key)}
                          aria-label="Añadir imagen o vídeo a este paso"
                          title="Biblioteca / archivos"
                        >
                          📷
                        </button>
                      }
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
                        onAdd={() => void openStepPicker(row.key)}
                        onRemove={(id) => void handleStepRemove(id)}
                        onReorder={(from, to) => void handleStepReorder(row.stepId!, from, to)}
                      />
                    </div>
                  )}
                  {row.media.length === 0 && (
                    <button
                      type="button"
                      className="create-recipe-step-attach-inline"
                      onClick={() => void openStepPicker(row.key)}
                    >
                      📷 Añadir imagen o vídeo a este paso
                    </button>
                  )}
                  <textarea
                    className="create-recipe-textarea create-recipe-textarea--grow"
                    value={row.content}
                    onChange={(e) => updateStep(row.key, e.target.value)}
                    onInput={(e) => autoGrowTextarea(e.currentTarget)}
                    placeholder="Describe este paso…"
                    rows={2}
                  />
                </li>
              ))}
            </ol>
          </div>

          {submitError && <p className="home-error create-recipe-error">{submitError}</p>}

          <div className="create-recipe-actions">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={handleExitIntent}
              disabled={publishing || exitBusy}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn--primary create-recipe-submit"
              onClick={() => {
                if (isPublishedEditMode) {
                  void runSavePublished();
                } else {
                  void publishDirectly();
                }
              }}
              disabled={publishing || uploadingGlobal || exitBusy}
            >
              {isPublishedEditMode ? "Guardar cambios" : "Publicar"}
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={exitDialogOpen}
        title={isPublishedEditMode ? "Hay cambios sin guardar" : "¿Quieres guardar los cambios en borrador?"}
        message={
          isPublishedEditMode
            ? "Si sales ahora perderás los cambios de esta receta publicada. ¿Quieres descartarlos?"
            : "Si eliges guardar, verás estos cambios al volver. Si eliges salir sin guardar, el borrador quedará como estaba antes."
        }
        cancelLabel="Salir sin guardar"
        confirmLabel={isPublishedEditMode ? "Volver y guardar" : "Guardar cambios"}
        confirmVariant="primary"
        onCancel={() => {
          void (async () => {
            setExitBusy(true);
            try {
              setExitDialogOpen(false);
              await discardAndExit();
            } finally {
              setExitBusy(false);
            }
          })();
        }}
        onConfirm={() => {
          void (async () => {
            setExitBusy(true);
            try {
              setExitDialogOpen(false);
              if (isPublishedEditMode) return;
              await saveCurrentAsDraft();
              goAfterExit();
            } catch (e) {
              setSubmitError(e instanceof Error ? e.message : "No se pudo guardar el borrador.");
            } finally {
              setExitBusy(false);
            }
          })();
        }}
      />

    </section>
  );
}
