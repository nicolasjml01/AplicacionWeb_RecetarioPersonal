import { useCallback, useEffect, useMemo, useState } from "react";
import { getCurrentUser, getCurrentUserId } from "../auth/session";
import { logout } from "../api/auth";
import { useNavigate } from "react-router-dom";
import { deleteMealType, getMealTypes, updateMealType } from "../api/mealTypes";
import {
  deleteOwnedIngredient,
  deleteOwnedUnit,
  getIngredientsCatalog,
  getOwnedIngredients,
  getOwnedUnits,
  patchOwnedIngredient,
  updateOwnedUnit,
  uploadOwnedIngredientImage,
} from "../api/shopping";
import { ConfirmDialog } from "../components/recipe/editor/ConfirmDialog";
import { AccountPanelHeader } from "../components/account/AccountPanelHeader";
import { ManageableItemCard } from "../components/account/ManageableItemCard";
import { EditOwnedIngredientModal } from "../components/account/EditOwnedIngredientModal";
import { EditMealTypeModal } from "../components/account/EditMealTypeModal";
import { EditUnitModal } from "../components/account/EditUnitModal";
import { IngredientThumb } from "../components/ingredient/IngredientThumb";
import type { MealTypeDto } from "../types/calendar";
import type { IngredientDto, UnitOfMeasureDto } from "../types/shopping";
import {
  ingredientCategoriesForSelect,
  type IngredientCategoryOption,
} from "../utils/ingredientCatalogUi";

type Panel = "main" | "ingredients" | "mealTypes" | "units";

function groupIngredientsByCategory(
  items: IngredientDto[],
): { category: string; items: IngredientDto[] }[] {
  const map = new Map<string, IngredientDto[]>();
  for (const ing of items) {
    const cat = ing.categoryName?.trim() || "Sin categoría";
    const list = map.get(cat) ?? [];
    list.push(ing);
    map.set(cat, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "es", { sensitivity: "base" }))
    .map(([category, groupItems]) => ({
      category,
      items: groupItems.sort((a, b) =>
        a.name.localeCompare(b.name, "es", { sensitivity: "base" }),
      ),
    }));
}

