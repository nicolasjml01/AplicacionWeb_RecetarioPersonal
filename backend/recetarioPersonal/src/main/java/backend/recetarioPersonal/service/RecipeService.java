package backend.recetarioPersonal.service;

import backend.recetarioPersonal.model.Recipe;
import backend.recetarioPersonal.model.RecipeCategory;
import backend.recetarioPersonal.model.RecipeMedia;
import backend.recetarioPersonal.model.RecipeStep;
import backend.recetarioPersonal.model.User;
import backend.recetarioPersonal.repository.RecipeCategoryRepository;
import backend.recetarioPersonal.repository.RecipeMediaRepository;
import backend.recetarioPersonal.repository.RecipeRepository;
import backend.recetarioPersonal.repository.RecipeStepRepository;
import backend.recetarioPersonal.repository.UserRepository;
import backend.recetarioPersonal.view.CreateRecipeRequest;
import backend.recetarioPersonal.view.CreateRecipeStepRequest;
import backend.recetarioPersonal.view.RecipeCategoryDto;
import backend.recetarioPersonal.view.RecipeDto;
import backend.recetarioPersonal.view.RecipeMediaDto;
import backend.recetarioPersonal.view.RecipeStepDto;
import backend.recetarioPersonal.view.UpdateRecipeRequest;
import backend.recetarioPersonal.view.UpdateRecipeStepRequest;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class RecipeService {

    private static final String DEFAULT_CATEGORY_NAME = "Sin categoría";
    private final RecipeStepRepository recipeStepRepository;
    private final RecipeMediaRepository recipeMediaRepository;

    private final RecipeRepository recipeRepository;
    private final RecipeCategoryRepository recipeCategoryRepository;
    private final UserRepository userRepository;

    public RecipeService(
            RecipeStepRepository recipeStepRepository,
            RecipeMediaRepository recipeMediaRepository,
            RecipeRepository recipeRepository,
            RecipeCategoryRepository recipeCategoryRepository,
            UserRepository userRepository
    ) {
        this.recipeStepRepository = recipeStepRepository;
        this.recipeMediaRepository = recipeMediaRepository;
        this.recipeRepository = recipeRepository;
        this.recipeCategoryRepository = recipeCategoryRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public RecipeDto create(long userId, CreateRecipeRequest request) {
        User owner = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado: " + userId));

        Set<RecipeCategory> categories = resolveCategories(userId, request.categoryIds());

        Recipe recipe = new Recipe();
        recipe.setOwner(owner);
        recipe.setTitle(request.title().trim());
        recipe.setCategories(categories);

        Recipe saved = recipeRepository.save(recipe);
        return toSummaryDto(saved, null);
    }

    @Transactional
    public RecipeDto patchRecipe(long userId, long recipeId, UpdateRecipeRequest request) {
        if (request.title() == null && request.categoryIds() == null) {
            throw new IllegalArgumentException("Debe indicar al menos un campo a actualizar.");
        }
        userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado: " + userId));
        Recipe recipe = recipeRepository.findByRecipeIdAndOwner_UserId(recipeId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Receta no encontrada: " + recipeId));

        if (request.title() != null && !request.title().isBlank()) {
            recipe.setTitle(request.title().trim());
        }
        if (request.categoryIds() != null) {
            recipe.setCategories(resolveCategories(userId, request.categoryIds()));
        }
        recipeRepository.save(recipe);

        Recipe reloaded = recipeRepository.findByRecipeIdAndOwner_UserId(recipeId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Receta no encontrada: " + recipeId));
        return toDetailDto(reloaded);
    }

    @Transactional
    public RecipeStepDto patchStep(long userId, long recipeId, long stepId, UpdateRecipeStepRequest request) {
        if (request.stepNumber() == null && request.content() == null) {
            throw new IllegalArgumentException("Debe indicar al menos un campo a actualizar.");
        }
        userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado: " + userId));
        recipeRepository.findByRecipeIdAndOwner_UserId(recipeId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Receta no encontrada: " + recipeId));

        RecipeStep step = recipeStepRepository.findByStepIdAndRecipe_RecipeId(stepId, recipeId)
                .orElseThrow(() -> new IllegalArgumentException("Paso no encontrado: " + stepId));

        if (request.content() != null) {
            step.setContent(request.content().trim());
        }
        if (request.stepNumber() != null) {
            int newNum = request.stepNumber();
            boolean taken = recipeStepRepository.findByRecipe_RecipeIdOrderByStepNumberAsc(recipeId).stream()
                    .filter(s -> !s.getStepId().equals(stepId))
                    .anyMatch(s -> s.getStepNumber() == newNum);
            if (taken) {
                throw new IllegalArgumentException("Ya existe un paso con ese número en esta receta.");
            }
            step.setStepNumber(newNum);
        }

        RecipeStep saved = recipeStepRepository.save(step);
        return stepToDto(saved);
    }

    @Transactional
    public void deleteStep(long userId, long recipeId, long stepId) {
        userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado: " + userId));
        recipeRepository.findByRecipeIdAndOwner_UserId(recipeId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Receta no encontrada: " + recipeId));
        RecipeStep step = recipeStepRepository.findByStepIdAndRecipe_RecipeId(stepId, recipeId)
                .orElseThrow(() -> new IllegalArgumentException("Paso no encontrado: " + stepId));
        recipeStepRepository.delete(step);
    }

    private Set<RecipeCategory> resolveCategories(long userId, List<Long> categoryIds) {
        if (categoryIds == null || categoryIds.isEmpty()) {
            RecipeCategory defaultCategory = recipeCategoryRepository
                    .findByOwner_UserIdAndNameIgnoreCase(userId, DEFAULT_CATEGORY_NAME)
                    .orElseGet(() -> createDefaultCategory(userId));
            return Set.of(defaultCategory);
        }

        List<RecipeCategory> fetched = recipeCategoryRepository.findAllById(categoryIds);
        if (fetched.size() != new HashSet<>(categoryIds).size()) {
            throw new IllegalArgumentException("Algunas categorías no existen.");
        }

        boolean invalidOwner = fetched.stream().anyMatch(c -> c.getOwner().getUserId() != userId);
        if (invalidOwner) {
            throw new IllegalArgumentException("Algunas categorías no pertenecen a este usuario.");
        }

        return new HashSet<>(fetched);
    }

    private RecipeCategory createDefaultCategory(long userId) {
        User ownerRef = userRepository.getReferenceById(userId);
        RecipeCategory c = new RecipeCategory();
        c.setOwner(ownerRef);
        c.setName(DEFAULT_CATEGORY_NAME);
        return recipeCategoryRepository.save(c);
    }

    private RecipeDto toSummaryDto(Recipe recipe) {
        return toSummaryDto(recipe, null);
    }

    /**
     * Summary for lists: optional single global cover image (first by display_order) in {@code recipeLevelMedia}.
     */
    private RecipeDto toSummaryDto(Recipe recipe, @Nullable RecipeMediaDto cover) {
        List<RecipeCategoryDto> categories = recipe.getCategories().stream()
                .map(c -> new RecipeCategoryDto(c.getCategoryId(), c.getName()))
                .sorted(Comparator.comparing(RecipeCategoryDto::name, String.CASE_INSENSITIVE_ORDER))
                .toList();

        List<RecipeMediaDto> recipeLevel = cover != null ? List.of(cover) : List.of();

        return new RecipeDto(
                recipe.getRecipeId(),
                recipe.getOwner().getUserId(),
                recipe.getTitle(),
                categories,
                List.of(),
                recipeLevel
        );
    }

    private Map<Long, RecipeMediaDto> loadCoverMediaByRecipeId(List<Recipe> recipes) {
        if (recipes.isEmpty()) {
            return Map.of();
        }
        List<Long> ids = recipes.stream().map(Recipe::getRecipeId).toList();
        Map<Long, RecipeMediaDto> out = new HashMap<>();

        List<RecipeMedia> globalRows =
                recipeMediaRepository.findByRecipe_RecipeIdInAndStepIsNullOrderByRecipe_RecipeIdAscDisplayOrderAsc(ids);
        for (RecipeMedia m : globalRows) {
            long rid = m.getRecipe().getRecipeId();
            out.putIfAbsent(rid, toMediaDto(m));
        }

        List<Long> missingGlobal = ids.stream().filter(id -> !out.containsKey(id)).toList();
        if (!missingGlobal.isEmpty()) {
            List<RecipeMedia> stepRows = recipeMediaRepository
                    .findByRecipe_RecipeIdInAndStepIsNotNullOrderByRecipe_RecipeIdAscStep_StepNumberAscDisplayOrderAsc(
                            missingGlobal);
            for (RecipeMedia m : stepRows) {
                long rid = m.getRecipe().getRecipeId();
                out.putIfAbsent(rid, toMediaDto(m));
            }
        }

        return out;
    }

    private RecipeDto toDetailDto(Recipe recipe) {
        List<RecipeCategoryDto> categories = recipe.getCategories().stream()
                .map(c -> new RecipeCategoryDto(c.getCategoryId(), c.getName()))
                .sorted(Comparator.comparing(RecipeCategoryDto::name, String.CASE_INSENSITIVE_ORDER))
                .toList();

        long recipeId = recipe.getRecipeId();
        List<RecipeStep> stepEntities = recipeStepRepository.findByRecipe_RecipeIdOrderByStepNumberAsc(recipeId);
        List<RecipeMedia> allMedia = recipeMediaRepository.findByRecipe_RecipeId(recipeId);

        var mediaByStepId = allMedia.stream()
                .filter(m -> m.getStep() != null)
                .collect(Collectors.groupingBy(m -> m.getStep().getStepId()));

        List<RecipeStepDto> steps = stepEntities.stream()
                .map(s -> new RecipeStepDto(
                        s.getStepId(),
                        s.getStepNumber(),
                        s.getContent(),
                        mediaByStepId.getOrDefault(s.getStepId(), List.of()).stream()
                                .sorted(Comparator.comparingInt(RecipeMedia::getDisplayOrder))
                                .map(this::toMediaDto)
                                .toList()
                ))
                .toList();

        List<RecipeMediaDto> recipeLevel = allMedia.stream()
                .filter(m -> m.getStep() == null)
                .sorted(Comparator.comparingInt(RecipeMedia::getDisplayOrder))
                .map(this::toMediaDto)
                .toList();

        return new RecipeDto(
                recipe.getRecipeId(),
                recipe.getOwner().getUserId(),
                recipe.getTitle(),
                categories,
                steps,
                recipeLevel
        );
    }

    private RecipeMediaDto toMediaDto(RecipeMedia m) {
        String url = RecipeMediaService.MEDIA_URL_PREFIX + m.getRelativePath();
        Long stepId = m.getStep() != null ? m.getStep().getStepId() : null;
        return new RecipeMediaDto(m.getMediaId(), stepId, m.getDisplayOrder(), url, m.getContentType());
    }

    private RecipeStepDto stepToDto(RecipeStep s) {
        long rid = s.getRecipe().getRecipeId();
        List<RecipeMediaDto> media = recipeMediaRepository.findByRecipe_RecipeId(rid).stream()
                .filter(m -> m.getStep() != null && m.getStep().getStepId().equals(s.getStepId()))
                .sorted(Comparator.comparingInt(RecipeMedia::getDisplayOrder))
                .map(this::toMediaDto)
                .toList();
        return new RecipeStepDto(s.getStepId(), s.getStepNumber(), s.getContent(), media);
    }

    @Transactional(readOnly = true)
    public RecipeDto findOneByUser(long userId, Long recipeId) {
        userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado: " + userId));

        Recipe recipe = recipeRepository.findByRecipeIdAndOwner_UserId(recipeId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Receta no encontrada: " + recipeId));

        return toDetailDto(recipe);
    }

    @Transactional(readOnly = true)
    public List<RecipeDto> findAllByUser(long userId, Long categoryId, String recipeSearch, String categorySearch) {
        userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado: " + userId));

        String r = recipeSearch == null ? "" : recipeSearch.trim();
        String c = categorySearch == null ? "" : categorySearch.trim();

        boolean hasRecipeSearch = !r.isBlank();
        boolean hasCategorySearch = !c.isBlank();

        if (categoryId != null) {
            RecipeCategory category = recipeCategoryRepository.findById(categoryId)
                    .orElseThrow(() -> new IllegalArgumentException("Categoría de receta no encontrada: " + categoryId));

            if (category.getOwner().getUserId() != userId) {
                throw new IllegalArgumentException("La categoría no pertenece al usuario.");
            }
        }

        List<Recipe> recipes;

        if (categoryId == null && !hasRecipeSearch && !hasCategorySearch) {
            recipes = recipeRepository.findByOwner_UserIdOrderByRecipeIdDesc(userId);

        } else if (categoryId != null && !hasRecipeSearch && !hasCategorySearch) {
            recipes = recipeRepository.findDistinctByOwner_UserIdAndCategories_CategoryIdOrderByRecipeIdDesc(userId, categoryId);

        } else if (categoryId == null && hasRecipeSearch && !hasCategorySearch) {
            recipes = recipeRepository.findDistinctByOwner_UserIdAndTitleContainingIgnoreCaseOrderByRecipeIdDesc(userId, r);

        } else if (categoryId == null && !hasRecipeSearch && hasCategorySearch) {
            recipes = recipeRepository.findDistinctByOwner_UserIdAndCategories_NameContainingIgnoreCaseOrderByRecipeIdDesc(userId, c);

        } else if (categoryId != null && hasRecipeSearch && !hasCategorySearch) {
            recipes = recipeRepository.findDistinctByOwner_UserIdAndCategories_CategoryIdAndTitleContainingIgnoreCaseOrderByRecipeIdDesc(
                    userId, categoryId, r);

        } else if (categoryId == null) {
            recipes = recipeRepository.findDistinctByOwner_UserIdAndCategories_NameContainingIgnoreCaseAndTitleContainingIgnoreCaseOrderByRecipeIdDesc(
                    userId, c, r);

        } else {
            recipes = recipeRepository
                    .findDistinctByOwner_UserIdAndCategories_CategoryIdAndCategories_NameContainingIgnoreCaseAndTitleContainingIgnoreCaseOrderByRecipeIdDesc(
                            userId, categoryId, c, r);
        }

        Map<Long, RecipeMediaDto> covers = loadCoverMediaByRecipeId(recipes);
        return recipes.stream()
                .map(recipe -> toSummaryDto(recipe, covers.get(recipe.getRecipeId())))
                .toList();
    }

    @Transactional
    public RecipeStepDto addStep(long userId, long recipeId, CreateRecipeStepRequest request) {
        userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado: " + userId));
        Recipe recipe = recipeRepository.findByRecipeIdAndOwner_UserId(recipeId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Receta no encontrada: " + recipeId));

        boolean numberTaken = recipeStepRepository
                .findByRecipe_RecipeIdOrderByStepNumberAsc(recipeId)
                .stream()
                .anyMatch(s -> s.getStepNumber() == request.stepNumber());
        if (numberTaken) {
            throw new IllegalArgumentException("Ya existe un paso con ese número en esta receta.");
        }

        RecipeStep step = new RecipeStep();
        step.setRecipe(recipe);
        step.setStepNumber(request.stepNumber());
        step.setContent(request.content().trim());
        RecipeStep saved = recipeStepRepository.save(step);
        return stepToDto(saved);
    }
}