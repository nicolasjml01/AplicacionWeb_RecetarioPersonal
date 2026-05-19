package backend.recetarioPersonal.service;

import backend.recetarioPersonal.model.CalendarEntry;
import backend.recetarioPersonal.model.Ingredient;
import backend.recetarioPersonal.model.RecipeIngredient;
import backend.recetarioPersonal.model.UnitOfMeasure;
import backend.recetarioPersonal.repository.CalendarEntryRepository;
import backend.recetarioPersonal.repository.IngredientRepository;
import backend.recetarioPersonal.repository.RecipeIngredientRepository;
import backend.recetarioPersonal.repository.UserRepository;
import backend.recetarioPersonal.view.DayShoppingImportLineDto;
import backend.recetarioPersonal.view.DayShoppingImportPreviewDto;
import backend.recetarioPersonal.view.DayShoppingImportSelectedEntryDto;
import backend.recetarioPersonal.view.DayShoppingImportSourceDto;
import backend.recetarioPersonal.view.ImportDayShoppingItemRequest;
import backend.recetarioPersonal.view.ImportDayToShoppingListRequest;
import backend.recetarioPersonal.view.IngredientDto;
import backend.recetarioPersonal.view.UnitOfMeasureDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class CalendarShoppingImportService {

    private final UserRepository userRepository;
    private final CalendarEntryRepository calendarEntryRepository;
    private final RecipeIngredientRepository recipeIngredientRepository;
    private final IngredientRepository ingredientRepository;
    private final IngredientService ingredientService;
    private final ShoppingListService shoppingListService;
    private final RecipeCoverUrlService recipeCoverUrlService;

    public CalendarShoppingImportService(
            UserRepository userRepository,
            CalendarEntryRepository calendarEntryRepository,
            RecipeIngredientRepository recipeIngredientRepository,
            IngredientRepository ingredientRepository,
            IngredientService ingredientService,
            ShoppingListService shoppingListService,
            RecipeCoverUrlService recipeCoverUrlService) {
        this.userRepository = userRepository;
        this.calendarEntryRepository = calendarEntryRepository;
        this.recipeIngredientRepository = recipeIngredientRepository;
        this.ingredientRepository = ingredientRepository;
        this.ingredientService = ingredientService;
        this.shoppingListService = shoppingListService;
        this.recipeCoverUrlService = recipeCoverUrlService;
    }

    @Transactional(readOnly = true)
    public DayShoppingImportPreviewDto buildPreview(
            long userId,
            LocalDate date,
            List<Long> calendarEntryIds) {
        ensureUserExists(userId);
        if (calendarEntryIds == null || calendarEntryIds.isEmpty()) {
            throw new IllegalArgumentException("Debes seleccionar al menos una comida del día.");
        }

        List<Long> distinctIds = calendarEntryIds.stream().distinct().toList();
        List<CalendarEntry> entries = calendarEntryRepository
                .findSelectedEntriesForDay(distinctIds, userId, date);

        if (entries.size() != distinctIds.size()) {
            throw new IllegalArgumentException(
                    "Alguna entrada no pertenece a ese día o al usuario.");
        }

        Map<Long, String> coverByRecipeId = recipeCoverUrlService.loadCoverUrlsByRecipeId(
                entries.stream().map(e -> e.getRecipe().getRecipeId()).distinct().toList());

        List<String> warnings = new ArrayList<>();
        List<DayShoppingImportSelectedEntryDto> selectedEntries = new ArrayList<>();
        Map<String, AggregatedLine> grouped = new LinkedHashMap<>();

        for (CalendarEntry entry : entries) {
            long recipeId = entry.getRecipe().getRecipeId();
            selectedEntries.add(new DayShoppingImportSelectedEntryDto(
                    entry.getCalendarEntryId(),
                    recipeId,
                    entry.getRecipe().getTitle(),
                    coverByRecipeId.get(recipeId),
                    entry.getMealType().getName()));

            List<RecipeIngredient> rows =
                    recipeIngredientRepository.findByRecipe_RecipeIdOrderByDisplayOrderAsc(recipeId);
            if (rows.isEmpty()) {
                warnings.add("La receta \"" + entry.getRecipe().getTitle()
                        + "\" no tiene ingredientes.");
                continue;
            }

            for (RecipeIngredient row : rows) {
                String key = groupKey(
                        row.getIngredient().getIngredientId(),
                        row.getUnitOfMeasure() != null ? row.getUnitOfMeasure().getUnitId() : null);
                grouped.computeIfAbsent(key, k -> new AggregatedLine(row, ingredientService))
                        .addContribution(row, entry);
            }
        }

        List<DayShoppingImportLineDto> lines = grouped.values().stream()
                .map(AggregatedLine::toDto)
                .toList();

        return new DayShoppingImportPreviewDto(date, selectedEntries, lines, warnings);
    }

    @Transactional
    public int importToShoppingList(
            long userId,
            LocalDate date,
            ImportDayToShoppingListRequest request) {
        ensureUserExists(userId);
        Objects.requireNonNull(date, "date");

        if (request.calendarEntryIds() == null || request.calendarEntryIds().isEmpty()) {
            throw new IllegalArgumentException("Debes indicar las comidas del día incluidas en la importación.");
        }
        if (request.items() == null || request.items().isEmpty()) {
            throw new IllegalArgumentException(
                    "Debes indicar al menos un ingrediente para importar.");
        }

        DayShoppingImportPreviewDto preview = buildPreview(userId, date, request.calendarEntryIds());
        Set<String> allowedGroupKeys = preview.lines().stream()
                .map(DayShoppingImportLineDto::groupKey)
                .collect(Collectors.toSet());

        int added = 0;
        for (ImportDayShoppingItemRequest item : request.items()) {
            if (item.quantity() <= 0f) {
                continue;
            }
            if (!allowedGroupKeys.contains(item.groupKey())) {
                throw new IllegalArgumentException(
                        "Algún ingrediente no pertenece al día seleccionado o no estaba en la vista previa.");
            }
            Ingredient ingredient = ingredientRepository.findById(item.ingredientId())
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Ingrediente no encontrado: " + item.ingredientId()));

            String unitName = (item.unitName() != null && !item.unitName().isBlank())
                    ? item.unitName().trim()
                    : null;

            shoppingListService.addOrMergeItem(
                    userId,
                    ingredient.getName(),
                    item.quantity(),
                    unitName);
            added++;
        }
        return added;
    }

    private void ensureUserExists(long userId) {
        userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado: " + userId));
    }

    private static String groupKey(long ingredientId, Long unitId) {
        return ingredientId + ":" + (unitId != null ? unitId : "null");
    }

    private static UnitOfMeasureDto toUnitDto(UnitOfMeasure unit) {
        if (unit == null) {
            return null;
        }
        return new UnitOfMeasureDto(unit.getUnitId(), unit.getName(), unit.getSymbol());
    }

    private static final class AggregatedLine {
        private final IngredientDto ingredient;
        private final UnitOfMeasureDto unitOfMeasure;
        private final String groupKey;
        private float suggestedQuantity;
        private final List<DayShoppingImportSourceDto> sources = new ArrayList<>();

        AggregatedLine(RecipeIngredient seed, IngredientService ingredientService) {
            Ingredient ing = seed.getIngredient();
            UnitOfMeasure unit = seed.getUnitOfMeasure();
            this.ingredient = ingredientService.toDto(ing);
            this.unitOfMeasure = toUnitDto(unit);
            this.groupKey = groupKey(
                    ing.getIngredientId(),
                    unit != null ? unit.getUnitId() : null);
        }

        void addContribution(RecipeIngredient row, CalendarEntry entry) {
            suggestedQuantity += row.getQuantity();
            sources.add(new DayShoppingImportSourceDto(
                    entry.getCalendarEntryId(),
                    entry.getRecipe().getRecipeId(),
                    entry.getRecipe().getTitle(),
                    row.getRecipeIngredientId(),
                    row.getQuantity()));
        }

        DayShoppingImportLineDto toDto() {
            return new DayShoppingImportLineDto(
                    groupKey, ingredient, unitOfMeasure, suggestedQuantity, List.copyOf(sources));
        }
    }
}