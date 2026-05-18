package backend.recetarioPersonal.service;

import backend.recetarioPersonal.model.CalendarEntry;
import backend.recetarioPersonal.model.DayMealLayout;
import backend.recetarioPersonal.model.MealType;
import backend.recetarioPersonal.model.Recipe;
import backend.recetarioPersonal.model.RecipeMedia;
import backend.recetarioPersonal.model.RecipePublicationState;
import backend.recetarioPersonal.model.User;
import backend.recetarioPersonal.repository.CalendarEntryRepository;
import backend.recetarioPersonal.repository.DayMealLayoutRepository;
import backend.recetarioPersonal.repository.RecipeMediaRepository;
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

    private final UserRepository userRepository;
    private final RecipeRepository recipeRepository;
    private final MealTypeService mealTypeService;
    private final CalendarEntryRepository calendarEntryRepository;
    private final RecipeMediaRepository recipeMediaRepository;
    private final DayMealLayoutRepository dayMealLayoutRepository;

    public CalendarService(
            UserRepository userRepository,
            RecipeRepository recipeRepository,
            MealTypeService mealTypeService,
            CalendarEntryRepository calendarEntryRepository,
            RecipeMediaRepository recipeMediaRepository,
            DayMealLayoutRepository dayMealLayoutRepository) 
    {
        this.userRepository = userRepository;
        this.recipeRepository = recipeRepository;
        this.mealTypeService = mealTypeService;
        this.calendarEntryRepository = calendarEntryRepository;
        this.recipeMediaRepository = recipeMediaRepository;
        this.dayMealLayoutRepository = dayMealLayoutRepository;
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
        calendarEntryRepository.delete(entry);
    }

    private CalendarEntryDto toDto(CalendarEntry entry) {
        MealType mt = entry.getMealType();
        return new CalendarEntryDto(
                entry.getCalendarEntryId(),
                entry.getOwner().getUserId(),
                entry.getPlanDate(),
                toMealTypeDto(mt),
                entry.getRecipe().getRecipeId(),
                entry.getRecipe().getTitle(),
                resolveCoverImageUrl(entry.getRecipe().getRecipeId()),
                entry.getRecipeSortOrder());
    }

    private String resolveCoverImageUrl(long recipeId) {
        List<RecipeMedia> global = recipeMediaRepository
                .findByRecipe_RecipeIdInAndStepIsNullOrderByRecipe_RecipeIdAscDisplayOrderAsc(List.of(recipeId));
        if (!global.isEmpty()) {
            return RecipeMediaService.MEDIA_URL_PREFIX + global.get(0).getRelativePath();
        }
        List<RecipeMedia> stepMedia = recipeMediaRepository
                .findByRecipe_RecipeIdInAndStepIsNotNullOrderByRecipe_RecipeIdAscStep_StepNumberAscDisplayOrderAsc(List.of(recipeId));
        if (!stepMedia.isEmpty()) {
            return RecipeMediaService.MEDIA_URL_PREFIX + stepMedia.get(0).getRelativePath();
        }
        return null;
    }    

    @Transactional(readOnly = true)
    public DayPlanDto getDayPlan(long userId, LocalDate date) {
        userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado: " + userId));
    
        List<CalendarEntry> entries = calendarEntryRepository
                .findByOwner_UserIdAndPlanDateOrderByRecipeSortOrderAsc(userId, date);
    
        if (entries.isEmpty()) {
            return new DayPlanDto(date, List.of());
        }
    
        List<DayMealLayout> layoutRows = dayMealLayoutRepository
                .findByOwner_UserIdAndPlanDateOrderByMealSortOrderAsc(userId, date);
    
        // Group entries by mealTypeId
        Map<Long, List<CalendarEntry>> byMealType = entries.stream()
                .collect(Collectors.groupingBy(e -> e.getMealType().getMealTypeId()));
    
        // Meal type order: day layout when present, otherwise default_sort_order per type
        List<Long> orderedMealTypeIds = buildMealTypeOrder(layoutRows, byMealType.keySet(), byMealType);
    
        List<MealBlockDto> blocks = new ArrayList<>();
        for (Long mealTypeId : orderedMealTypeIds) {
            List<CalendarEntry> group = byMealType.get(mealTypeId);
            if (group == null || group.isEmpty()) continue;
    
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
                    group.stream().map(this::toDto).toList()
            ));
        }
        blocks.sort(Comparator.comparingInt(MealBlockDto::mealSortOrder));
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

    @Transactional
    public void reorderDayMeals(long userId, LocalDate date, ReorderDayMealsRequest request) {
        userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado: " + userId));

        User owner = userRepository.getReferenceById(userId);

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
        for (CalendarEntryOrderItemRequest item : request.items()) {
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
