import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOverlayDismiss } from "../hooks/useOverlayDismiss";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { getCurrentUserId } from "../auth/session";
import {
  appendRecipeReturnNav,
  navigateAfterRecipeEditorExit,
  parseRecipeReturnNav,
} from "../utils/recipeReturnNav";
import {
  addRecipeIngredient,
  addRecipeStep,
  createRecipe,
  deleteRecipeIngredient,
  deleteRecipe,
  deleteRecipeStep,
  getRecipe,
  patchRecipeIngredient,
  patchRecipe,
  patchRecipeStep,
  publishRecipe,
  type RecipeImportPreviewDto,
} from "../api/recipes";
import {
  deleteRecipeMedia,
  replaceRecipeMediaContent,
  reorderRecipeMedia,
  uploadRecipeMedia,
} from "../api/recipeMedia";
import { getRecipeCategories } from "../api/recipeCategories";
import { getUnits, getIngredientsCatalog, searchIngredients, uploadOwnedIngredientImage } from "../api/shopping";
import type { IngredientDto, IngredientCategoryCatalogDto, UnitOfMeasureDto } from "../types/shopping";
import type { RecipeCategoryDto, RecipeDto, RecipeIngredientDto, RecipeMediaDto } from "../types/recipes";
import { ConfirmDialog } from "../components/recipe/editor/ConfirmDialog";
import { MediaStripEditor } from "../components/recipe/editor/MediaStripEditor";
import { IngredientEntryDialog } from "../components/ingredient/IngredientEntryDialog";
import { IngredientRowThumb } from "../components/ingredient/IngredientRowThumb";
import { UploadStagingDialog } from "../components/recipe/editor/UploadStagingDialog";
import { ImageEditorDialog } from "../components/recipe/editor/ImageEditorDialog";
import { resolveMediaUrl } from "../utils/mediaUrl";
import {
  applyImageEdits,
  hasEdits,
  isEditableImage,
  type ImageEdits,
} from "../utils/imageEditing";
import {
  defaultIngredientCategoryId,
  ingredientCategoriesForSelect,
} from "../utils/ingredientCatalogUi";
import { parseImportedIngredientLine } from "../utils/parseImportedIngredientLine";
import { formatImportQuantityForInput } from "../components/recipe/importQuantity";

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

