package backend.recetarioPersonal.service;

import backend.recetarioPersonal.model.CalendarEntry;
import backend.recetarioPersonal.model.DayMealLayout;
import backend.recetarioPersonal.model.MealType;
import backend.recetarioPersonal.model.Recipe;
import backend.recetarioPersonal.model.RecipePublicationState;
import backend.recetarioPersonal.model.User;
import backend.recetarioPersonal.repository.CalendarEntryRepository;
import backend.recetarioPersonal.repository.DayMealLayoutRepository;
import backend.recetarioPersonal.repository.RecipeRepository;
import backend.recetarioPersonal.repository.UserRepository;
import backend.recetarioPersonal.view.AssignCalendarEntryRequest;
import backend.recetarioPersonal.view.CalendarEntryDto;
import backend.recetarioPersonal.view.CalendarEntryOrderItemRequest;
import backend.recetarioPersonal.view.DayPlanDto;
import backend.recetarioPersonal.view.MealBlockDto;
import backend.recetarioPersonal.view.MealOrderItemRequest;
import backend.recetarioPersonal.view.MealTypeDto;
import backend.recetarioPersonal.view.ReorderCalendarEntriesRequest;
import backend.recetarioPersonal.view.ReorderDayMealsRequest;
import backend.recetarioPersonal.view.CalendarRangeDayDto;
import backend.recetarioPersonal.view.CalendarRangeDto;