export function Account() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const userId = getCurrentUserId();

  const [panel, setPanel] = useState<Panel>("main");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const [ownedIngredients, setOwnedIngredients] = useState<IngredientDto[]>([]);
  const [customMealTypes, setCustomMealTypes] = useState<MealTypeDto[]>([]);
  const [ownedUnits, setOwnedUnits] = useState<UnitOfMeasureDto[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<IngredientCategoryOption[]>([]);
  const [loadingIngredients, setLoadingIngredients] = useState(false);
  const [loadingMealTypes, setLoadingMealTypes] = useState(false);
  const [loadingUnits, setLoadingUnits] = useState(false);

  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [editingIngredient, setEditingIngredient] = useState<IngredientDto | null>(null);
  const [editingMealType, setEditingMealType] = useState<MealTypeDto | null>(null);
  const [editingUnit, setEditingUnit] = useState<UnitOfMeasureDto | null>(null);
  const [ingredientEditError, setIngredientEditError] = useState("");
  const [mealTypeEditError, setMealTypeEditError] = useState("");
  const [unitEditError, setUnitEditError] = useState("");
  const [savingIngredient, setSavingIngredient] = useState(false);
  const [savingMealType, setSavingMealType] = useState(false);
  const [savingUnit, setSavingUnit] = useState(false);

  const [pendingDeleteIngredient, setPendingDeleteIngredient] = useState<IngredientDto | null>(null);
  const [pendingDeleteMealType, setPendingDeleteMealType] = useState<MealTypeDto | null>(null);
  const [pendingDeleteUnit, setPendingDeleteUnit] = useState<UnitOfMeasureDto | null>(null);
  const [pendingLogout, setPendingLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [listSearch, setListSearch] = useState("");

  const loadCategoryOptions = useCallback(async () => {
    if (userId == null) return;
    const catalog = await getIngredientsCatalog(userId);
    setCategoryOptions(ingredientCategoriesForSelect(catalog));
  }, [userId]);

  const loadOwnedIngredients = useCallback(async () => {
    if (userId == null) return;
    setLoadingIngredients(true);
    setError("");
    try {
      const data = await getOwnedIngredients(userId);
      setOwnedIngredients(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar tus ingredientes.");
    } finally {
      setLoadingIngredients(false);
    }
  }, [userId]);

  const loadCustomMealTypes = useCallback(async () => {
    if (userId == null) return;
    setLoadingMealTypes(true);
    setError("");
    try {
      const all = await getMealTypes(userId);
      setCustomMealTypes(all.filter((m) => !m.system));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar los tipos de comida.");
    } finally {
      setLoadingMealTypes(false);
    }
  }, [userId]);

  const loadOwnedUnits = useCallback(async () => {
    if (userId == null) return;
    setLoadingUnits(true);
    setError("");
    try {
      const data = await getOwnedUnits(userId);
      setOwnedUnits(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar las unidades de medida.");
    } finally {
      setLoadingUnits(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId == null) return;
    void loadCategoryOptions();
  }, [userId, loadCategoryOptions]);

  useEffect(() => {
    if (panel === "ingredients" && userId != null) {
      void loadOwnedIngredients();
    }
  }, [panel, userId, loadOwnedIngredients]);

  useEffect(() => {
    if (panel === "mealTypes" && userId != null) {
      void loadCustomMealTypes();
    }
  }, [panel, userId, loadCustomMealTypes]);

  useEffect(() => {
    if (panel === "units" && userId != null) {
      void loadOwnedUnits();
    }
  }, [panel, userId, loadOwnedUnits]);

  const displayName = useMemo(() => {
    if (!user) return "Tu cuenta";
    const full = [user.name, user.lastName].filter(Boolean).join(" ").trim();
    return full || user.username;
  }, [user]);

  const goToMainPanel = () => {
    setPanel("main");
    setOpenMenuId(null);
    setListSearch("");
    setError("");
  };

  const openIngredientsPanel = () => {
    setPanel("ingredients");
    setNotice("");
    setError("");
    setOpenMenuId(null);
    setListSearch("");
  };

  const openMealTypesPanel = () => {
    setPanel("mealTypes");
    setNotice("");
    setError("");
    setOpenMenuId(null);
    setListSearch("");
  };

  const openUnitsPanel = () => {
    setPanel("units");
    setNotice("");
    setError("");
    setOpenMenuId(null);
    setListSearch("");
  };

  const searchKey = listSearch.trim().toLowerCase();

  const filteredIngredients = useMemo(() => {
    if (!searchKey) return ownedIngredients;
    return ownedIngredients.filter((ing) => {
      const haystack = `${ing.name} ${ing.categoryName ?? ""}`.toLowerCase();
      return haystack.includes(searchKey);
    });
  }, [ownedIngredients, searchKey]);

  const ingredientGroups = useMemo(
    () => groupIngredientsByCategory(filteredIngredients),
    [filteredIngredients],
  );

  const filteredMealTypes = useMemo(() => {
    if (!searchKey) return customMealTypes;
    return customMealTypes.filter((mt) => mt.name.toLowerCase().includes(searchKey));
  }, [customMealTypes, searchKey]);

  const filteredUnits = useMemo(() => {
    if (!searchKey) return ownedUnits;
    return ownedUnits.filter((u) => {
      const haystack = `${u.name} ${u.symbol ?? ""}`.toLowerCase();
      return haystack.includes(searchKey);
    });
  }, [ownedUnits, searchKey]);

  const handleSaveIngredient = async (
    name: string,
    categoryId: number | null,
    imageFile: File | null,
  ) => {
    if (userId == null || editingIngredient == null) return;
    setSavingIngredient(true);
    setIngredientEditError("");
    try {
      let updated = await patchOwnedIngredient(userId, editingIngredient.ingredientId, {
        name,
        ingredientCategoryId: categoryId,
      });
      if (imageFile) {
        updated = await uploadOwnedIngredientImage(
          userId,
          editingIngredient.ingredientId,
          imageFile,
        );
      }
      setOwnedIngredients((prev) =>
        prev
          .map((i) => (i.ingredientId === updated.ingredientId ? updated : i))
          .sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" })),
      );
      setEditingIngredient(null);
      setNotice(`Ingrediente "${updated.name}" actualizado.`);
    } catch (e) {
      setIngredientEditError(e instanceof Error ? e.message : "No se pudo guardar el ingrediente.");
    } finally {
      setSavingIngredient(false);
    }
  };

  const handleSaveMealType = async (name: string) => {
    if (userId == null || editingMealType == null) return;
    setSavingMealType(true);
    setMealTypeEditError("");
    try {
      const updated = await updateMealType(userId, editingMealType.mealTypeId, { name });
      setCustomMealTypes((prev) =>
        prev
          .map((m) => (m.mealTypeId === updated.mealTypeId ? updated : m))
          .sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" })),
      );
      setEditingMealType(null);
      setNotice(`Tipo "${updated.name}" actualizado.`);
    } catch (e) {
      setMealTypeEditError(e instanceof Error ? e.message : "No se pudo guardar el tipo de comida.");
    } finally {
      setSavingMealType(false);
    }
  };

  const handleConfirmDeleteIngredient = async () => {
    if (userId == null || pendingDeleteIngredient == null) return;
    setDeleting(true);
    setError("");
    try {
      const res = await deleteOwnedIngredient(userId, pendingDeleteIngredient.ingredientId);
      setOwnedIngredients((prev) =>
        prev.filter((i) => i.ingredientId !== pendingDeleteIngredient.ingredientId),
      );
      setPendingDeleteIngredient(null);
      setNotice(res.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar el ingrediente.");
      setPendingDeleteIngredient(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveUnit = async (name: string, symbol: string) => {
    if (userId == null || editingUnit == null) return;
    setSavingUnit(true);
    setUnitEditError("");
    try {
      const updated = await updateOwnedUnit(userId, editingUnit.unitId, { name, symbol });
      setOwnedUnits((prev) =>
        prev
          .map((u) => (u.unitId === updated.unitId ? updated : u))
          .sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" })),
      );
      setEditingUnit(null);
      setNotice(`Unidad "${updated.name}" actualizada.`);
    } catch (e) {
      setUnitEditError(e instanceof Error ? e.message : "No se pudo guardar la unidad.");
    } finally {
      setSavingUnit(false);
    }
  };

  const handleConfirmDeleteUnit = async () => {
    if (userId == null || pendingDeleteUnit == null) return;
    setDeleting(true);
    setError("");
    try {
      const res = await deleteOwnedUnit(userId, pendingDeleteUnit.unitId);
      setOwnedUnits((prev) => prev.filter((u) => u.unitId !== pendingDeleteUnit.unitId));
      setPendingDeleteUnit(null);
      setNotice(res.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar la unidad.");
      setPendingDeleteUnit(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleConfirmLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cerrar la sesión.");
      setPendingLogout(false);
    } finally {
      setLoggingOut(false);
    }
  };

  const handleConfirmDeleteMealType = async () => {
    if (userId == null || pendingDeleteMealType == null) return;
    setDeleting(true);
    setError("");
    try {
      const res = await deleteMealType(userId, pendingDeleteMealType.mealTypeId);
      setCustomMealTypes((prev) =>
        prev.filter((m) => m.mealTypeId !== pendingDeleteMealType.mealTypeId),
      );
      setPendingDeleteMealType(null);
      setNotice(res.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar el tipo de comida.");
      setPendingDeleteMealType(null);
    } finally {
      setDeleting(false);
    }
  };

  if (userId == null) {
    return (
      <div className="account-page">
        <h1 className="account-page__title">Cuenta</h1>
        <p className="account-page__hint">Inicia sesión para gestionar tu cuenta.</p>
      </div>
    );
  }

  return (
    <div className="account-page">
      {panel === "main" ? (
        <>
          <header className="account-page__hero">
            <h1 className="account-page__title">Cuenta</h1>
            <p className="account-page__greeting">Hola, {displayName}</p>
            {user?.email && <p className="account-page__meta">{user.email}</p>}
          </header>

          <div className="account-page__action-grid">
            <button
              type="button"
              className="account-page__action-card"
              onClick={openMealTypesPanel}
            >
              <span className="account-page__action-card-title">Tipos de comida</span>
              <span className="account-page__action-card-desc">
                Edita o elimina categorías personalizadas del calendario (Merienda, Brunch…).
              </span>
            </button>
            <button
              type="button"
              className="account-page__action-card"
              onClick={openIngredientsPanel}
            >
              <span className="account-page__action-card-title">Ingredientes propios</span>
              <span className="account-page__action-card-desc">
                Renombra, reclasifica o borra ingredientes que hayas creado tú.
              </span>
            </button>
            <button
              type="button"
              className="account-page__action-card"
              onClick={openUnitsPanel}
            >
              <span className="account-page__action-card-title">Unidades de medida</span>
              <span className="account-page__action-card-desc">
                Edita o elimina unidades personalizadas y sus abreviaturas (chrd, ml…).
              </span>
            </button>
            <button
              type="button"
              className="account-page__action-card account-page__action-card--logout"
              onClick={() => setPendingLogout(true)}
            >
              <span className="account-page__action-card-title">Cerrar sesión</span>
              <span className="account-page__action-card-desc">
                Salir de la cuenta en este dispositivo
              </span>
            </button>
          </div>
        </>
      ) : (
        <>
          <AccountPanelHeader
            title={
              panel === "ingredients"
                ? "Mis ingredientes"
                : panel === "mealTypes"
                  ? "Tipos de comida"
                  : "Unidades de medida"
            }
            onBack={goToMainPanel}
          />
          <p className="account-page__hint account-page__hint--panel">
            {panel === "ingredients"
              ? "Solo ingredientes creados por ti, agrupados por categoría."
              : panel === "mealTypes"
                ? "Solo tipos personalizados (no Desayuno, Comida ni Cena)."
                : "Solo unidades que hayas creado al escribir recetas o la cesta (Gramo, ml… son del sistema)."}
          </p>

          {notice && <p className="account-page__notice">{notice}</p>}
          {error && <p className="home-error">{error}</p>}

          <div className="account-page__toolbar">
            <input
              type="search"
              className="form-input account-page__search"
              placeholder={
                panel === "ingredients"
                  ? "Buscar ingrediente o categoría…"
                  : panel === "mealTypes"
                    ? "Buscar tipo de comida…"
                    : "Buscar unidad o abreviatura…"
              }
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
              aria-label="Buscar en la lista"
            />
            {panel === "ingredients" && ownedIngredients.length > 0 && (
              <span className="account-page__count">
                {filteredIngredients.length} de {ownedIngredients.length}
              </span>
            )}
            {panel === "mealTypes" && customMealTypes.length > 0 && (
              <span className="account-page__count">
                {filteredMealTypes.length} de {customMealTypes.length}
              </span>
            )}
            {panel === "units" && ownedUnits.length > 0 && (
              <span className="account-page__count">
                {filteredUnits.length} de {ownedUnits.length}
              </span>
            )}
          </div>

          {panel === "ingredients" && (
            <div className="account-manage-panel">
              {loadingIngredients && ownedIngredients.length === 0 ? (
                <p className="account-page__hint">Cargando ingredientes…</p>
              ) : ownedIngredients.length === 0 ? (
                <p className="account-page__hint">Aún no has creado ningún ingrediente propio.</p>
              ) : filteredIngredients.length === 0 ? (
                <p className="account-page__hint">Ningún ingrediente coincide con la búsqueda.</p>
              ) : (
                ingredientGroups.map((group) => (
                  <section key={group.category} className="account-manage-section">
                    <h2 className="account-manage-section__title">
                      {group.category}
                      <span className="account-manage-section__count">{group.items.length}</span>
                    </h2>
                    <div className="account-manage-grid">
                      {group.items.map((ing) => (
                        <ManageableItemCard
                          key={ing.ingredientId}
                          id={ing.ingredientId}
                          title={ing.name}
                          variant="tile"
                          leading={
                            <IngredientThumb
                              name={ing.name}
                              imageUrl={ing.imageUrl}
                              size="card"
                              alt={ing.name}
                            />
                          }
                          openMenuId={openMenuId}
                          onToggleMenu={(id) => setOpenMenuId((prev) => (prev === id ? null : id))}
                          onCloseMenu={() => setOpenMenuId(null)}
                          onEdit={() => {
                            setOpenMenuId(null);
                            setIngredientEditError("");
                            setEditingIngredient(ing);
                          }}
                          onDelete={() => {
                            setOpenMenuId(null);
                            setPendingDeleteIngredient(ing);
                          }}
                          disabled={deleting}
                        />
                      ))}
                    </div>
                  </section>
                ))
              )}
            </div>
          )}

          {panel === "units" && (
            <div className="account-manage-panel">
              {loadingUnits && ownedUnits.length === 0 ? (
                <p className="account-page__hint">Cargando unidades…</p>
              ) : ownedUnits.length === 0 ? (
                <p className="account-page__hint">
                  Aún no has creado unidades propias. Al escribir una unidad nueva en una receta o en la
                  cesta, aparecerá aquí para que puedas ponerle abreviatura.
                </p>
              ) : filteredUnits.length === 0 ? (
                <p className="account-page__hint">Ninguna unidad coincide con la búsqueda.</p>
              ) : (
                <div className="account-manage-grid">
                  {filteredUnits.map((u) => (
                    <ManageableItemCard
                      key={u.unitId}
                      id={u.unitId}
                      title={u.name}
                      subtitle={u.symbol ? `Abrev.: ${u.symbol}` : undefined}
                      variant="tile"
                      avatarLetter={u.name.charAt(0).toUpperCase()}
                      openMenuId={openMenuId}
                      onToggleMenu={(id) => setOpenMenuId((prev) => (prev === id ? null : id))}
                      onCloseMenu={() => setOpenMenuId(null)}
                      onEdit={() => {
                        setOpenMenuId(null);
                        setUnitEditError("");
                        setEditingUnit(u);
                      }}
                      onDelete={() => {
                        setOpenMenuId(null);
                        setPendingDeleteUnit(u);
                      }}
                      disabled={deleting}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {panel === "mealTypes" && (
            <div className="account-manage-panel">
              {loadingMealTypes && customMealTypes.length === 0 ? (
                <p className="account-page__hint">Cargando tipos…</p>
              ) : customMealTypes.length === 0 ? (
                <p className="account-page__hint">
                  No tienes tipos personalizados. Puedes crearlos desde el calendario con el botón +.
                </p>
              ) : filteredMealTypes.length === 0 ? (
                <p className="account-page__hint">Ningún tipo coincide con la búsqueda.</p>
              ) : (
                <div className="account-manage-grid">
                  {filteredMealTypes.map((mt) => (
                    <ManageableItemCard
                      key={mt.mealTypeId}
                      id={mt.mealTypeId}
                      title={mt.name}
                      variant="tile"
                      avatarLetter={mt.name.charAt(0).toUpperCase()}
                      openMenuId={openMenuId}
                      onToggleMenu={(id) => setOpenMenuId((prev) => (prev === id ? null : id))}
                      onCloseMenu={() => setOpenMenuId(null)}
                      onEdit={() => {
                        setOpenMenuId(null);
                        setMealTypeEditError("");
                        setEditingMealType(mt);
                      }}
                      onDelete={() => {
                        setOpenMenuId(null);
                        setPendingDeleteMealType(mt);
                      }}
                      disabled={deleting}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <EditOwnedIngredientModal
        open={editingIngredient != null}
        ingredient={editingIngredient}
        categoryOptions={categoryOptions}
        saving={savingIngredient}
        error={ingredientEditError}
        onClose={() => !savingIngredient && setEditingIngredient(null)}
        onSave={(name, categoryId, imageFile) =>
          void handleSaveIngredient(name, categoryId, imageFile)
        }
      />

      <EditMealTypeModal
        open={editingMealType != null}
        mealType={editingMealType}
        saving={savingMealType}
        error={mealTypeEditError}
        onClose={() => !savingMealType && setEditingMealType(null)}
        onSave={(name) => void handleSaveMealType(name)}
      />

      <EditUnitModal
        open={editingUnit != null}
        unit={editingUnit}
        saving={savingUnit}
        error={unitEditError}
        onClose={() => !savingUnit && setEditingUnit(null)}
        onSave={(name, symbol) => void handleSaveUnit(name, symbol)}
      />

      <ConfirmDialog
        open={pendingDeleteIngredient != null}
        title="¿Eliminar este ingrediente?"
        message={
          pendingDeleteIngredient
            ? `Se borrará "${pendingDeleteIngredient.name}" y se quitará de tus recetas, la cesta y recientes. Esta acción no se puede deshacer.`
            : ""
        }
        cancelLabel="Cancelar"
        confirmLabel={deleting ? "Eliminando…" : "Sí, eliminar"}
        confirmVariant="danger"
        onCancel={() => {
          if (!deleting) setPendingDeleteIngredient(null);
        }}
        onConfirm={() => void handleConfirmDeleteIngredient()}
      />

      <ConfirmDialog
        open={pendingDeleteUnit != null}
        title="¿Eliminar esta unidad de medida?"
        message={
          pendingDeleteUnit
            ? `Se borrará "${pendingDeleteUnit.name}" y las líneas de recetas y la cesta que la usen quedarán sin unidad. Esta acción no se puede deshacer.`
            : ""
        }
        cancelLabel="Cancelar"
        confirmLabel={deleting ? "Eliminando…" : "Sí, eliminar"}
        confirmVariant="danger"
        onCancel={() => {
          if (!deleting) setPendingDeleteUnit(null);
        }}
        onConfirm={() => void handleConfirmDeleteUnit()}
      />

      <ConfirmDialog
        open={pendingDeleteMealType != null}
        title="¿Eliminar este tipo de comida?"
        message={
          pendingDeleteMealType
            ? `Se borrará "${pendingDeleteMealType.name}" y las planificaciones del calendario que lo usen. Esta acción no se puede deshacer.`
            : ""
        }
        cancelLabel="Cancelar"
        confirmLabel={deleting ? "Eliminando…" : "Sí, eliminar"}
        confirmVariant="danger"
        onCancel={() => {
          if (!deleting) setPendingDeleteMealType(null);
        }}
        onConfirm={() => void handleConfirmDeleteMealType()}
      />

      <ConfirmDialog
        open={pendingLogout}
        title="¿Cerrar sesión?"
        message="Saldrás de tu cuenta en este dispositivo. Tendrás que volver a iniciar sesión para acceder."
        cancelLabel="Cancelar"
        confirmLabel={loggingOut ? "Cerrando…" : "Sí, cerrar sesión"}
        confirmVariant="danger"
        onCancel={() => {
          if (!loggingOut) setPendingLogout(false);
        }}
        onConfirm={() => void handleConfirmLogout()}
      />
    </div>
  );
}