type IngredientRow = {
  key: string;
  recipeIngredientId?: number;
  ingredientName: string;
  quantity: string;
  measurementUnit: string;
  /** URL del catálogo o de la receta cargada (misma que en detalle de receta). */
  ingredientImageUrl?: string | null;
  /** Solo al crear un nombre nuevo desde el modal; se envía al guardar la receta. */
  ingredientCategoryId?: number | null;
  pendingIngredientImage?: File | null;
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

/** Combines selected category ids and pending new names; resolves names that already exist in the catalog. */
function buildCategoryPayload(
  selectedCategoryIds: number[],
  pendingNewNames: string[],
  allCategories: RecipeCategoryDto[],
): { categoryIds: number[] | null; newCategoryNames: string[] | null } {
  const idSet = new Set(selectedCategoryIds.filter((id) => Number.isFinite(id)));

  const normalizedNew = [
    ...new Set(
      pendingNewNames
        .map((n) => (n == null ? "" : n.trim()))
        .filter((n) => n.length > 0 && n.toLowerCase() !== DEFAULT_CATEGORY.toLowerCase()),
    ),
  ];

  const stillNew: string[] = [];
  for (const n of normalizedNew) {
    const exact = allCategories.find((c) => c.name.trim().toLowerCase() === n.toLowerCase());
    if (exact) idSet.add(exact.categoryId);
    else stillNew.push(n);
  }

  const categoryIds = idSet.size > 0 ? [...idSet] : null;
  const newCategoryNames = stillNew.length > 0 ? stillNew : null;
  if (categoryIds == null && newCategoryNames == null) {
    return { categoryIds: null, newCategoryNames: null };
  }
  return { categoryIds, newCategoryNames };
}

/** Includes the category search text if the user hasn't yet pressed «add». */
function effectivePendingCategoryNames(
  pending: string[],
  categoryQuery: string,
  selectedIds: number[],
  allCategories: RecipeCategoryDto[],
): string[] {
  const q = categoryQuery.trim();
  if (!q || q.toLowerCase() === DEFAULT_CATEGORY.toLowerCase()) return [...pending];
  const qLower = q.toLowerCase();
  if (pending.some((n) => n.trim().toLowerCase() === qLower)) return [...pending];
  const matchesSelected = selectedIds.some((id) => {
    const name = allCategories.find((c) => c.categoryId === id)?.name.trim().toLowerCase();
    return name === qLower;
  });
  if (matchesSelected) return [...pending];
  return [...pending, q];
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

function applyIngredientsFromRecipe(sortedIngredients: RecipeIngredientDto[]): IngredientRow[] {
  return sortedIngredients.map((i) => ({
    key: String(i.recipeIngredientId),
    recipeIngredientId: i.recipeIngredientId,
    ingredientName: i.ingredient.name,
    ingredientImageUrl: i.ingredient.imageUrl ?? null,
    quantity: Number.isFinite(i.quantity) ? String(i.quantity) : "",
    measurementUnit: i.unitOfMeasure?.name ?? "",
  }));
}

function applyIngredientsFromImport(imported: RecipeImportPreviewDto["ingredients"]): IngredientRow[] {
  return imported
    .map((i, idx) => {
      const raw = (i.rawText ?? i.ingredientName ?? "").trim();
      const parsed = parseImportedIngredientLine(raw, {
        ingredientName: i.ingredientName,
        quantity: i.quantity,
        measurementUnit: i.measurementUnit,
      });
      const quantity =
        parsed.quantity != null && Number.isFinite(parsed.quantity)
          ? formatImportQuantityForInput(parsed.quantity)
          : "";
      return {
        key: `import-ing-${idx}-${Math.random().toString(36).slice(2, 8)}`,
        ingredientName: parsed.ingredientName,
        quantity,
        measurementUnit: (parsed.measurementUnit ?? "").trim(),
        ingredientImageUrl: null,
        ingredientCategoryId: null,
        pendingIngredientImage: null,
      };
    })
    .filter((i) => i.ingredientName.length > 0 || i.quantity.length > 0 || i.measurementUnit.length > 0);
}

function applyStepsFromImport(imported: RecipeImportPreviewDto["steps"]): StepRow[] {
  const sorted = [...imported].sort((a, b) => a.stepNumber - b.stepNumber);
  return sorted
    .map((s, idx) => ({
      key: `import-step-${idx}-${Math.random().toString(36).slice(2, 8)}`,
      stepNumber: idx + 1,
      content: s.content?.trim() ?? "",
      media: [],
    }))
    .filter((s) => s.content.length > 0);
}

function makeLocalStep(stepNumber: number): StepRow {
  return {
    key: `local-${stepNumber}-${Date.now()}`,
    stepNumber,
    content: "",
    media: [],
  };
}

function makeLocalIngredient(): IngredientRow {
  return {
    key: `local-ing-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ingredientName: "",
    quantity: "",
    measurementUnit: "",
  };
}

type IngredientModalState =
  | { open: false }
  | {
      open: true;
      mode: "add" | "edit";
      rowKey?: string;
      ingredientName: string;
      /** true = nombre nuevo (no elegido de la búsqueda); muestra categoría y foto. */
      isNewCreation?: boolean;
    };

export function CreateRecipePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const userId = getCurrentUserId();
  const draftIdParam = searchParams.get("draftId");
  const editIdParam = searchParams.get("editId");
  const categoryIdParam = searchParams.get("categoryId");
  const openedExistingDraft = draftIdParam != null && draftIdParam !== "";

  const globalFileRef = useRef<HTMLInputElement>(null);
  const stepFileRef = useRef<HTMLInputElement>(null);
  const categoryWrapRef = useRef<HTMLDivElement | null>(null);
  const ingredientsWrapRef = useRef<HTMLDivElement | null>(null);

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
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [pendingNewCategoryNames, setPendingNewCategoryNames] = useState<string[]>([]);
  const [ingredients, setIngredients] = useState<IngredientRow[]>([]);
  const [units, setUnits] = useState<UnitOfMeasureDto[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(true);
  const [ingredientCatalog, setIngredientCatalog] = useState<IngredientCategoryCatalogDto[]>([]);
  const [ingredientSearch, setIngredientSearch] = useState("");
  const [ingredientResults, setIngredientResults] = useState<IngredientDto[]>([]);
  const [ingredientSearchLoading, setIngredientSearchLoading] = useState(false);
  const [ingredientDropdownOpen, setIngredientDropdownOpen] = useState(false);
  const [ingredientModal, setIngredientModal] = useState<IngredientModalState>({ open: false });
  const [ingredientModalQuantity, setIngredientModalQuantity] = useState("");
  const [ingredientModalUnit, setIngredientModalUnit] = useState("");
  const [ingredientModalCategoryId, setIngredientModalCategoryId] = useState<number | null>(null);
  const [ingredientModalImageFile, setIngredientModalImageFile] = useState<File | null>(null);
  const [ingredientModalImageUrl, setIngredientModalImageUrl] = useState<string | null>(null);
  const [ingredientModalSaving, setIngredientModalSaving] = useState(false);
  const [ingredientModalError, setIngredientModalError] = useState("");
  const [steps, setSteps] = useState<StepRow[]>([makeLocalStep(1)]);

  const [submitError, setSubmitError] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [ingredientDeleteConfirmOpen, setIngredientDeleteConfirmOpen] = useState(false);
  const [ingredientDiscardConfirmOpen, setIngredientDiscardConfirmOpen] = useState(false);
  const [exitBusy, setExitBusy] = useState(false);
  const [stepUploadTarget, setStepUploadTarget] = useState<number | null>(null);
  // Holds the picked files between OS dialog and actual upload, so the user
  // can edit/remove them first. target = where the batch will land.
  const [stagingState, setStagingState] = useState<{
    open: boolean;
    files: File[];
    target: "global" | { stepId: number };
  } | null>(null);
  // Re-edit flow for already uploaded images: holds the fetched blob until the
  // editor closes. saving flips on while we POST the replacement to the API.
  const [editExistingState, setEditExistingState] = useState<{
    mediaId: number;
    file: Blob;
    fileName: string;
    saving: boolean;
    error?: string;
  } | null>(null);
  const [createdDraftThisSession, setCreatedDraftThisSession] = useState(false);
  const [isPublishedEditMode, setIsPublishedEditMode] = useState(false);
  const [initialIngredientIds, setInitialIngredientIds] = useState<number[]>([]);
  const [initialStepIds, setInitialStepIds] = useState<number[]>([]);
  const [baselineKey, setBaselineKey] = useState("");

  const hasMeaningfulChanges = useMemo(() => {
    const hasTitle = title.trim().length > 0 && !isGenericDraftTitle(title);
    const hasStepText = steps.some((s) => s.content.trim().length > 0);
    const hasMultipleSteps = steps.length > 1;
    const q = categoryQuery.trim();
    const hasCategory =
      selectedCategoryIds.length > 0 ||
      pendingNewCategoryNames.length > 0 ||
      (q.length > 0 && q.toLowerCase() !== DEFAULT_CATEGORY.toLowerCase());
    const hasIngredients = ingredients.some(
      (i) => i.ingredientName.trim().length > 0 || i.quantity.trim().length > 0 || i.measurementUnit.trim().length > 0,
    );
    const hasMedia = globalMedia.length > 0 || steps.some((s) => s.media.length > 0);
    return hasTitle || hasStepText || hasMultipleSteps || hasCategory || hasIngredients || hasMedia;
  }, [title, steps, selectedCategoryIds, pendingNewCategoryNames, categoryQuery, ingredients, globalMedia]);

  const currentStateKey = useMemo(
    () =>
      JSON.stringify({
        title: title.trim(),
        selectedCategoryIds: [...selectedCategoryIds].sort((a, b) => a - b),
        pendingNewCategoryNames: [...pendingNewCategoryNames].sort((a, b) => a.localeCompare(b, "es")),
        categoryQuery: categoryQuery.trim(),
        ingredients: ingredients.map((i) => ({
          id: i.recipeIngredientId ?? null,
          n: i.ingredientName.trim(),
          q: i.quantity.trim(),
          u: i.measurementUnit.trim(),
        })),
        steps: steps.map((s, idx) => ({
          id: s.stepId ?? null,
          n: idx + 1,
          c: s.content.trim(),
        })),
      }),
    [title, selectedCategoryIds, pendingNewCategoryNames, categoryQuery, ingredients, steps],
  );

  const hasUnsavedChanges = baselineKey !== "" && currentStateKey !== baselineKey;
  const [pendingRouteExit, setPendingRouteExit] = useState(false);
  const [pendingRoutePath, setPendingRoutePath] = useState<string | null>(null);

  const ingredientCategorySelectOptions = useMemo(
    () => ingredientCategoriesForSelect(ingredientCatalog),
    [ingredientCatalog],
  );

  const goAfterExit = useCallback(() => {
    const ret = parseRecipeReturnNav(searchParams);
    if (isPublishedEditMode && recipeId != null) {
      navigate(appendRecipeReturnNav(`/home/recipes/${recipeId}`, ret));
      return;
    }
    navigateAfterRecipeEditorExit(navigate, searchParams);
  }, [isPublishedEditMode, recipeId, navigate, searchParams]);

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
    void getUnits()
      .then((list) =>
        setUnits([...list].sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }))),
      )
      .catch(() => {
        setUnits([]);
      })
      .finally(() => setLoadingUnits(false));
  }, []);

  useEffect(() => {
    if (!userId) return;
    void getIngredientsCatalog(userId)
      .then(setIngredientCatalog)
      .catch(() => setIngredientCatalog([]));
  }, [userId]);

  const closeCategoryDropdown = useCallback(() => setCategoryDropdownOpen(false), []);
  const closeIngredientDropdown = useCallback(() => setIngredientDropdownOpen(false), []);

  useOverlayDismiss({
    enabled: categoryDropdownOpen,
    containerRef: categoryWrapRef,
    onDismiss: closeCategoryDropdown,
  });

  useOverlayDismiss({
    enabled: ingredientDropdownOpen,
    containerRef: ingredientsWrapRef,
    onDismiss: closeIngredientDropdown,
  });

  useEffect(() => {
    const q = ingredientSearch.trim();
    if (!userId || q.length < 2) {
      setIngredientResults([]);
      setIngredientSearchLoading(false);
      return;
    }
    const handle = window.setTimeout(async () => {
      setIngredientSearchLoading(true);
      try {
        const res = await searchIngredients(userId, q);
        setIngredientResults(res);
      } catch {
        setIngredientResults([]);
      } finally {
        setIngredientSearchLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(handle);
  }, [ingredientSearch, userId]);

  const applyRecipe = useCallback((r: RecipeDto) => {
    setTitle(r.title);
    setGlobalMedia([...r.recipeLevelMedia].sort((a, b) => a.displayOrder - b.displayOrder));
    const nonDefaultIds = r.categories
      .filter((c) => c.name.trim().toLowerCase() !== DEFAULT_CATEGORY.toLowerCase())
      .map((c) => c.categoryId);
    setSelectedCategoryIds(nonDefaultIds);
    setPendingNewCategoryNames([]);
    const sortedIngredients = [...r.ingredients].sort((a, b) => a.displayOrder - b.displayOrder);
    setIngredients(
      sortedIngredients.length > 0 ? applyIngredientsFromRecipe(sortedIngredients) : [makeLocalIngredient()],
    );
    setInitialIngredientIds(sortedIngredients.map((i) => i.recipeIngredientId));
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

  // Refresh "surgical" after uploading/deleting/reordering media: only updates the global gallery
  // and the media of each step, without touching the title, category, ingredients or text
  // of the steps (this avoids the phantom placeholder and prevents local edits from being lost).
  // `overrideId` allows passing a newly created recipeId when the state hasn't been re-rendered yet
  // (uploading the first image).
  const refreshMedia = useCallback(
    async (overrideId?: number) => {
      const id = overrideId ?? recipeId;
      if (!userId || id == null) return;
      const r = await getRecipe(userId, id);
      setGlobalMedia([...r.recipeLevelMedia].sort((a, b) => a.displayOrder - b.displayOrder));
      const stepMediaById = new Map<number, RecipeMediaDto[]>();
      for (const s of r.steps) {
        stepMediaById.set(s.stepId, [...s.media].sort((a, b) => a.displayOrder - b.displayOrder));
      }
      setSteps((prev) =>
        prev.map((s) =>
          s.stepId != null ? { ...s, media: stepMediaById.get(s.stepId) ?? [] } : s,
        ),
      );
    },
    [userId, recipeId],
  );

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
          navigate(appendRecipeReturnNav(`/home/recipes/${parsed}`, parseRecipeReturnNav(searchParams)), {
            replace: true,
          });
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
    const parsedCategory =
      categoryIdParam != null && categoryIdParam !== "" ? Number(categoryIdParam) : NaN;
    setSelectedCategoryIds(Number.isFinite(parsedCategory) ? [parsedCategory] : []);
    setPendingNewCategoryNames([]);
    setIngredients([]);
    setIngredientSearch("");
    setIngredientResults([]);
    setIngredientDropdownOpen(false);
    setGlobalMedia([]);
    const importPreview = (location.state as { importPreview?: RecipeImportPreviewDto } | null)?.importPreview;
    if (importPreview != null) {
      const importedTitle = importPreview.title?.trim() ?? "";
      setTitle(importedTitle);
      const importedIngredients = applyIngredientsFromImport(importPreview.ingredients ?? []);
      setIngredients(importedIngredients.length > 0 ? importedIngredients : [makeLocalIngredient()]);
      const importedSteps = applyStepsFromImport(importPreview.steps ?? []);
      setSteps(importedSteps.length > 0 ? importedSteps : [makeLocalStep(1)]);
    } else {
      setSteps([makeLocalStep(1)]);
    }
    setInitialIngredientIds([]);
    setInitialStepIds([]);
    setIsPublishedEditMode(false);
    setBooting(false);
  }, [userId, draftIdParam, editIdParam, categoryIdParam, navigate, applyRecipe, searchParams, location.state]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (booting || baselineKey !== "") return;
    setBaselineKey(currentStateKey);
  }, [booting, baselineKey, currentStateKey]);

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      if (!hasUnsavedChanges) return;
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const link = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!link) return;
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      if (link.target && link.target !== "_self") return;
      const toUrl = new URL(link.href, window.location.origin);
      if (toUrl.origin !== window.location.origin) return;

      const destination = `${toUrl.pathname}${toUrl.search}${toUrl.hash}`;
      const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (destination === current) return;

      event.preventDefault();
      setPendingRoutePath(destination);
      setPendingRouteExit(true);
      setExitDialogOpen(true);
    };

    document.addEventListener("click", onDocumentClick, true);
    return () => document.removeEventListener("click", onDocumentClick, true);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasUnsavedChanges]);

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
    const cat = buildCategoryPayload(
      selectedCategoryIds,
      effectivePendingCategoryNames(pendingNewCategoryNames, categoryQuery, selectedCategoryIds, categories),
      categories,
    );
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
  }, [userId, recipeId, title, selectedCategoryIds, pendingNewCategoryNames, categoryQuery, categories]);

  const parseQuantity = (raw: string): number => {
    const value = Number(raw.replace(",", "."));
    return Number.isFinite(value) && value >= 0 ? value : 0;
  };

  const syncIngredients = useCallback(
    async (rid: number) => {
      if (!userId) return;

      const normalized = ingredients
        .map((i) => ({
          ...i,
          ingredientName: i.ingredientName.trim(),
          measurementUnit: i.measurementUnit.trim(),
          quantityRaw: i.quantity.trim(),
        }))
        .filter((i) => i.ingredientName.length > 0);

      const currentIds = new Set(
        normalized.map((i) => i.recipeIngredientId).filter((id): id is number => id != null),
      );

      for (const oldId of initialIngredientIds) {
        if (!currentIds.has(oldId)) {
          await deleteRecipeIngredient(userId, rid, oldId);
        }
      }

      for (const row of normalized) {
        const quantity = parseQuantity(row.quantityRaw);
        if (row.recipeIngredientId == null) {
          const created = await addRecipeIngredient(userId, rid, {
            ingredientName: row.ingredientName,
            quantity,
            measurementUnit: row.measurementUnit,
            ...(row.ingredientCategoryId != null
              ? { ingredientCategoryId: row.ingredientCategoryId }
              : {}),
          });
          if (row.pendingIngredientImage) {
            await uploadOwnedIngredientImage(
              userId,
              created.ingredient.ingredientId,
              row.pendingIngredientImage,
            );
          }
        } else {
          await patchRecipeIngredient(userId, rid, row.recipeIngredientId, {
            ingredientName: row.ingredientName,
            quantity,
            measurementUnit: row.measurementUnit,
            ...(row.ingredientCategoryId != null
              ? { ingredientCategoryId: row.ingredientCategoryId }
              : {}),
          });
        }
      }
    },
    [userId, ingredients, initialIngredientIds],
  );

  const saveCurrentAsDraft = useCallback(async (): Promise<number | null> => {
    if (!userId) return null;
    if (!hasMeaningfulChanges && recipeId == null) return null;

    const rid = await ensureDraftId();
    const finalTitle =
      title.trim().length > 0 && !isGenericDraftTitle(title) ? title.trim() : DRAFT_INIT_TITLE;

    const cat = buildCategoryPayload(
      selectedCategoryIds,
      effectivePendingCategoryNames(pendingNewCategoryNames, categoryQuery, selectedCategoryIds, categories),
      categories,
    );
    await patchRecipe(userId, rid, {
      title: finalTitle,
      categoryIds: cat.categoryIds === null ? null : cat.categoryIds.length > 0 ? cat.categoryIds : [],
      newCategoryNames: cat.newCategoryNames,
    });
    await syncIngredients(rid);

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
        selectedCategoryIds: [...selectedCategoryIds].sort((a, b) => a - b),
        pendingNewCategoryNames: [...pendingNewCategoryNames].sort((a, b) => a.localeCompare(b, "es")),
        categoryQuery: categoryQuery.trim(),
        ingredients: ingredients.map((i) => ({
          id: i.recipeIngredientId ?? null,
          n: i.ingredientName.trim(),
          q: i.quantity.trim(),
          u: i.measurementUnit.trim(),
        })),
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
    selectedCategoryIds,
    pendingNewCategoryNames,
    categoryQuery,
    categories,
    ingredients,
    steps,
    refreshRecipe,
    syncIngredients,
  ]);

  const savePublishedChanges = useCallback(async (): Promise<number> => {
    if (!userId || recipeId == null) throw new Error("No se pudo guardar.");
    const cleanTitle = title.trim();
    if (!cleanTitle) throw new Error("Escribe un nombre para la receta.");
    const hasStep = steps.some((s) => s.content.trim().length > 0);
    if (!hasStep) throw new Error("Añade al menos un paso con texto.");

    const cat = buildCategoryPayload(
      selectedCategoryIds,
      effectivePendingCategoryNames(pendingNewCategoryNames, categoryQuery, selectedCategoryIds, categories),
      categories,
    );
    await patchRecipe(userId, recipeId, {
      title: cleanTitle,
      categoryIds: cat.categoryIds === null ? null : cat.categoryIds.length > 0 ? cat.categoryIds : [],
      newCategoryNames: cat.newCategoryNames,
    });
    await syncIngredients(recipeId);

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
    selectedCategoryIds,
    pendingNewCategoryNames,
    categoryQuery,
    categories,
    initialStepIds,
    steps,
    refreshRecipe,
    syncIngredients,
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

  const discardWithoutNavigation = useCallback(async () => {
    if (!userId) return;
    const shouldDeleteBlankNewDraft =
      recipeId != null && createdDraftThisSession && !openedExistingDraft && !hasMeaningfulChanges;
    if (shouldDeleteBlankNewDraft) {
      try {
        await deleteRecipe(userId, recipeId);
      } catch {
        // Si ya no existe, simplemente continuamos.
      }
    }
  }, [userId, recipeId, createdDraftThisSession, openedExistingDraft, hasMeaningfulChanges]);

  const selectableCategories = useMemo(
    () => categories.filter((c) => c.name.trim().toLowerCase() !== DEFAULT_CATEGORY.toLowerCase()),
    [categories],
  );

  const categoryResults = useMemo(() => {
    const q = categoryQuery.trim().toLowerCase();
    const base = !q
      ? selectableCategories
      : selectableCategories.filter((c) => c.name.toLowerCase().includes(q));
    const sel = new Set(selectedCategoryIds);
    return base.filter((c) => !sel.has(c.categoryId));
  }, [categoryQuery, selectableCategories, selectedCategoryIds]);

  const trimmedCategoryQuery = categoryQuery.trim();
  const categoryExactMatch =
    trimmedCategoryQuery.length > 0
      ? categories.find((c) => c.name.trim().toLowerCase() === trimmedCategoryQuery.toLowerCase())
      : undefined;
  const canOfferNewCategory =
    trimmedCategoryQuery.length > 0 &&
    !categoryExactMatch &&
    trimmedCategoryQuery.toLowerCase() !== DEFAULT_CATEGORY.toLowerCase() &&
    !pendingNewCategoryNames.some((n) => n.trim().toLowerCase() === trimmedCategoryQuery.toLowerCase()) &&
    !selectedCategoryIds.some(
      (id) =>
        categories.find((c) => c.categoryId === id)?.name.trim().toLowerCase() ===
        trimmedCategoryQuery.toLowerCase(),
    );

  const updateStep = (key: string, content: string) => {
    setSteps((prev) => prev.map((s) => (s.key === key ? { ...s, content } : s)));
  };

  const removeIngredientRow = (key: string) => {
    setIngredients((prev) => prev.filter((i) => i.key !== key));
  };

  const openAddIngredientModal = (
    ingredientName: string,
    isNewCreation: boolean,
    imageUrl?: string | null,
  ) => {
    const opts = ingredientCategoriesForSelect(ingredientCatalog);
    setIngredientModalCategoryId(
      isNewCreation ? defaultIngredientCategoryId(opts) : null,
    );
    setIngredientModalImageFile(null);
    setIngredientModalImageUrl(isNewCreation ? null : (imageUrl ?? null));
    setIngredientModal({ open: true, mode: "add", ingredientName, isNewCreation });
    setIngredientModalQuantity("");
    setIngredientModalUnit("");
    setIngredientModalSaving(false);
    setIngredientDropdownOpen(false);
    setIngredientSearch("");
    setIngredientResults([]);
  };

  const openEditIngredientModal = (row: IngredientRow) => {
    setIngredientModal({
      open: true,
      mode: "edit",
      rowKey: row.key,
      ingredientName: row.ingredientName,
      isNewCreation: false,
    });
    setIngredientModalQuantity(row.quantity);
    setIngredientModalUnit(row.measurementUnit);
    setIngredientModalCategoryId(null);
    setIngredientModalImageFile(null);
    setIngredientModalImageUrl(row.ingredientImageUrl ?? null);
    setIngredientModalSaving(false);
  };

  const closeIngredientModal = () => {
    setIngredientModal({ open: false });
    setIngredientModalSaving(false);
    setIngredientModalError("");
    setIngredientModalCategoryId(null);
    setIngredientModalImageFile(null);
    setIngredientModalImageUrl(null);
  };

  const requestCloseIngredientModal = () => {
    if (!ingredientModal.open) return;
    const original =
      ingredientModal.mode === "edit" && ingredientModal.rowKey
        ? ingredients.find((x) => x.key === ingredientModal.rowKey)
        : undefined;
    const originalQty = original?.quantity ?? "";
    const originalUnit = original?.measurementUnit ?? "";
    const defCat = defaultIngredientCategoryId(ingredientCategorySelectOptions);
    const extrasDirty =
      ingredientModal.mode === "add" &&
      ingredientModal.isNewCreation &&
      (ingredientModalImageFile != null ||
        (defCat == null
          ? ingredientModalCategoryId != null
          : ingredientModalCategoryId !== defCat));
    const changed =
      ingredientModalQuantity.trim() !== originalQty.trim() ||
      ingredientModalUnit.trim() !== originalUnit.trim() ||
      extrasDirty;
    if (changed) {
      setIngredientDiscardConfirmOpen(true);
      return;
    }
    closeIngredientModal();
  };

  const saveIngredientFromModal = () => {
    if (!ingredientModal.open) return;
    setIngredientModalSaving(true);
    setIngredientModalError("");
    const quantityRaw = ingredientModalQuantity.trim();
    const quantity = quantityRaw.length > 0 ? quantityRaw : "0";
    const prev =
      ingredientModal.mode === "edit" && ingredientModal.rowKey
        ? ingredients.find((x) => x.key === ingredientModal.rowKey)
        : undefined;
    const isNewFlow = ingredientModal.mode === "add" && ingredientModal.isNewCreation;
    const normalized: IngredientRow = {
      key: ingredientModal.mode === "edit" && ingredientModal.rowKey ? ingredientModal.rowKey : makeLocalIngredient().key,
      recipeIngredientId:
        ingredientModal.mode === "edit" && ingredientModal.rowKey
          ? ingredients.find((x) => x.key === ingredientModal.rowKey)?.recipeIngredientId
          : undefined,
      ingredientName: ingredientModal.ingredientName.trim(),
      quantity,
      measurementUnit: ingredientModalUnit.trim(),
      ingredientImageUrl: isNewFlow
        ? null
        : ingredientModalImageUrl ?? prev?.ingredientImageUrl ?? null,
      ingredientCategoryId: isNewFlow ? ingredientModalCategoryId ?? undefined : prev?.ingredientCategoryId,
      pendingIngredientImage: isNewFlow
        ? ingredientModalImageFile ?? undefined
        : prev?.pendingIngredientImage,
    };
    if (!normalized.ingredientName) {
      setIngredientModalSaving(false);
      setIngredientModalError("El ingrediente no puede estar vacío.");
      return;
    }
    if (ingredientModal.mode === "edit" && ingredientModal.rowKey) {
      setIngredients((prev) => prev.map((x) => (x.key === ingredientModal.rowKey ? normalized : x)));
    } else {
      setIngredients((prev) => [...prev, normalized]);
    }
    closeIngredientModal();
  };

  const requestDeleteIngredientFromModal = () => {
    if (!ingredientModal.open || ingredientModal.mode !== "edit" || !ingredientModal.rowKey) return;
    setIngredientDeleteConfirmOpen(true);
  };

  const confirmDeleteIngredientFromModal = () => {
    if (!ingredientModal.open || ingredientModal.mode !== "edit" || !ingredientModal.rowKey) {
      setIngredientDeleteConfirmOpen(false);
      return;
    }
    removeIngredientRow(ingredientModal.rowKey);
    setIngredientDeleteConfirmOpen(false);
    closeIngredientModal();
  };

  const autoGrowTextarea = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  // Tras añadir un paso, dejamos el cursor en el textarea recién creado.
  // Hace falta esperar al siguiente frame porque addStepRow puede ser async
  // (espera al backend) y React aún no ha renderizado la fila nueva.
  const focusLastStepTextarea = () => {
    requestAnimationFrame(() => {
      const list = document.querySelector(".create-recipe-step-list");
      if (!list) return;
      const textareas = list.querySelectorAll<HTMLTextAreaElement>("textarea");
      const last = textareas[textareas.length - 1];
      last?.focus();
    });
  };

  const addStepRowAndFocus = async () => {
    await addStepRow();
    focusLastStepTextarea();
  };

  // Atajo Ctrl/Cmd + Enter en el último paso: añade un paso nuevo y mueve el
  // foco a él. En cualquier otro paso no hacemos nada (el usuario puede usar
  // Enter normal para saltos de línea dentro del paso).
  const handleStepKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>, isLast: boolean) => {
    if (!isLast) return;
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      void addStepRowAndFocus();
    }
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
      await refreshMedia();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "No se pudo reordenar.");
    }
  };

  const handleGlobalRemove = async (mediaId: number) => {
    if (!userId || recipeId == null) return;
    try {
      await deleteRecipeMedia(userId, recipeId, mediaId);
      await refreshMedia();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "No se pudo eliminar el archivo.");
    }
  };

  // Open the staging queue instead of uploading directly. Actual upload
  // happens in handleStagingConfirm once the user confirms.
  const handleGlobalFiles = (files: FileList | null) => {
    if (!files?.length) return;
    setStagingState({ open: true, files: Array.from(files), target: "global" });
    if (globalFileRef.current) globalFileRef.current.value = "";
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
      await refreshMedia();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "No se pudo reordenar.");
    }
  };

  const handleStepRemove = async (mediaId: number) => {
    if (!userId || recipeId == null) return;
    try {
      await deleteRecipeMedia(userId, recipeId, mediaId);
      await refreshMedia();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "No se pudo eliminar.");
    }
  };

  // Same as handleGlobalFiles but targeting a specific step.
  const handleStepFiles = (stepId: number, files: FileList | null) => {
    if (!files?.length) {
      if (stepFileRef.current) stepFileRef.current.value = "";
      setStepUploadTarget(null);
      return;
    }
    setStagingState({ open: true, files: Array.from(files), target: { stepId } });
    if (stepFileRef.current) stepFileRef.current.value = "";
    setStepUploadTarget(null);
  };

  // Rasterize edited images, then upload each item in order.
  // Videos and non-edited files are uploaded as-is.
  const handleStagingConfirm = async (
    items: Array<{ file: File; edits: ImageEdits | null }>,
  ) => {
    if (!userId || !stagingState || items.length === 0) {
      setStagingState(null);
      return;
    }
    const target = stagingState.target;
    if (target === "global") setUploadingGlobal(true);
    setSubmitError("");
    try {
      const rid = await ensureDraftId();
      for (const item of items) {
        let toUpload: File = item.file;
        if (
          item.edits &&
          hasEdits(item.edits) &&
          isEditableImage(item.file)
        ) {
          try {
            const blob = await applyImageEdits(item.file, item.edits);
            const baseName = item.file.name.replace(/\.[^.]+$/, "");
            toUpload = new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
          } catch (err) {
            // Fall back to the original file if rasterization fails.
            console.warn("No se pudo aplicar la edición, se sube el original.", err);
          }
        }
        if (target === "global") {
          await uploadRecipeMedia(userId, rid, toUpload);
        } else {
          await uploadRecipeMedia(userId, rid, toUpload, target.stepId);
        }
      }
      await refreshMedia(rid);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Error al subir archivos.");
    } finally {
      if (target === "global") setUploadingGlobal(false);
      setStagingState(null);
    }
  };

  // Fetch the existing image as a blob and open the editor on it.
  const handleEditExistingMedia = async (mediaId: number) => {
    // Locate the media in either the global gallery or any step.
    const fromGlobal = globalMedia.find((m) => m.mediaId === mediaId);
    const fromStep = !fromGlobal
      ? steps.flatMap((s) => s.media).find((m) => m.mediaId === mediaId)
      : null;
    const media = fromGlobal ?? fromStep;
    if (!media) return;
    if (media.contentType.startsWith("video/")) return;

    try {
      const res = await fetch(resolveMediaUrl(media.url), { credentials: "include" });
      if (!res.ok) throw new Error(`Error (${res.status}) al leer la imagen.`);
      const blob = await res.blob();
      setEditExistingState({
        mediaId,
        file: blob,
        fileName: `imagen-${mediaId}.jpg`,
        saving: false,
      });
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "No se pudo abrir la imagen.");
    }
  };

  // Rasterize, POST the replacement and refresh. Keeps the editor open on error.
  const handleEditExistingApply = async (edits: ImageEdits) => {
    if (!userId || recipeId == null || !editExistingState) return;
    setEditExistingState((s) => (s ? { ...s, saving: true, error: undefined } : s));
    try {
      const blob = await applyImageEdits(editExistingState.file, edits);
      const file = new File([blob], editExistingState.fileName, { type: "image/jpeg" });
      await replaceRecipeMediaContent(userId, recipeId, editExistingState.mediaId, file);
      await refreshMedia(recipeId);
      setEditExistingState(null);
    } catch (e) {
      setEditExistingState((s) =>
        s ? { ...s, saving: false, error: e instanceof Error ? e.message : "Error al guardar." } : s,
      );
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
    setPendingRouteExit(false);
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
      navigate(appendRecipeReturnNav(`/home/recipes/${rid}`, parseRecipeReturnNav(searchParams)));
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
      navigate(appendRecipeReturnNav(`/home/recipes/${rid}`, parseRecipeReturnNav(searchParams)));
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
              onEdit={(id) => void handleEditExistingMedia(id)}
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
            <span className="create-recipe-label">Categorías</span>
            <p className="create-recipe-hint">
              Opcional. Puedes marcar varias categorías o escribir nombres nuevos (se crearán al guardar). Si lo dejas
              vacío, se usará «{DEFAULT_CATEGORY}».
            </p>

            {(selectedCategoryIds.length > 0 || pendingNewCategoryNames.length > 0) && (
              <div className="create-recipe-chip-row">
                {selectedCategoryIds.map((id) => {
                  const label = categories.find((c) => c.categoryId === id)?.name ?? `#${id}`;
                  return (
                    <span key={`id-${id}`} className="create-recipe-chip">
                      <span className="create-recipe-chip__label">{label}</span>
                      <button
                        type="button"
                        className="create-recipe-chip__remove"
                        onClick={() => {
                          setSelectedCategoryIds((prev) => prev.filter((x) => x !== id));
                        }}
                        aria-label={`Quitar ${label}`}
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
                {pendingNewCategoryNames.map((name) => (
                  <span key={`new-${name}`} className="create-recipe-chip">
                    <span className="create-recipe-chip__label">{name}</span>
                    <button
                      type="button"
                      className="create-recipe-chip__remove"
                      onClick={() => {
                        setPendingNewCategoryNames((prev) => prev.filter((n) => n !== name));
                      }}
                      aria-label={`Quitar ${name}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="create-recipe-category-wrap" ref={categoryWrapRef}>
              <input
                className="create-recipe-input"
                value={categoryQuery}
                onChange={(e) => {
                  setCategoryQuery(e.target.value);
                  setCategoryDropdownOpen(true);
                }}
                onFocus={() => setCategoryDropdownOpen(true)}
                placeholder={loadingCats ? "Cargando categorías…" : "Buscar o añadir categoría…"}
                disabled={loadingCats || !!loadError}
                autoComplete="off"
              />
              {categoryDropdownOpen && !loadError && (
                <div className="create-recipe-category-dropdown" role="listbox" aria-label="Categorías">
                  {canOfferNewCategory && (
                    <button
                      type="button"
                      className="create-recipe-category-option create-recipe-category-option--new"
                      onClick={() => {
                        const n = trimmedCategoryQuery;
                        setPendingNewCategoryNames((prev) =>
                          prev.some((x) => x.trim().toLowerCase() === n.toLowerCase()) ? prev : [...prev, n],
                        );
                        setCategoryQuery("");
                        setCategoryDropdownOpen(false);
                      }}
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
                          setSelectedCategoryIds((prev) =>
                            prev.includes(c.categoryId) ? prev : [...prev, c.categoryId],
                          );
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
          </div>

          <div className="create-recipe-card create-recipe-card--ingredients">
            <div className="create-recipe-ingredients-head">
              <span className="create-recipe-label">Ingredientes</span>
            </div>
            <p className="create-recipe-hint">
              Busca un ingrediente y ábrelo en la ventana de cantidad/unidad para añadirlo.
            </p>

            <div className="create-recipe-ingredient-search" ref={ingredientsWrapRef}>
              <input
                className="create-recipe-input"
                value={ingredientSearch}
                onChange={(e) => {
                  setIngredientSearch(e.target.value);
                  setIngredientDropdownOpen(true);
                }}
                onFocus={() => setIngredientDropdownOpen(true)}
                placeholder="Buscar ingrediente..."
                autoComplete="off"
              />
              {ingredientDropdownOpen && ingredientSearch.trim().length > 0 && (
                <div className="create-recipe-ingredient-suggest" role="listbox" aria-label="Resultados ingredientes">
                  {ingredientSearchLoading && (
                    <div className="create-recipe-ingredient-suggest__item">Buscando...</div>
                  )}
                  {!ingredientSearchLoading &&
                    ingredientResults.map((s) => (
                      <button
                        key={s.ingredientId}
                        type="button"
                        className="create-recipe-ingredient-suggest__item"
                        onClick={() => openAddIngredientModal(s.name, false, s.imageUrl)}
                      >
                        {s.name}
                      </button>
                    ))}
                  {!ingredientSearchLoading &&
                    !ingredientResults.some(
                      (s) => s.name.trim().toLowerCase() === ingredientSearch.trim().toLowerCase(),
                    ) && (
                      <button
                        type="button"
                        className="create-recipe-ingredient-suggest__item create-recipe-ingredient-suggest__item--new"
                        onClick={() => openAddIngredientModal(ingredientSearch.trim(), true)}
                      >
                        Añadir "{ingredientSearch.trim()}"
                      </button>
                    )}
                </div>
              )}
            </div>

            <div className="create-recipe-ingredient-grid">
              {ingredients.map((row) => (
                <button
                  key={row.key}
                  type="button"
                  className="create-recipe-ingredient-card create-recipe-ingredient-card--summary"
                  onClick={() => openEditIngredientModal(row)}
                >
                  <span className="create-recipe-ingredient-summary__imageWrap">
                    <IngredientRowThumb
                      name={row.ingredientName}
                      imageUrl={row.ingredientImageUrl}
                      pendingImageFile={row.pendingIngredientImage}
                      size="card"
                    />
                  </span>
                  <span className="create-recipe-ingredient-summary__name">{row.ingredientName}</span>
                  <span className="create-recipe-ingredient-summary__bottom">
                    <span className="create-recipe-ingredient-summary__pill">{row.quantity || "0"}</span>
                    <span className="create-recipe-ingredient-summary__pill">
                      {row.measurementUnit || "sin unidad"}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="create-recipe-card create-recipe-card--steps">
            <div className="create-recipe-steps-head">
              <span className="create-recipe-label">Pasos</span>
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
                        onEdit={(id) => void handleEditExistingMedia(id)}
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
                    onKeyDown={(e) => handleStepKeyDown(e, index === steps.length - 1)}
                    placeholder={
                      index === steps.length - 1
                        ? "Describe este paso… (Ctrl+Enter para añadir otro)"
                        : "Describe este paso…"
                    }
                    rows={2}
                  />
                </li>
              ))}
            </ol>
            <button
              type="button"
              className="create-recipe-add-step create-recipe-add-step--bottom"
              onClick={() => void addStepRowAndFocus()}
              title="También puedes pulsar Ctrl+Enter en el último paso"
            >
              + Añadir paso
            </button>
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

      {editExistingState && (
        <ImageEditorDialog
          open
          file={editExistingState.file}
          fileName={editExistingState.fileName}
          previewContext="recipe"
          recipeTitle={isGenericDraftTitle(title) ? "Tu receta" : title.trim() || "Tu receta"}
          saving={editExistingState.saving}
          errorMessage={editExistingState.error}
          onCancel={() => setEditExistingState(null)}
          onApply={(edits) => void handleEditExistingApply(edits)}
        />
      )}

      <UploadStagingDialog
        open={stagingState?.open === true}
        files={stagingState?.files ?? []}
        contextLabel={
          stagingState?.target === "global"
            ? "Galería de la receta"
            : stagingState
              ? `Paso ${steps.findIndex((s) => s.stepId === (stagingState.target as { stepId: number }).stepId) + 1 || ""}`.trim() || "Paso"
              : undefined
        }
        recipeTitle={isGenericDraftTitle(title) ? "Tu receta" : title.trim() || "Tu receta"}
        isCoverCandidate={stagingState?.target === "global" && globalMedia.length === 0}
        onCancel={() => setStagingState(null)}
        onConfirm={(items) => void handleStagingConfirm(items)}
      />

      <IngredientEntryDialog
        open={ingredientModal.open}
        title="Ingrediente"
        ingredientName={ingredientModal.open ? ingredientModal.ingredientName : ""}
        quantityText={ingredientModalQuantity}
        unitText={ingredientModalUnit}
        units={units}
        loadingUnits={loadingUnits}
        saving={ingredientModalSaving}
        error={ingredientModalError}
        quantityLabel="Cantidad"
        unitLabel="Unidad de medida"
        availableUnitsLabel="Unidades disponibles"
        cancelLabel="Cancelar"
        confirmLabel={ingredientModal.open && ingredientModal.mode === "edit" ? "Guardar" : "Añadir"}
        showDelete={ingredientModal.open && ingredientModal.mode === "edit"}
        deleteLabel="Borrar"
        showCreateExtras={
          ingredientModal.open && ingredientModal.mode === "add" && Boolean(ingredientModal.isNewCreation)
        }
        ingredientCategoryOptions={ingredientCategorySelectOptions}
        selectedIngredientCategoryId={ingredientModalCategoryId}
        onSelectedIngredientCategoryIdChange={setIngredientModalCategoryId}
        createExtrasLabels={{
          imageHint:
            "Opcional. Puedes recortar y ajustar la foto como en las imágenes de la receta.",
        }}
        createImageFile={ingredientModalImageFile}
        onCreateImageFileChange={setIngredientModalImageFile}
        onQuantityChange={setIngredientModalQuantity}
        onUnitChange={setIngredientModalUnit}
        onRequestClose={requestCloseIngredientModal}
        onCancel={closeIngredientModal}
        onConfirm={saveIngredientFromModal}
        onDelete={requestDeleteIngredientFromModal}
      />

      <ConfirmDialog
        open={ingredientDeleteConfirmOpen}
        title="¿Eliminar este ingrediente?"
        message={
          ingredientModal.open
            ? `Se quitará "${ingredientModal.ingredientName}" de la receta. Podrás volver a añadirlo después.`
            : ""
        }
        cancelLabel="Cancelar"
        confirmLabel="Sí, eliminar"
        confirmVariant="danger"
        onCancel={() => setIngredientDeleteConfirmOpen(false)}
        onConfirm={confirmDeleteIngredientFromModal}
      />

      <ConfirmDialog
        open={ingredientDiscardConfirmOpen}
        title="¿Cerrar sin guardar?"
        message="Tienes cambios sin guardar en este ingrediente. Si cierras ahora, se perderán."
        cancelLabel="Seguir editando"
        confirmLabel="Cerrar igualmente"
        confirmVariant="danger"
        onCancel={() => setIngredientDiscardConfirmOpen(false)}
        onConfirm={() => {
          setIngredientDiscardConfirmOpen(false);
          closeIngredientModal();
        }}
      />

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
              if (pendingRouteExit && pendingRoutePath) {
                await discardWithoutNavigation();
                navigate(pendingRoutePath);
                setPendingRouteExit(false);
                setPendingRoutePath(null);
              } else {
                await discardAndExit();
              }
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
              if (isPublishedEditMode) {
                if (pendingRouteExit) {
                  setPendingRouteExit(false);
                  setPendingRoutePath(null);
                }
                return;
              }
              await saveCurrentAsDraft();
              if (pendingRouteExit && pendingRoutePath) {
                navigate(pendingRoutePath);
                setPendingRouteExit(false);
                setPendingRoutePath(null);
              } else {
                goAfterExit();
              }
            } catch (e) {
              setSubmitError(e instanceof Error ? e.message : "No se pudo guardar el borrador.");
              if (pendingRouteExit) {
                setPendingRouteExit(false);
                setPendingRoutePath(null);
              }
            } finally {
              setExitBusy(false);
            }
          })();
        }}
      />

    </section>
  );
}
