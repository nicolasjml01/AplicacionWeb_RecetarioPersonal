package backend.recetarioPersonal.service;

import backend.recetarioPersonal.model.CalendarEntry;
import backend.recetarioPersonal.model.MealType;
import backend.recetarioPersonal.model.Recipe;
import backend.recetarioPersonal.model.RecipeMedia;
import backend.recetarioPersonal.model.RecipePublicationState;
import backend.recetarioPersonal.model.User;
import backend.recetarioPersonal.repository.CalendarEntryRepository;
import backend.recetarioPersonal.repository.RecipeMediaRepository;
import backend.recetarioPersonal.repository.RecipeRepository;
import backend.recetarioPersonal.repository.UserRepository;
import backend.recetarioPersonal.view.AssignCalendarEntryRequest;
import backend.recetarioPersonal.view.CalendarEntryDto;
import backend.recetarioPersonal.view.MealTypeDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CalendarService {

    private final UserRepository userRepository;
    private final RecipeRepository recipeRepository;
    private final MealTypeService mealTypeService;
    private final CalendarEntryRepository calendarEntryRepository;
    private final RecipeMediaRepository recipeMediaRepository;

    public CalendarService(
            UserRepository userRepository,
            RecipeRepository recipeRepository,
            MealTypeService mealTypeService,
            CalendarEntryRepository calendarEntryRepository,
            RecipeMediaRepository recipeMediaRepository) {
        this.userRepository = userRepository;
        this.recipeRepository = recipeRepository;
        this.mealTypeService = mealTypeService;
        this.calendarEntryRepository = calendarEntryRepository;
        this.recipeMediaRepository = recipeMediaRepository;
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
        return toDto(saved);
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
        MealTypeDto mealTypeDto = new MealTypeDto(
                mt.getMealTypeId(),
                mt.getName(),
                mt.isSystem(),
                mt.getDefaultSortOrder());

        return new CalendarEntryDto(
                entry.getCalendarEntryId(),
                entry.getOwner().getUserId(),
                entry.getPlanDate(),
                mealTypeDto,
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
}
