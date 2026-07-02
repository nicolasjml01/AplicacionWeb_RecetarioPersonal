import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDropdownPlacement } from "../hooks/useDropdownPlacement";
import { useOverlayDismiss } from "../hooks/useOverlayDismiss";
import { getCurrentUserId } from "../auth/session";
import type {
  IngredientCategoryCatalogDto,
  IngredientDto,
  ShoppingListItemDto,
  UnitOfMeasureDto,
} from "../types/shopping";
import {
  addShoppingItem,
  getIngredientsCatalog,
  getShoppingList,
  getUnits,
  patchShoppingItem,
  searchIngredients,
  uploadOwnedIngredientImage,
} from "../api/shopping";
import { IngredientEntryDialog } from "../components/ingredient/IngredientEntryDialog";
import { IngredientCatalogTile } from "../components/ingredient/IngredientCatalogTile";
import { IngredientThumb } from "../components/ingredient/IngredientThumb";
import {
  collectCatalogImageUrls,
  collectIngredientImageUrls,
  preloadImages,
} from "../utils/preloadImages";
import {
  defaultIngredientCategoryId,
  ingredientCategoriesForSelect,
} from "../utils/ingredientCatalogUi";
type ModalState =
  | {
      open: false;
    }
  | {
      open: true;
      mode: "add";
      ingredientName: string;
      /** True when the name was not chosen from search/catalog (brand-new ingredient). */
      isNewIngredient: boolean;
    }
  | {
      open: true;
      mode: "edit";
      itemId: number;
      ingredientToEdit: string;
    };

