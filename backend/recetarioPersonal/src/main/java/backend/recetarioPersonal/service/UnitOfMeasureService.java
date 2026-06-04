package backend.recetarioPersonal.service;

import backend.recetarioPersonal.model.UnitOfMeasure;
import backend.recetarioPersonal.model.User;
import backend.recetarioPersonal.repository.RecipeIngredientRepository;
import backend.recetarioPersonal.repository.ShoppingListItemRepository;
import backend.recetarioPersonal.repository.UnitOfMeasureRepository;
import backend.recetarioPersonal.repository.UserRepository;
import backend.recetarioPersonal.view.DeleteOwnedUnitResponse;
import backend.recetarioPersonal.view.UnitOfMeasureDto;
import backend.recetarioPersonal.view.UpdateOwnedUnitRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class UnitOfMeasureService {

    private final UnitOfMeasureRepository unitRepository;
    private final UserRepository userRepository;
    private final RecipeIngredientRepository recipeIngredientRepository;
    private final ShoppingListItemRepository shoppingListItemRepository;

    public UnitOfMeasureService(
            UnitOfMeasureRepository unitRepository,
            UserRepository userRepository,
            RecipeIngredientRepository recipeIngredientRepository,
            ShoppingListItemRepository shoppingListItemRepository
    ) {
        this.unitRepository = unitRepository;
        this.userRepository = userRepository;
        this.recipeIngredientRepository = recipeIngredientRepository;
        this.shoppingListItemRepository = shoppingListItemRepository;
    }

    @Transactional(readOnly = true)
    public List<UnitOfMeasureDto> findAllVisibleToUser(long userId) {
        ensureUserExists(userId);
        return unitRepository.findAllVisibleToUser(userId).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<UnitOfMeasureDto> listCreatedByUser(long userId) {
        ensureUserExists(userId);
        return unitRepository.findOwnedByUserOrderByName(userId).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public UnitOfMeasureDto updateOwnedUnit(long userId, long unitId, UpdateOwnedUnitRequest request) {
        UnitOfMeasure unit = findOwnedOrThrow(userId, unitId);

        String name = normalizeName(request.name());
        if (name.isBlank()) {
            throw new IllegalArgumentException("El nombre de la unidad es obligatorio.");
        }
        String symbol = normalizeSymbol(request.symbol());

        validateNameForUpdate(userId, unitId, name);
        validateSymbolForUpdate(userId, unitId, symbol);

        unit.setName(name);
        unit.setSymbol(symbol);
        return toDto(unitRepository.save(unit));
    }

    @Transactional
    public DeleteOwnedUnitResponse deleteOwnedUnit(long userId, long unitId) {
        UnitOfMeasure unit = findOwnedOrThrow(userId, unitId);
        String unitName = unit.getName();

        long recipeRefs = recipeIngredientRepository.countByUnitOfMeasure_UnitId(unitId);
        long shoppingRefs = shoppingListItemRepository.countByUnitOfMeasure_UnitId(unitId);

        recipeIngredientRepository.clearUnitReferences(unitId);
        shoppingListItemRepository.clearUnitReferences(unitId);
        unitRepository.delete(unit);

        String message = String.format(
                "Se eliminó la unidad \"%s\" (%d línea(s) en recetas y %d en la cesta quedaron sin unidad).",
                unitName,
                recipeRefs,
                shoppingRefs);

        return new DeleteOwnedUnitResponse(
                message,
                (int) recipeRefs,
                (int) shoppingRefs);
    }

    /**
     * Resolves by name or symbol within catalog + this user's units, or creates a user-owned unit.
     */
    @Transactional
    public UnitOfMeasure findOrCreateByName(String name, long userId) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Unit of measure name cannot be blank");
        }
        String trimmed = name.trim();
        ensureUserExists(userId);

        Optional<UnitOfMeasure> visible = unitRepository.findVisibleToUserByNameOrSymbol(trimmed, userId);
        if (visible.isPresent()) {
            return visible.get();
        }

        validateNameForCreate(userId, trimmed);

        UnitOfMeasure created = new UnitOfMeasure();
        created.setName(trimmed);
        created.setSymbol(null);
        created.setOwner(userRepository.getReferenceById(userId));
        return unitRepository.save(created);
    }

    public UnitOfMeasure findByName(String name, long userId) {
        if (name == null || name.isBlank()) {
            return null;
        }
        return unitRepository.findVisibleToUserByNameOrSymbol(name.trim(), userId).orElse(null);
    }

    private UnitOfMeasure findOwnedOrThrow(long userId, long unitId) {
        return unitRepository.findByUnitIdAndOwner_UserId(unitId, userId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Unidad no encontrada o no es tuya (solo puedes editar unidades que hayas creado)."));
    }

    private void validateNameForCreate(long userId, String name) {
        if (unitRepository.findCatalogByNameIgnoreCase(name).isPresent()) {
            throw new IllegalArgumentException("Ese nombre ya existe en el catálogo del sistema.");
        }
        if (unitRepository.findOwnedByUserAndNameIgnoreCase(userId, name).isPresent()) {
            throw new IllegalArgumentException("Ya tienes una unidad con ese nombre.");
        }
    }

    private void validateNameForUpdate(long userId, long unitId, String name) {
        unitRepository.findCatalogByNameIgnoreCase(name).ifPresent(catalog -> {
            if (!catalog.getUnitId().equals(unitId)) {
                throw new IllegalArgumentException("Ese nombre ya existe en el catálogo del sistema.");
            }
        });
        unitRepository.findOwnedByUserAndNameIgnoreCase(userId, name).ifPresent(existing -> {
            if (!existing.getUnitId().equals(unitId)) {
                throw new IllegalArgumentException("Ya tienes una unidad con ese nombre.");
            }
        });
    }

    private void validateSymbolForUpdate(long userId, long unitId, String symbol) {
        if (symbol == null) {
            return;
        }
        unitRepository.findCatalogBySymbolIgnoreCase(symbol).ifPresent(catalog -> {
            if (!catalog.getUnitId().equals(unitId)) {
                throw new IllegalArgumentException("Esa abreviatura ya la usa el catálogo del sistema.");
            }
        });
        unitRepository.findOwnedByUserAndSymbolIgnoreCase(userId, symbol).ifPresent(existing -> {
            if (!existing.getUnitId().equals(unitId)) {
                throw new IllegalArgumentException("Ya tienes otra unidad con esa abreviatura.");
            }
        });
    }

    private void ensureUserExists(long userId) {
        if (!userRepository.existsById(userId)) {
            throw new IllegalArgumentException("Usuario no encontrado: " + userId);
        }
    }

    private static String normalizeName(String value) {
        return value == null ? "" : value.trim();
    }

    private static String normalizeSymbol(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    public UnitOfMeasureDto toDto(UnitOfMeasure unit) {
        return new UnitOfMeasureDto(
                unit.getUnitId(),
                unit.getName(),
                unit.getSymbol(),
                unit.getOwner() != null
        );
    }
}
