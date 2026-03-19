import { useEffect, useMemo, useRef, useState } from 'react';
import { getCurrentUserId } from '../auth/session';
import type { IngredientDto, ShoppingListItemDto, UnitOfMeasureDto } from '../types/shopping';
import { addShoppingItem, getShoppingList, getUnits, patchShoppingItem, searchIngredients } from '../api/shopping';

type ModalMode = 'add' | 'edit';

type ModalState =
  | {
      open: false;
    }
  | {
      open: true;
      mode: ModalMode;
      // For add:
      ingredientName?: string;
      // For edit:
      itemId?: number;
      ingredientToEdit?: string;
    };

export function Shopping() {
  const userId = getCurrentUserId();

  const [items, setItems] = useState<ShoppingListItemDto[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState<string>('');

  const [units, setUnits] = useState<UnitOfMeasureDto[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [unitsError, setUnitsError] = useState<string>('');

  // Ingredient search UI
  const [search, setSearch] = useState('');
  const [ingredientResults, setIngredientResults] = useState<IngredientDto[]>([]);
  const [searchError, setSearchError] = useState<string>('');
  const [searchLoading, setSearchLoading] = useState(false);

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Modal state
  const [modal, setModal] = useState<ModalState>({ open: false });
  const [quantityText, setQuantityText] = useState('');
  const [unitText, setUnitText] = useState('');
  const [modalError, setModalError] = useState<string>('');

  const [saving, setSaving] = useState(false);

  async function loadList() {
    if (userId == null) return;
    setLoadingList(true);
    setListError('');
    try {
      const data = await getShoppingList(userId);
      setItems(data);
    } catch (e) {
      setListError(e instanceof Error ? e.message : 'Failed to load shopping list.');
    } finally {
      setLoadingList(false);
    }
  }

  async function loadUnits() {
    setLoadingUnits(true);
    setUnitsError('');
    try {
      const data = await getUnits();
      setUnits(data);
    } catch (e) {
      setUnitsError(e instanceof Error ? e.message : 'Failed to load units.');
    } finally {
      setLoadingUnits(false);
    }
  }

  // Initial loads
  useEffect(() => {
    loadUnits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (userId == null) return;
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Debounced ingredient search
  useEffect(() => {
    const q = search.trim();
    if (!q) {
      setIngredientResults([]);
      setSearchError('');
      return;
    }

    const handle = window.setTimeout(async () => {
      setSearchLoading(true);
      setSearchError('');
      try {
        const results = await searchIngredients(q);
        setIngredientResults(results);
      } catch (e) {
        setSearchError(e instanceof Error ? e.message : 'Failed to search ingredients.');
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => window.clearTimeout(handle);
  }, [search]);

  const selectedIngredientName = modal.open ? modal.ingredientName : undefined;
  const editItemId = modal.open ? modal.itemId : undefined;

  const filteredUnits = useMemo(() => {
    const q = unitText.trim().toLowerCase();
    if (!q) return units;
    return units.filter((u) => u.name.toLowerCase().includes(q));
  }, [unitText, units]);

  function openAddModal(ingredientName: string) {
    setModal({ open: true, mode: 'add', ingredientName });
    setQuantityText('');
    setUnitText('');
    setModalError('');
    setSaving(false);
  }

  function openEditModal(item: ShoppingListItemDto) {
    setModal({
      open: true,
      mode: 'edit',
      itemId: item.shoppingListItemId,
      ingredientToEdit: item.ingredient.name,
    });
    setQuantityText(String(item.quantity));
    setUnitText(item.unitOfMeasure?.name ?? '');
    setModalError('');
    setSaving(false);
  }

  function closeModal() {
    setModal({ open: false });
    setModalError('');
    setSaving(false);
  }

  async function handleSaveModal() {
    if (!modal.open) return;

    if (userId == null) {
      setModalError('You must be logged in.');
      return;
    }

    const qty = Number(quantityText);
    if (!Number.isFinite(qty) || qty <= 0) {
      setModalError('Quantity must be a number greater than 0.');
      return;
    }

    const measurementUnit = unitText.trim(); // Backend allows blank -> no unit.

    setSaving(true);
    setModalError('');

    try {
      if (modal.mode === 'add') {
        const ingredientName = selectedIngredientName;
        if (!ingredientName) throw new Error('Missing ingredient name.');

        await addShoppingItem(userId, {
          ingredientName,
          quantity: qty,
          measurementUnit,
        });

        closeModal();
        await loadList();
        setSearch('');
        return;
      }

      // edit
      if (editItemId == null) throw new Error('Missing item id for edit.');

      await patchShoppingItem(userId, editItemId, {
        quantity: qty,
        measurementUnit,
      });

      closeModal();
      await loadList();
    } catch (e) {
      setModalError(e instanceof Error ? e.message : 'Failed to save item.');
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkBought(itemId: number) {
    if (userId == null) return;
    try {
      await patchShoppingItem(userId, itemId, { bought: true });
      await loadList();
    } catch (e) {
      setListError(e instanceof Error ? e.message : 'Failed to mark as bought.');
    }
  }

  return (
    <div className="shopping-page">
      <h1 className="shopping-title">Shopping list</h1>

      <section className="shopping-search">
        <button
          type="button"
          className="shopping-plus"
          aria-label="Focus search"
          onClick={() => searchInputRef.current?.focus()}
        >
          +
        </button>

        <input
          ref={searchInputRef}
          className="shopping-search__input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search ingredients (e.g. sal, sapo, salchichas...)"
        />

        {searchError && <div className="shopping-error">{searchError}</div>}
        {searchLoading && <div className="shopping-hint">Searching...</div>}

        {ingredientResults.length > 0 && (
          <div className="shopping-search__dropdown" role="listbox" aria-label="Ingredient results">
            {ingredientResults.map((ing) => (
              <button
                key={ing.ingredientId}
                type="button"
                className="shopping-search__result"
                onClick={() => {
                  openAddModal(ing.name);
                  setSearch('');
                  setIngredientResults([]);
                }}
              >
                {ing.name}
              </button>
            ))}
          </div>
        )}
      </section>

      {listError && <div className="shopping-error shopping-error--top">{listError}</div>}
      {loadingList ? (
        <div className="shopping-hint">Loading shopping list...</div>
      ) : items.length === 0 ? (
        <div className="shopping-hint">No items to buy right now.</div>
      ) : (
        <section className="shopping-cards">
          {items.map((item) => {
            const unitLabel =
              item.unitOfMeasure?.symbol != null && item.unitOfMeasure.symbol !== ''
                ? item.unitOfMeasure.symbol
                : item.unitOfMeasure?.name ?? '—';

            return (
              <div className="shopping-card" key={item.shoppingListItemId}>
                <button
                  type="button"
                  className="shopping-card__imageBtn"
                  onClick={() => handleMarkBought(item.shoppingListItemId)}
                  aria-label={`Mark ${item.ingredient.name} as bought`}
                >
                  {/* Generic image for now; later you can replace it with ingredient-specific logo */}
                  <img
                    src="/logoShoppingList.png"
                    alt=""
                    className="shopping-card__image"
                    width={56}
                    height={56}
                  />
                </button>

                <div className="shopping-card__body">
                  <div className="shopping-card__name">{item.ingredient.name}</div>

                  <div className="shopping-card__meta">
                    <button
                      type="button"
                      className="shopping-card__metaBtn"
                      onClick={() => openEditModal(item)}
                    >
                      {item.quantity}
                    </button>

                    <span className="shopping-card__metaSep"> </span>

                    <button
                      type="button"
                      className="shopping-card__metaBtn"
                      onClick={() => openEditModal(item)}
                    >
                      {unitLabel}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {unitsError && <div className="shopping-error">{unitsError}</div>}

      {/* Modal */}
      {modal.open && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <h2 className="modal__title">
              {modal.mode === 'add' ? 'Add item' : 'Edit item'}
            </h2>

            {modal.mode === 'add' ? (
              <div className="modal__subtitle">
                Ingredient: <strong>{modal.ingredientName}</strong>
              </div>
            ) : (
              <div className="modal__subtitle">
                Ingredient: <strong>{modal.ingredientToEdit}</strong>
              </div>
            )}

            <div className="modal__form">
              <label className="modal__label">
                Quantity
                <input
                  className="modal__input"
                  type="number"
                  step="0.01"
                  min="0"
                  value={quantityText}
                  onChange={(e) => setQuantityText(e.target.value)}
                  placeholder="e.g. 2"
                />
              </label>

              <div className="modal__unit">
                <label className="modal__label">
                  Unit of measure (type or choose)
                  <input
                    className="modal__input"
                    value={unitText}
                    onChange={(e) => setUnitText(e.target.value)}
                    placeholder="e.g. gramos, litros, unidades..."
                  />
                </label>

                <div className="modal__unitList">
                  <div className="modal__unitListTitle">Available units</div>

                  <div className="modal__unitListScroll">
                    {loadingUnits ? (
                      <div className="shopping-hint">Loading units...</div>
                    ) : filteredUnits.length === 0 ? (
                      <div className="shopping-hint">No unit matches "{unitText}".</div>
                    ) : (
                      filteredUnits.map((u) => {
                        const symbolPart = u.symbol ? ` (${u.symbol})` : '';
                        return (
                          <button
                            key={u.unitId}
                            type="button"
                            className="modal__unitOption"
                            onClick={() => setUnitText(u.name)}
                          >
                            {u.name}
                            {symbolPart}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {modalError && <div className="shopping-error">{modalError}</div>}

              <div className="modal__actions">
                <button type="button" className="btn btn--secondary" onClick={closeModal} disabled={saving}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={handleSaveModal}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}