import java.time.temporal.ChronoUnit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class CalendarService {

    /** Max inclusive days allowed in one range request (6 weeks). */
    private static final int MAX_RANGE_DAYS = 42;
    private final UserRepository userRepository;
    private final RecipeRepository recipeRepository;
    private final MealTypeService mealTypeService;
    private final CalendarEntryRepository calendarEntryRepository;
    private final DayMealLayoutRepository dayMealLayoutRepository;
    private final CalendarHousekeepingService calendarHousekeepingService;
    private final RecipeCoverUrlService recipeCoverUrlService;

    public CalendarService(
            UserRepository userRepository,
            RecipeRepository recipeRepository,
            MealTypeService mealTypeService,
            CalendarEntryRepository calendarEntryRepository,
            DayMealLayoutRepository dayMealLayoutRepository,
            CalendarHousekeepingService calendarHousekeepingService,
            RecipeCoverUrlService recipeCoverUrlService) {
        this.userRepository = userRepository;
        this.recipeRepository = recipeRepository;
        this.mealTypeService = mealTypeService;
        this.calendarEntryRepository = calendarEntryRepository;
        this.dayMealLayoutRepository = dayMealLayoutRepository;
        this.calendarHousekeepingService = calendarHousekeepingService;
        this.recipeCoverUrlService = recipeCoverUrlService;
    }

    @Transactional
    public CalendarEntryDto assign(long userId, AssignCalendarEntryRequest request) {
        if (request.mealTypeId() == null
                && (request.mealTypeName() == null || request.mealTypeName().isBlank())) {
            throw new IllegalArgumentException("Debes indicar mealTypeId o mealTypeName.");
        }

        User owner = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado: " + userId));

        MealType mealType = mealTypeService.resolveForAssignment(
                userId, request.mealTypeId(), request.mealTypeName());

        Recipe recipe = recipeRepository.findByRecipeIdAndOwner_UserId(request.recipeId(), userId)
                .orElseThrow(() -> new IllegalArgumentException("Receta no encontrada: " + request.recipeId()));

        if (recipe.getPublicationState() != RecipePublicationState.PUBLISHED) {
            throw new IllegalArgumentException("Solo se pueden planificar recetas publicadas.");
        }

        int nextOrder = calendarEntryRepository.maxRecipeSortOrder(
                userId, request.planDate(), mealType.getMealTypeId()) + 1;

        CalendarEntry entry = new CalendarEntry();
        entry.setOwner(owner);
        entry.setRecipe(recipe);
        entry.setMealType(mealType);
        entry.setPlanDate(request.planDate());
        entry.setRecipeSortOrder(nextOrder);

        CalendarEntry saved = calendarEntryRepository.save(entry);
        ensureMealTypeInDayLayout(userId, request.planDate(), mealType);
        return toDto(saved);
    }

    private void ensureMealTypeInDayLayout(long userId, LocalDate planDate, MealType mealType) {
        if (dayMealLayoutRepository
                .findByOwner_UserIdAndPlanDateAndMealType_MealTypeId(
                        userId, planDate, mealType.getMealTypeId())
                .isPresent()) {
            return;
        }
        User owner = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado: " + userId));
    
        int next = dayMealLayoutRepository.maxMealSortOrder(userId, planDate) + 1;
    
        DayMealLayout row = new DayMealLayout();
        row.setOwner(owner);
        row.setPlanDate(planDate);
        row.setMealType(mealType);
        row.setMealSortOrder(next);
        dayMealLayoutRepository.save(row);
    }

    @Transactional
    public void remove(long userId, Long calendarEntryId) {
        CalendarEntry entry = calendarEntryRepository
                .findByCalendarEntryIdAndOwner_UserId(calendarEntryId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Entrada de calendario no encontrada: " + calendarEntryId));
        LocalDate planDate = entry.getPlanDate();
        long mealTypeId = entry.getMealType().getMealTypeId();
        calendarEntryRepository.delete(entry);
        calendarHousekeepingService.pruneMealLayoutIfEmpty(userId, planDate, mealTypeId);
    }

    private CalendarEntryDto toDto(CalendarEntry entry) {
        Map<Long, String> covers = recipeCoverUrlService.loadCoverUrlsByRecipeId(
                List.of(entry.getRecipe().getRecipeId()));
        return toDto(entry, covers);
    }

    private CalendarEntryDto toDto(CalendarEntry entry, Map<Long, String> coverByRecipeId) {
        MealType mt = entry.getMealType();
        long recipeId = entry.getRecipe().getRecipeId();
        return new CalendarEntryDto(
                entry.getCalendarEntryId(),
                entry.getOwner().getUserId(),
                entry.getPlanDate(),
                toMealTypeDto(mt),
                recipeId,
                entry.getRecipe().getTitle(),
                coverByRecipeId.get(recipeId),
                entry.getRecipeSortOrder());
    }

    @Transactional(readOnly = true)
    public DayPlanDto getDayPlan(long userId, LocalDate date) {
        userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado: " + userId));
    
        List<CalendarEntry> entries = calendarEntryRepository
                .findByOwner_UserIdAndPlanDateBetweenOrderByPlanDateAscRecipeSortOrderAsc(
                        userId, date, date);
    
        List<DayMealLayout> layoutRows = dayMealLayoutRepository
                .findByOwner_UserIdAndPlanDateOrderByMealSortOrderAsc(userId, date);

        Map<Long, String> coverByRecipeId = recipeCoverUrlService.loadCoverUrlsByRecipeId(
                entries.stream().map(e -> e.getRecipe().getRecipeId()).distinct().toList());

        List<MealBlockDto> blocks = buildMealBlocks(entries, layoutRows, coverByRecipeId);
        return new DayPlanDto(date, blocks);
    }

    private MealTypeDto toMealTypeDto(MealType mealType) {
        return new MealTypeDto(
                mealType.getMealTypeId(),
                mealType.getName(),
                mealType.isSystem(),
                mealType.getDefaultSortOrder());
    }

    private List<Long> buildMealTypeOrder(
        List<DayMealLayout> layoutRows,
        Set<Long> mealTypeIdsWithEntries,
        Map<Long, List<CalendarEntry>> byMealType) {

        if (!layoutRows.isEmpty()) {
            // Meal types in layout that have entries, respecting meal_sort_order
            List<Long> fromLayout = layoutRows.stream()
                    .map(l -> l.getMealType().getMealTypeId())
                    .filter(mealTypeIdsWithEntries::contains)
                    .toList();
            Set<Long> missing = new HashSet<>(mealTypeIdsWithEntries);
            missing.removeAll(fromLayout);
            List<Long> fallback = missing.stream()
                    .sorted(Comparator.comparingInt(id ->
                            byMealType.get(id).get(0).getMealType().getDefaultSortOrder()))
                    .toList();
            List<Long> result = new ArrayList<>(fromLayout);
            result.addAll(fallback);
            return result;
        }

        return mealTypeIdsWithEntries.stream()
                .sorted(Comparator.comparingInt(id ->
                        byMealType.get(id).get(0).getMealType().getDefaultSortOrder()))
                .toList();
    }

    /**
     * Builds ordered meal blocks for one day. Shared by {@link #getDayPlan} and {@link #getRange}.
     */
    private List<MealBlockDto> buildMealBlocks(
            List<CalendarEntry> entries,
            List<DayMealLayout> layoutRows,
            Map<Long, String> coverByRecipeId) {

        if (entries.isEmpty()) {
            return List.of();
        }

        Map<Long, List<CalendarEntry>> byMealType = entries.stream()
                .collect(Collectors.groupingBy(e -> e.getMealType().getMealTypeId()));

        List<Long> orderedMealTypeIds = buildMealTypeOrder(layoutRows, byMealType.keySet(), byMealType);

        List<MealBlockDto> blocks = new ArrayList<>();
        for (Long mealTypeId : orderedMealTypeIds) {
            List<CalendarEntry> group = byMealType.get(mealTypeId);
            if (group == null || group.isEmpty()) {
                continue;
            }
            group.sort(Comparator.comparingInt(CalendarEntry::getRecipeSortOrder));
            MealType mt = group.get(0).getMealType();
            int mealOrder = layoutRows.stream()
                    .filter(l -> l.getMealType().getMealTypeId().equals(mealTypeId))
                    .mapToInt(DayMealLayout::getMealSortOrder)
                    .findFirst()
                    .orElse(mt.getDefaultSortOrder());

            blocks.add(new MealBlockDto(
                    toMealTypeDto(mt),
                    mealOrder,
                    group.stream().map(e -> toDto(e, coverByRecipeId)).toList()));
        }
        blocks.sort(Comparator.comparingInt(MealBlockDto::mealSortOrder));
        return blocks;
    }

    @Transactional(readOnly = true)
    public CalendarRangeDto getRange(long userId, LocalDate from, LocalDate to) {
        userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado: " + userId));

        if (from == null || to == null) {
            throw new IllegalArgumentException("Los parámetros from y to son obligatorios.");
        }
        if (from.isAfter(to)) {
            throw new IllegalArgumentException("La fecha from no puede ser posterior a to.");
        }
        long span = ChronoUnit.DAYS.between(from, to) + 1;
        if (span > MAX_RANGE_DAYS) {
            throw new IllegalArgumentException(
                    "El rango no puede superar " + MAX_RANGE_DAYS + " días.");
        }

        List<CalendarEntry> entries = calendarEntryRepository
                .findByOwner_UserIdAndPlanDateBetweenOrderByPlanDateAscRecipeSortOrderAsc(
                        userId, from, to);

        List<DayMealLayout> layoutRows = dayMealLayoutRepository
                .findByOwner_UserIdAndPlanDateBetweenOrderByPlanDateAscMealSortOrderAsc(
                        userId, from, to);

        Map<LocalDate, List<CalendarEntry>> entriesByDate = entries.stream()
                .collect(Collectors.groupingBy(CalendarEntry::getPlanDate));

        Map<LocalDate, List<DayMealLayout>> layoutByDate = layoutRows.stream()
                .collect(Collectors.groupingBy(DayMealLayout::getPlanDate));

        Map<Long, String> coverByRecipeId = recipeCoverUrlService.loadCoverUrlsByRecipeId(
                entries.stream().map(e -> e.getRecipe().getRecipeId()).distinct().toList());

        List<CalendarRangeDayDto> days = new ArrayList<>();
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
            List<CalendarEntry> dayEntries = entriesByDate.getOrDefault(d, List.of());
            List<DayMealLayout> dayLayout = layoutByDate.getOrDefault(d, List.of());
            List<MealBlockDto> blocks = buildMealBlocks(dayEntries, dayLayout, coverByRecipeId);
            days.add(new CalendarRangeDayDto(d, dayEntries.size(), blocks));
        }

        return new CalendarRangeDto(from, to, days);
    }

    @Transactional
    public void reorderDayMeals(long userId, LocalDate date, ReorderDayMealsRequest request) {
        userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado: " + userId));

        User owner = userRepository.getReferenceById(userId);

        long distinctMealTypes = request.items().stream()
                .map(MealOrderItemRequest::mealTypeId)
                .distinct()
                .count();
        if (distinctMealTypes != request.items().size()) {
            throw new IllegalArgumentException("No puedes repetir el mismo tipo de comida en el orden.");
        }

        dayMealLayoutRepository.deleteByOwner_UserIdAndPlanDate(userId, date);

        for (MealOrderItemRequest item : request.items()) {
            MealType mealType = mealTypeService.resolveForAssignment(userId, item.mealTypeId(), null);
            DayMealLayout row = new DayMealLayout();
            row.setOwner(owner);
            row.setPlanDate(date);
            row.setMealType(mealType);
            row.setMealSortOrder(item.sortOrder());
            dayMealLayoutRepository.save(row);
        }
    }

    @Transactional
    public void reorderEntries(long userId, LocalDate date, ReorderCalendarEntriesRequest request) {
        if (request.items() == null || request.items().isEmpty()) {
            throw new IllegalArgumentException("Debes indicar al menos una entrada para reordenar.");
        }
        Set<Long> seenEntryIds = new HashSet<>();
        for (CalendarEntryOrderItemRequest item : request.items()) {
            if (!seenEntryIds.add(item.calendarEntryId())) {
                throw new IllegalArgumentException("Hay entradas duplicadas en la petición.");
            }
            CalendarEntry entry = calendarEntryRepository
                    .findByCalendarEntryIdAndOwner_UserId(item.calendarEntryId(), userId)
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Entrada no encontrada: " + item.calendarEntryId()));
    
            if (!entry.getPlanDate().equals(date)) {
                throw new IllegalArgumentException("La entrada no pertenece a la fecha indicada.");
            }
            entry.setRecipeSortOrder(item.sortOrder());
            calendarEntryRepository.save(entry);
        }
    }

}
