package backend.recetarioPersonal.service;

import backend.recetarioPersonal.model.Recipe;
import backend.recetarioPersonal.model.RecipeCategory;
import backend.recetarioPersonal.model.User;
import backend.recetarioPersonal.repository.RecipeCategoryRepository;
import backend.recetarioPersonal.repository.RecipeRepository;
import backend.recetarioPersonal.repository.UserRepository;
import backend.recetarioPersonal.view.CreateRecipeRequest;
import backend.recetarioPersonal.view.CreateRecipeStepRequest;
import backend.recetarioPersonal.view.RecipeCategoryDto;
import backend.recetarioPersonal.view.RecipeDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import backend.recetarioPersonal.model.RecipeMedia;
import backend.recetarioPersonal.model.RecipeStep;
import backend.recetarioPersonal.repository.RecipeMediaRepository;
import backend.recetarioPersonal.repository.RecipeStepRepository;
import backend.recetarioPersonal.view.RecipeMediaDto;
import backend.recetarioPersonal.view.RecipeStepDto;
import java.util.stream.Collectors;

import java.util.*;

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
        recipe.setDescription(request.description());
        recipe.setCategories(categories);

        Recipe saved = recipeRepository.save(recipe);
        return toSummaryDto(saved);
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
        List<RecipeCategoryDto> categories = recipe.getCategories().stream()
                .map(c -> new RecipeCategoryDto(c.getCategoryId(), c.getName()))
                .sorted(Comparator.comparing(RecipeCategoryDto::name, String.CASE_INSENSITIVE_ORDER))
                .toList();
    
        return new RecipeDto(
                recipe.getRecipeId(),
                recipe.getOwner().getUserId(),
                recipe.getTitle(),
                recipe.getDescription(),
                categories,
                List.of(),
                List.of()
        );
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
                                .map(this::toMediaDto)
                                .toList()
                ))
                .toList();
    
        List<RecipeMediaDto> recipeLevel = allMedia.stream()
                .filter(m -> m.getStep() == null)
                .map(this::toMediaDto)
                .toList();
    
        return new RecipeDto(
                recipe.getRecipeId(),
                recipe.getOwner().getUserId(),
                recipe.getTitle(),
                recipe.getDescription(),
                categories,
                steps,
                recipeLevel
        );
    }
    
    private RecipeMediaDto toMediaDto(RecipeMedia m) {
        String url = RecipeMediaService.MEDIA_URL_PREFIX + m.getRelativePath();
        Long stepId = m.getStep() != null ? m.getStep().getStepId() : null;
        return new RecipeMediaDto(m.getMediaId(), stepId, url, m.getContentType());
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

        } else if (categoryId == null) { // hasRecipeSearch && hasCategorySearch
            recipes = recipeRepository.findDistinctByOwner_UserIdAndCategories_NameContainingIgnoreCaseAndTitleContainingIgnoreCaseOrderByRecipeIdDesc(
                    userId, c, r);

        } else { // categoryId != null && hasRecipeSearch && hasCategorySearch
            recipes = recipeRepository
                    .findDistinctByOwner_UserIdAndCategories_CategoryIdAndCategories_NameContainingIgnoreCaseAndTitleContainingIgnoreCaseOrderByRecipeIdDesc(
                            userId, categoryId, c, r);
        }

        return recipes.stream().map(this::toSummaryDto).toList();
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
        return new RecipeStepDto(saved.getStepId(), saved.getStepNumber(), saved.getContent(), List.of());
    }
}