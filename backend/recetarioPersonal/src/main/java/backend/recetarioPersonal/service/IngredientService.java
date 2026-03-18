package backend.recetarioPersonal.service;

import backend.recetarioPersonal.model.Ingredient;
import backend.recetarioPersonal.model.IngredientCategory;
import backend.recetarioPersonal.repository.IngredientCategoryRepository;
import backend.recetarioPersonal.repository.IngredientRepository;
import backend.recetarioPersonal.view.IngredientDto;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class IngredientService {

    private final IngredientRepository ingredientRepository;
    private final IngredientCategoryRepository categoryRepository;

    public IngredientService(IngredientRepository ingredientRepository,
                            IngredientCategoryRepository categoryRepository) {
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
}