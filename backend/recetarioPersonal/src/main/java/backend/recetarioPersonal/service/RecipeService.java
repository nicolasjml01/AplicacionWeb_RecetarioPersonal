package backend.recetarioPersonal.service;

import backend.recetarioPersonal.model.Recipe;
import backend.recetarioPersonal.model.RecipeCategory;
import backend.recetarioPersonal.model.User;
import backend.recetarioPersonal.repository.RecipeCategoryRepository;
import backend.recetarioPersonal.repository.RecipeRepository;
import backend.recetarioPersonal.repository.UserRepository;
import backend.recetarioPersonal.view.CreateRecipeRequest;
import backend.recetarioPersonal.view.RecipeCategoryDto;
import backend.recetarioPersonal.view.RecipeDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class RecipeService {

    private static final String DEFAULT_CATEGORY_NAME = "Sin categoría";

    private final RecipeRepository recipeRepository;
    private final RecipeCategoryRepository recipeCategoryRepository;
    private final UserRepository userRepository;

    public RecipeService(
            RecipeRepository recipeRepository,
            RecipeCategoryRepository recipeCategoryRepository,
            UserRepository userRepository
    ) {
        this.recipeRepository = recipeRepository;
        this.recipeCategoryRepository = recipeCategoryRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public RecipeDto create(long userId, CreateRecipeRequest request) {
        User owner = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        Set<RecipeCategory> categories = resolveCategories(userId, request.categoryIds());

        Recipe recipe = new Recipe();
        recipe.setOwner(owner);
        recipe.setTitle(request.title().trim());
        recipe.setDescription(request.description());
        recipe.setCategories(categories);

        Recipe saved = recipeRepository.save(recipe);
        return toDto(saved);
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
            throw new IllegalArgumentException("Some categories do not exist.");
        }

        boolean invalidOwner = fetched.stream().anyMatch(c -> c.getOwner().getUserId() != userId);
        if (invalidOwner) {
            throw new IllegalArgumentException("Some categories do not belong to this user.");
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

    private RecipeDto toDto(Recipe recipe) {
        List<RecipeCategoryDto> categories = recipe.getCategories().stream()
                .map(c -> new RecipeCategoryDto(c.getCategoryId(), c.getName()))
                .sorted(Comparator.comparing(RecipeCategoryDto::name, String.CASE_INSENSITIVE_ORDER))
                .toList();

        return new RecipeDto(
                recipe.getRecipeId(),
                recipe.getOwner().getUserId(),
                recipe.getTitle(),
                recipe.getDescription(),
                categories
        );
    }
}