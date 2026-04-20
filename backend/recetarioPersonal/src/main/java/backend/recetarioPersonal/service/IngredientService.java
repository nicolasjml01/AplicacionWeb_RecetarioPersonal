package backend.recetarioPersonal.service;

import backend.recetarioPersonal.model.Ingredient;
import backend.recetarioPersonal.model.IngredientCategory;
import backend.recetarioPersonal.model.User;
import backend.recetarioPersonal.repository.IngredientCategoryRepository;
import backend.recetarioPersonal.repository.IngredientRepository;
import backend.recetarioPersonal.repository.UserRepository;
import backend.recetarioPersonal.view.IngredientCategoryCatalogDto;
import backend.recetarioPersonal.view.IngredientDto;
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
    
    public IngredientService(
            IngredientRepository ingredientRepository,
            IngredientCategoryRepository categoryRepository,
            UserRepository userRepository,
            RecentIngredientService recentIngredientService
    ) {
        this.ingredientRepository = ingredientRepository;
        this.categoryRepository = categoryRepository;
        this.userRepository = userRepository;
        this.recentIngredientService = recentIngredientService;
    }

    /**
     * Search ingredients visible to this user: platform catalog plus their own rows.
     */
    @Transactional(readOnly = true)
    public List<IngredientDto> searchByName(String query, long userId) {
        if (query == null || query.isBlank()) {
            return List.of();
        }
        return ingredientRepository.searchVisibleToUser(query.trim(), userId)
                .stream()
                .map(this::toDto)
                .toList();
    }

    /**
     * Resolves by exact name within this user's visible set, or creates a user-owned ingredient in "Propios".
     */
    @Transactional
    public Ingredient findOrCreateByName(String name, long userId) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Ingredient name cannot be blank");
        }
        String trimmed = name.trim();
        userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        Optional<Ingredient> existing = ingredientRepository.findVisibleToUserByExactNameIgnoreCase(trimmed, userId);
        
        if (existing.isPresent()) {
            return existing.get();
        }
        IngredientCategory own = categoryRepository.findByName("Propios")
                .orElseThrow(() -> new IllegalStateException("Category 'Propios' must exist. Apply Flyway migrations (V2 seed)."));
        Ingredient newIngredient = new Ingredient();
        newIngredient.setName(trimmed);
        newIngredient.setCategory(own);
        User ownerRef = userRepository.getReferenceById(userId);
        newIngredient.setOwner(ownerRef);
        return ingredientRepository.save(newIngredient);
    }

    private IngredientDto toDto(Ingredient ing) {
        Long categoryId = ing.getCategory() != null ? ing.getCategory().getCategoryId() : null;
        String categoryName = ing.getCategory() != null ? ing.getCategory().getName() : null;
        return new IngredientDto(
                ing.getIngredientId(),
                ing.getName(),
                categoryId,
                categoryName
        );
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