export function Shopping() {
  const userId = getCurrentUserId();

  const [shoppingItems, setShoppingItems] = useState<ShoppingListItemDto[]>([]);
  const [catalogCategories, setCatalogCategories] = useState<
    IngredientCategoryCatalogDto[]
  >([]);
  const [expandedCategories, setExpandedCategories] = useState<
    Record<number, boolean>
  >({});
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [catalogError, setCatalogError] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState<string>("");

  const [units, setUnits] = useState<UnitOfMeasureDto[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [unitsError, setUnitsError] = useState<string>("");

  // Ingredient search UI
  const [search, setSearch] = useState("");
  const [ingredientResults, setIngredientResults] = useState<IngredientDto[]>(
    [],
  );
  const [searchError, setSearchError] = useState<string>("");
  const [searchLoading, setSearchLoading] = useState(false);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchWrapRef = useRef<HTMLDivElement | null>(null);

  // Modal state
  const [modal, setModal] = useState<ModalState>({ open: false });
  const [quantityText, setQuantityText] = useState("");
  const [unitText, setUnitText] = useState("");
  const [modalError, setModalError] = useState<string>("");

  const [saving, setSaving] = useState(false);
  const [newIngredientCategoryId, setNewIngredientCategoryId] = useState<number | null>(null);
  const [newIngredientImageFile, setNewIngredientImageFile] = useState<File | null>(null);

  const ingredientCategorySelectOptions = useMemo(
    () => ingredientCategoriesForSelect(catalogCategories),
    [catalogCategories],
  );

  async function loadList() {
    if (userId == null) return;
    setLoadingList(true);
    setListError("");
    try {
      const data = await getShoppingList(userId);
      setShoppingItems(data);
      preloadImages(collectIngredientImageUrls(data.map((item) => item.ingredient)));
    } catch (e) {
      setListError(
        e instanceof Error ? e.message : "No se pudo cargar la lista de la compra.",
      );
    } finally {
      setLoadingList(false);
    }
  }

  async function loadUnits() {
    if (userId == null) return;
    setLoadingUnits(true);
    setUnitsError("");
    try {
      const data = await getUnits(userId);
      setUnits(data);
    } catch (e) {
      setUnitsError(e instanceof Error ? e.message : "No se pudieron cargar las unidades.");
    } finally {
      setLoadingUnits(false);
    }
  }

  async function loadCatalog() {
    if (userId == null) return;
    setLoadingCatalog(true);
    setCatalogError("");
    try {
      const data = await getIngredientsCatalog(userId);
      setCatalogCategories(data);
      preloadImages(collectCatalogImageUrls(data));

      // Keep previous accordion state. New categories start collapsed.
      setExpandedCategories((prev) => {
        const nextExpanded: Record<number, boolean> = {};
        for (const c of data) {
          nextExpanded[c.categoryId] = prev[c.categoryId] ?? false;
        }
        return nextExpanded;
      });
    } catch (e) {
      setCatalogError(
        e instanceof Error ? e.message : "No se pudo cargar el catálogo de ingredientes.",
      );
    } finally {
      setLoadingCatalog(false);
    }
  }

  // Initial loads
  useEffect(() => {
    loadUnits();
  }, []);

  useEffect(() => {
    if (userId == null) return;
    loadCatalog();
  }, [userId]);

  useEffect(() => {
    if (userId == null) return;
    loadList();
  }, [userId]);

  // Debounced ingredient search
  useEffect(() => {
    const q = search.trim();
    if (!q) {
      setIngredientResults([]);
      setSearchError("");
      return;
    }
    if (userId == null) {
      setIngredientResults([]);
      return;
    }

    const handle = window.setTimeout(async () => {
      setSearchLoading(true);
      setSearchError("");
      try {
        const results = await searchIngredients(userId, q);
        setIngredientResults(results);
        preloadImages(collectIngredientImageUrls(results));
      } catch (e) {
        setSearchError(
          e instanceof Error ? e.message : "No se pudieron buscar ingredientes.",
        );
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => window.clearTimeout(handle);
  }, [search, userId]);

  const selectedIngredientName =
    modal.open && modal.mode === "add" ? modal.ingredientName : undefined;
  const editItemId = modal.open && modal.mode === "edit" ? modal.itemId : undefined;
  const isNewIngredientModal = modal.open && modal.mode === "add" && modal.isNewIngredient;

  const showSearchDropdown =
    ingredientResults.length > 0 ||
    (search.trim() !== "" && !searchLoading && !searchError);

  const { placement: searchDropdownPlacement, maxHeight: searchDropdownMaxHeight } =
    useDropdownPlacement(searchWrapRef, showSearchDropdown);

  const closeSearchDropdown = useCallback(() => {
    setSearch("");
    setIngredientResults([]);
    setSearchError("");
    searchInputRef.current?.blur();
  }, []);

  useOverlayDismiss({
    enabled: showSearchDropdown,
    containerRef: searchWrapRef,
    onDismiss: closeSearchDropdown,
  });

  function openAddModal(ingredientName: string, isNewIngredient: boolean) {
    setModal({ open: true, mode: "add", ingredientName, isNewIngredient });
    setQuantityText("");
    setUnitText("");
    setModalError("");
    setSaving(false);
    setNewIngredientImageFile(null);
    setNewIngredientCategoryId(
      isNewIngredient ? defaultIngredientCategoryId(ingredientCategorySelectOptions) : null,
    );
  }

  function openEditModal(item: ShoppingListItemDto) {
    setModal({
      open: true,
      mode: "edit",
      itemId: item.shoppingListItemId,
      ingredientToEdit: item.ingredient.name,
    });
    setQuantityText(String(item.quantity));
    setUnitText(item.unitOfMeasure?.name ?? "");
    setModalError("");
    setSaving(false);
  }

  function closeModal() {
    setModal({ open: false });
    setModalError("");
    setSaving(false);
    setNewIngredientCategoryId(null);
    setNewIngredientImageFile(null);
  }

  function toggleCategory(categoryId: number) {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  }

  async function handleSaveModal() {
    if (!modal.open) return;

    if (userId == null) {
      setModalError("Debes iniciar sesión.");
      return;
    }

    const qty = Number(quantityText);
    if (!Number.isFinite(qty) || qty < 0) {
      setModalError("La cantidad debe ser un número mayor o igual que 0.");
      return;
    }

    const measurementUnit = unitText.trim(); // Backend allows blank -> no unit.

    setSaving(true);
    setModalError("");

    try {
      if (modal.mode === "add") {
        const ingredientName = selectedIngredientName;
        if (!ingredientName) throw new Error("Falta el nombre del ingrediente.");

        const isNew = modal.isNewIngredient;
        const created = await addShoppingItem(userId, {
          ingredientName,
          quantity: qty,
          measurementUnit,
          ...(isNew && newIngredientCategoryId != null
            ? { ingredientCategoryId: newIngredientCategoryId }
            : {}),
        });

        if (isNew && newIngredientImageFile) {
          await uploadOwnedIngredientImage(
            userId,
            created.ingredient.ingredientId,
            newIngredientImageFile,
          );
        }

        closeModal();
        await loadList();
        await loadCatalog();
        setSearch("");
        return;
      }

      // Edit mode: update quantity/unit only.
      if (editItemId == null) throw new Error("Falta el identificador del ítem a editar.");

      await patchShoppingItem(userId, editItemId, {
        quantity: qty,
        measurementUnit,
      });

      closeModal();
      await loadList();
    } catch (e) {
      setModalError(e instanceof Error ? e.message : "No se pudo guardar el ítem.");
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkBought(itemId: number) {
    if (userId == null) return;
    try {
      await patchShoppingItem(userId, itemId, { bought: true });
      await loadList();
      await loadCatalog();
    } catch (e) {
      setListError(
        e instanceof Error ? e.message : "No se pudo marcar como comprado.",
      );
    }
  }

  return (
    <div className="shopping-page">
      <h1 className="shopping-title">Lista de la compra</h1>
      <div className="shopping-layout shopping-layout--list-first">
        {/* LEFT: categories catalog (fixed on desktop/tablet) */}
        <section className="shopping-layout__left">
          <div className="shopping-panel shopping-panel--catalog">
            <div className="shopping-panel__title">Categorías</div>
            <section className="shopping-catalog">
              {loadingCatalog ? (
                <div className="shopping-hint">Cargando categorías…</div>
              ) : (
                catalogCategories.map((cat) => {
                  const isOpen = expandedCategories[cat.categoryId] ?? false;
                  const isOwn = ["propios", "propio", "own"].includes(
                    cat.categoryName.trim().toLowerCase(),
                  );

                  return (
                    <div key={cat.categoryId} className="shopping-accordion">
                      <button
                        type="button"
                        className="shopping-accordion__header"
                        onClick={() => toggleCategory(cat.categoryId)}
                      >
                        <span>{cat.categoryName}</span>
                        <span>{isOpen ? "▾" : "▸"}</span>
                      </button>

                      <div className="shopping-accordion__body" hidden={!isOpen}>
                          {cat.ingredients.length === 0 ? (
                            isOwn ? (
                              <div className="shopping-hint">Aún no hay ingredientes.</div>
                            ) : (
                              <div className="shopping-hint">Categoría vacía.</div>
                            )
                          ) : (
                            <div className="shopping-catalog-grid">
                              {cat.ingredients.map((ing) => (
                                <IngredientCatalogTile
                                  key={ing.ingredientId}
                                  name={ing.name}
                                  imageUrl={ing.imageUrl}
                                  onClick={() => openAddModal(ing.name, false)}
                                />
                              ))}
                            </div>
                          )}
                      </div>
                    </div>
                  );
                })
              )}
              {catalogError && <div className="shopping-error">{catalogError}</div>}
            </section>
          </div>
        </section>

        {/* RIGHT: shopping list + search */}
        <section className="shopping-layout__right">
          <div className="shopping-panel shopping-panel--list">
            <div className="shopping-panel__title">Tu lista</div>
            <section className="shopping-top-strip">
              {loadingList ? (
                <div className="shopping-hint">Cargando lista…</div>
              ) : shoppingItems.length === 0 ? (
                <div className="shopping-hint">No hay nada en la lista por ahora.</div>
              ) : (
                shoppingItems.map((item) => {
                  const unitLabel =
                    item.unitOfMeasure?.symbol && item.unitOfMeasure.symbol !== ""
                      ? item.unitOfMeasure.symbol
                      : (item.unitOfMeasure?.name ?? "—");

                  return (
                    <div className="shopping-top-card" key={item.shoppingListItemId}>
                      <button
                        type="button"
                        className="shopping-top-card__imageBtn"
                        onClick={() => handleMarkBought(item.shoppingListItemId)}
                        aria-label={`Marcar ${item.ingredient.name} como comprado`}
                      >
                        <IngredientThumb
                          name={item.ingredient.name}
                          imageUrl={item.ingredient.imageUrl}
                          size="card"
                          alt={item.ingredient.name}
                        />
                      </button>

                      <div className="shopping-top-card__name">{item.ingredient.name}</div>

                      <div className="shopping-top-card__bottom">
                        <button
                          type="button"
                          className="shopping-top-card__editBtn"
                          onClick={() => openEditModal(item)}
                        >
                          {item.quantity}
                        </button>
                        <button
                          type="button"
                          className="shopping-top-card__editBtn"
                          onClick={() => openEditModal(item)}
                        >
                          {unitLabel}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </section>
            {listError && <div className="shopping-error shopping-error--top">{listError}</div>}
          </div>

          <section className="shopping-search-fixed">
            {showSearchDropdown && (
              <button
                type="button"
                className="shopping-search-overlay"
                aria-label="Cerrar resultados de búsqueda"
                onClick={closeSearchDropdown}
              />
            )}
            <div className="shopping-search" ref={searchWrapRef}>
              <button
                type="button"
                className="shopping-plus"
                aria-label="Enfocar búsqueda"
                onClick={() => searchInputRef.current?.focus()}
              >
                +
              </button>

              <input
                ref={searchInputRef}
                className="shopping-search__input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar ingredientes…"
              />

              {showSearchDropdown && (
                <div
                  className={`shopping-search__dropdown shopping-search__dropdown--${searchDropdownPlacement}`}
                  role="listbox"
                  aria-label="Resultados de ingredientes"
                  style={{ maxHeight: searchDropdownMaxHeight }}
                >
                  {ingredientResults.map((ing) => (
                    <button
                      key={ing.ingredientId}
                      type="button"
                      className="shopping-search__result"
                      onClick={() => {
                        openAddModal(ing.name, false);
                        closeSearchDropdown();
                      }}
                    >
                      <IngredientThumb
                        name={ing.name}
                        imageUrl={ing.imageUrl}
                        size="compact"
                        alt={ing.name}
                      />
                      <span className="shopping-search__result-label">{ing.name}</span>
                    </button>
                  ))}
                  {search.trim() &&
                    !ingredientResults.some(
                      (ing) =>
                        ing.name.trim().toLowerCase() ===
                        search.trim().toLowerCase(),
                    ) && (
                      <button
                        type="button"
                        className="shopping-search__result"
                        onClick={() => {
                          openAddModal(search.trim(), true);
                          closeSearchDropdown();
                        }}
                      >
                        Añadir «{search.trim()}»
                      </button>
                    )}
                </div>
              )}
            </div>

            {searchLoading && <div className="shopping-hint">Buscando…</div>}
            {searchError && <div className="shopping-error">{searchError}</div>}
            {unitsError && <div className="shopping-error">{unitsError}</div>}
          </section>
        </section>
      </div>

      <IngredientEntryDialog
        open={modal.open}
        title={
          modal.open ? (modal.mode === "add" ? "Añadir a la lista" : "Editar ítem") : "Añadir a la lista"
        }
        ingredientName={
          modal.open
            ? modal.mode === "add"
              ? modal.ingredientName
              : modal.ingredientToEdit
            : ""
        }
        quantityText={quantityText}
        unitText={unitText}
        units={units}
        loadingUnits={loadingUnits}
        saving={saving}
        error={modalError}
        quantityLabel="Cantidad"
        unitLabel="Unidad de medida"
        availableUnitsLabel="Unidades disponibles"
        cancelLabel="Cancelar"
        confirmLabel="Guardar"
        quantityPlaceholder="p. ej. 2"
        unitPlaceholder="p. ej. gramos, litros, unidades…"
        showCreateExtras={isNewIngredientModal}
        createExtrasLabels={{
          category: "Categoría en tu despensa",
          imageHint:
            "Opcional. Puedes recortar y ajustar como en las fotos de la receta.",
          pickImage: "Elegir foto",
          editImage: "Editar foto",
          removeImage: "Quitar foto",
        }}
        ingredientCategoryOptions={ingredientCategorySelectOptions}
        selectedIngredientCategoryId={newIngredientCategoryId}
        onSelectedIngredientCategoryIdChange={setNewIngredientCategoryId}
        createImageFile={newIngredientImageFile}
        onCreateImageFileChange={setNewIngredientImageFile}
        onQuantityChange={setQuantityText}
        onUnitChange={setUnitText}
        onCancel={closeModal}
        onConfirm={() => void handleSaveModal()}
      />
    </div>
  );
}
