package backend.recetarioPersonal.service;

import backend.recetarioPersonal.model.Ingredient;
import backend.recetarioPersonal.model.IngredientCategory;
import backend.recetarioPersonal.repository.IngredientCategoryRepository;
import backend.recetarioPersonal.repository.IngredientRepository;
import backend.recetarioPersonal.view.IngredientCategoryCatalogDto;
import backend.recetarioPersonal.view.IngredientDto;
import org.springframework.stereotype.Service;

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

    public IngredientService(
            IngredientRepository ingredientRepository,
            IngredientCategoryRepository categoryRepository
    ) {
        this.ingredientRepository = ingredientRepository;
        this.categoryRepository = categoryRepository;
    }

    /**
     * Search ingredients by name (partial, case-insensitive). Used by the search UI.
     */
    public List<IngredientDto> searchByName(String query) {
        if (query == null || query.isBlank()) {
            return List.of();
        }
        return ingredientRepository.findByNameContainingIgnoreCase(query.trim())
                .stream()
                .map(this::toDto)
                .toList();
    }

    /**
     * Returns the ingredient with the given name, or creates it with category "Own" if it does not exist.
     * Used when adding an item to the shopping list by name.
     */
    public Ingredient findOrCreateByName(String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Ingredient name cannot be blank");
        }
        String trimmed = name.trim();
        Optional<Ingredient> existing = ingredientRepository.findByName(trimmed);
        if (existing.isPresent()) {
            return existing.get();
        }
        IngredientCategory own = categoryRepository.findByName("Propios")
                .orElseThrow(() -> new IllegalStateException("Category 'Propios' must exist. Run the DataLoader seed."));
        Ingredient newIngredient = new Ingredient();
        newIngredient.setName(trimmed);
        newIngredient.setCategory(own);
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
     * Returns all categories with their ingredients.
     * "Propios"/"Own" is always first, even if empty.
     */
    public List<IngredientCategoryCatalogDto> getCatalogGroupedByCategory() {
        var categories = categoryRepository.findAll();
        var allIngredients = ingredientRepository.findAll();

        Map<Long, List<IngredientDto>> ingredientsByCategoryId = allIngredients.stream()
                .map(this::toDto)
                .collect(Collectors.groupingBy(dto -> dto.categoryId() != null ? dto.categoryId() : -1L));

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

        return result;
    }

    private boolean isOwnCategory(String name) {
        if (name == null) {
            return false;
        }
        String n = name.trim().toLowerCase(Locale.ROOT);
        return n.equals("propios") || n.equals("propio") || n.equals("own");
    }
}