package backend.recetarioPersonal.service;

import backend.recetarioPersonal.model.Ingredient;
import backend.recetarioPersonal.model.IngredientCategory;
import backend.recetarioPersonal.model.User;
import backend.recetarioPersonal.repository.IngredientCategoryRepository;
import backend.recetarioPersonal.repository.IngredientRepository;
import backend.recetarioPersonal.repository.RecentIngredientRepository;
import backend.recetarioPersonal.repository.RecipeIngredientRepository;
import backend.recetarioPersonal.repository.ShoppingListItemRepository;
import backend.recetarioPersonal.repository.UserRepository;
import backend.recetarioPersonal.service.util.IngredientNameNormalizer;
import backend.recetarioPersonal.view.DeleteOwnedIngredientResponse;
import backend.recetarioPersonal.view.IngredientCategoryCatalogDto;
import backend.recetarioPersonal.view.IngredientDto;
import backend.recetarioPersonal.view.UpdateOwnedIngredientRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class IngredientService {

    private final IngredientRepository ingredientRepository;
    private final IngredientCategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final RecentIngredientService recentIngredientService;
    private final ShoppingListItemRepository shoppingListItemRepository;
    private final RecipeIngredientRepository recipeIngredientRepository;
    private final RecentIngredientRepository recentIngredientRepository;
    private final MediaStorageService mediaStorageService;

    public IngredientService(
            IngredientRepository ingredientRepository,
            IngredientCategoryRepository categoryRepository,
            UserRepository userRepository,
            RecentIngredientService recentIngredientService,
            ShoppingListItemRepository shoppingListItemRepository,
            RecipeIngredientRepository recipeIngredientRepository,
            RecentIngredientRepository recentIngredientRepository,
            MediaStorageService mediaStorageService
    ) {
        this.ingredientRepository = ingredientRepository;
        this.categoryRepository = categoryRepository;
        this.userRepository = userRepository;
        this.recentIngredientService = recentIngredientService;
        this.shoppingListItemRepository = shoppingListItemRepository;
        this.recipeIngredientRepository = recipeIngredientRepository;
        this.recentIngredientRepository = recentIngredientRepository;
        this.mediaStorageService = mediaStorageService;
    }

    /**
     * Search ingredients visible to this user: platform catalog plus their own rows.
     */
    @Transactional(readOnly = true)
    public List<IngredientDto> searchByName(String query, long userId) {
        if (query == null || query.isBlank()) {
            return List.of();
        }
        String key = IngredientNameNormalizer.normalize(query);
        if (key.isEmpty()) {
            return List.of();
        }
        return ingredientRepository.searchVisibleToUserByNormalizedKey(key, userId)
                .stream()
                .map(this::toDto)
                .toList();
    }

    /**
     * Ingredients created by this user ({@code owner} non-null), sorted by name.
     */
    @Transactional(readOnly = true)
    public List<IngredientDto> listCreatedByUser(long userId) {
        userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
        return ingredientRepository.findOwnedByUserOrderByName(userId).stream()
                .map(this::toDto)
                .toList();
    }

    /**
     * Updates name and/or category for a row owned by {@code userId}.
     * {@code ingredientCategoryId} {@code null} assigns {@code "Propios"}.
     */
    @Transactional
    public IngredientDto updateOwnedIngredient(
            long userId,
            long ingredientId,
            UpdateOwnedIngredientRequest request
    ) {
        userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
        Ingredient ing = findOwnedOrThrow(userId, ingredientId);

        String trimmed = request.name().trim();
        if (trimmed.isBlank()) {
            throw new IllegalArgumentException("El nombre del ingrediente es obligatorio.");
        }
        String key = IngredientNameNormalizer.normalize(trimmed);
        if (key.isEmpty()) {
            throw new IllegalArgumentException("El nombre del ingrediente es obligatorio.");
        }
        ingredientRepository.findVisibleToUserByNormalizedKey(key, userId).ifPresent(existing -> {
            if (!existing.getIngredientId().equals(ingredientId)) {
                throw new IllegalArgumentException("Ya existe un ingrediente con ese nombre.");
            }
        });
        ing.setName(trimmed);
        ing.setNormalizedName(key);

        IngredientCategory category = resolveCategoryForNewUserIngredient(request.ingredientCategoryId());
        ing.setCategory(category);
        ingredientRepository.save(ing);
        return toDto(ing);
    }

    @Transactional
    public DeleteOwnedIngredientResponse deleteOwnedIngredient(long userId, long ingredientId) {
        userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
        Ingredient ing = findOwnedOrThrow(userId, ingredientId);
        String ingredientName = ing.getName();

        long shoppingRemoved = shoppingListItemRepository.countByIngredient_IngredientId(ingredientId);
        long recipeLinesRemoved = recipeIngredientRepository.countByIngredient_IngredientId(ingredientId);
        long recentRemoved = recentIngredientRepository.countByIngredient_IngredientId(ingredientId);

        shoppingListItemRepository.deleteByIngredient_IngredientId(ingredientId);
        recipeIngredientRepository.deleteByIngredient_IngredientId(ingredientId);
        recentIngredientRepository.deleteByIngredient_IngredientId(ingredientId);

        String imagePath = ing.getImageRelativePath();
        ingredientRepository.delete(ing);
        if (imagePath != null && !imagePath.isBlank()) {
            mediaStorageService.deleteIfExists(imagePath);
        }

        String message = String.format(
                "Se eliminó \"%s\" (%d línea(s) en recetas, %d en la cesta, %d reciente(s)).",
                ingredientName,
                recipeLinesRemoved,
                shoppingRemoved,
                recentRemoved);

        return new DeleteOwnedIngredientResponse(
                message,
                (int) shoppingRemoved,
                (int) recipeLinesRemoved,
                (int) recentRemoved);
    }

    private Ingredient findOwnedOrThrow(long userId, long ingredientId) {
        return ingredientRepository.findByIngredientIdAndOwner_UserId(ingredientId, userId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Ingrediente no encontrado o no es tuyo (solo puedes editar ingredientes que hayas creado)."));
    }

    /**
     * Same as {@link #findOrCreateByName(String, long, Long)} with {@code ingredientCategoryId == null} (Propios).
     */
    @Transactional
    public Ingredient findOrCreateByName(String name, long userId) {
        return findOrCreateByName(name, userId, null);
    }

    /**
     * Resolves by exact name within this user's visible set, or creates a user-owned ingredient.
     * {@code ingredientCategoryId} null → "Propios". Otherwise must reference {@code ingredient_categories}.
     */
    @Transactional
    public Ingredient findOrCreateByName(String name, long userId, Long ingredientCategoryId) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Ingredient name cannot be blank");
        }
        String trimmed = name.trim();
        String key = IngredientNameNormalizer.normalize(trimmed);
        if (key.isEmpty()) {
            throw new IllegalArgumentException("Ingredient name cannot be blank");
        }
        userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        Optional<Ingredient> existing = ingredientRepository.findVisibleToUserByNormalizedKey(key, userId);
        if (existing.isPresent()) {
            return existing.get();
        }

        IngredientCategory category = resolveCategoryForNewUserIngredient(ingredientCategoryId);

        Ingredient newIngredient = new Ingredient();
        newIngredient.setName(trimmed);
        newIngredient.setNormalizedName(key);
        newIngredient.setCategory(category);
        User ownerRef = userRepository.getReferenceById(userId);
        newIngredient.setOwner(ownerRef);
        return ingredientRepository.save(newIngredient);
    }

    private IngredientCategory resolveCategoryForNewUserIngredient(Long ingredientCategoryId) {
        if (ingredientCategoryId == null) {
            return categoryRepository.findByName("Propios")
                    .orElseThrow(() -> new IllegalStateException("Category 'Propios' must exist. Apply Flyway migrations (V2 seed)."));
        }
        return categoryRepository.findById(ingredientCategoryId)
                .orElseThrow(() -> new IllegalArgumentException("Categoría de ingrediente no encontrada: " + ingredientCategoryId));
    }

    public IngredientDto toDto(Ingredient ing) {
        Long categoryId = ing.getCategory() != null ? ing.getCategory().getCategoryId() : null;
        String categoryName = ing.getCategory() != null ? ing.getCategory().getName() : null;
        String imageUrl = ingredientImageUrl(ing);
        return new IngredientDto(
                ing.getIngredientId(),
                ing.getName(),
                categoryId,
                categoryName,
                imageUrl
        );
    }

    private static String ingredientImageUrl(Ingredient ing) {
        String path = ing.getImageRelativePath();
        if (path == null || path.isBlank()) {
            return null;
        }
        return RecipeMediaService.MEDIA_URL_PREFIX + path.replace('\\', '/');
    }

    /**
     * Catalog for one user: global categories, but only catalog + that user's ingredients listed.
     */
    @Transactional(readOnly = true)
    public List<IngredientCategoryCatalogDto> getCatalogGroupedByCategory(long userId) {
        var categories = categoryRepository.findAll();
        var visible = ingredientRepository.findAllVisibleToUser(userId);

        Map<Long, List<IngredientDto>> ingredientsByCategoryId = visible.stream()
                .map(this::toDto)
                .collect(Collectors.groupingBy(dto -> dto.categoryId() != null ? dto.categoryId() : -1L));

        List<IngredientDto> recentDtos = recentIngredientService.getRecentIngredients(userId)
                .stream()
                .map(this::toDto)
                .toList();

        IngredientCategoryCatalogDto recentCategory = new IngredientCategoryCatalogDto(
                -999L,
                "Recientes",
                recentDtos
        );

        List<IngredientCategoryCatalogDto> result = new ArrayList<>();

        for (var category : categories) {
            List<IngredientDto> ingredients = ingredientsByCategoryId.getOrDefault(
                    category.getCategoryId(),
                    List.of()
            ).stream()
                    .sorted(Comparator.comparing(IngredientDto::name, String.CASE_INSENSITIVE_ORDER))
                    .toList();

            result.add(new IngredientCategoryCatalogDto(
                    category.getCategoryId(),
                    category.getName(),
                    ingredients
            ));
        }

        result = result.stream()
                .sorted((a, b) -> {
                    boolean aOwn = isOwnCategory(a.categoryName());
                    boolean bOwn = isOwnCategory(b.categoryName());
                    if (aOwn && !bOwn) return -1;
                    if (!aOwn && bOwn) return 1;
                    return a.categoryName().compareToIgnoreCase(b.categoryName());
                })
                .toList();

        List<IngredientCategoryCatalogDto> finalResult = new ArrayList<>();
        finalResult.add(recentCategory);
        finalResult.addAll(result);
        return finalResult;
    }

    private boolean isOwnCategory(String name) {
        if (name == null) {
            return false;
        }
        String n = name.trim().toLowerCase(Locale.ROOT);
        return n.equals("propios") || n.equals("propio") || n.equals("own");
    }
}