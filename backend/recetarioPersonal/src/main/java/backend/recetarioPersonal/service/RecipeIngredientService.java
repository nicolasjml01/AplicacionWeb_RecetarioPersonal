package backend.recetarioPersonal.service;

import backend.recetarioPersonal.model.Ingredient;
import backend.recetarioPersonal.model.Recipe;
import backend.recetarioPersonal.model.RecipeIngredient;
import backend.recetarioPersonal.model.UnitOfMeasure;
import backend.recetarioPersonal.repository.RecipeIngredientRepository;
import backend.recetarioPersonal.repository.RecipeRepository;
import backend.recetarioPersonal.repository.UserRepository;
import backend.recetarioPersonal.view.CreateRecipeIngredientRequest;
import backend.recetarioPersonal.view.IngredientDto;
import backend.recetarioPersonal.view.RecipeIngredientDto;
import backend.recetarioPersonal.view.UnitOfMeasureDto;
import backend.recetarioPersonal.view.UpdateRecipeIngredientRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class RecipeIngredientService {

    private final RecipeIngredientRepository recipeIngredientRepository;
    private final RecipeRepository recipeRepository;
    private final UserRepository userRepository;
    private final IngredientService ingredientService;
    private final UnitOfMeasureService unitOfMeasureService;
    private final ShoppingListService shoppingListService;

    public RecipeIngredientService(
            RecipeIngredientRepository recipeIngredientRepository,
            RecipeRepository recipeRepository,
            UserRepository userRepository,
            IngredientService ingredientService,
            UnitOfMeasureService unitOfMeasureService,
            ShoppingListService shoppingListService
    ) {
        this.recipeIngredientRepository = recipeIngredientRepository;
        this.recipeRepository = recipeRepository;
        this.userRepository = userRepository;
        this.ingredientService = ingredientService;
        this.unitOfMeasureService = unitOfMeasureService;
        this.shoppingListService = shoppingListService;
    }

    @Transactional(readOnly = true)
    public List<RecipeIngredientDto> listByRecipe(long userId, long recipeId) {
        ensureUserAndRecipeOwner(userId, recipeId);
        return recipeIngredientRepository.findByRecipe_RecipeIdOrderByDisplayOrderAsc(recipeId)
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public RecipeIngredientDto add(long userId, long recipeId, CreateRecipeIngredientRequest request) {
        Recipe recipe = ensureUserAndRecipeOwner(userId, recipeId);

        Ingredient ingredient = ingredientService.findOrCreateByName(request.ingredientName(), userId);

        UnitOfMeasure unit = null;
        if (request.measurementUnit() != null && !request.measurementUnit().isBlank()) {
            unit = unitOfMeasureService.findOrCreateByName(request.measurementUnit().trim());
        }

        int nextOrder = recipeIngredientRepository.findByRecipe_RecipeIdOrderByDisplayOrderAsc(recipeId)
                .stream()
                .mapToInt(RecipeIngredient::getDisplayOrder)
                .max()
                .orElse(0) + 1;

        RecipeIngredient row = new RecipeIngredient();
        row.setRecipe(recipe);
        row.setIngredient(ingredient);
        row.setQuantity(request.quantity());
        row.setUnitOfMeasure(unit);
        row.setDisplayOrder(nextOrder);

        return toDto(recipeIngredientRepository.save(row));
    }

    @Transactional
    public RecipeIngredientDto patch(
            long userId, long recipeId, long recipeIngredientId, UpdateRecipeIngredientRequest request) {
        ensureUserAndRecipeOwner(userId, recipeId);

        RecipeIngredient row = recipeIngredientRepository
                .findByRecipeIngredientIdAndRecipe_RecipeId(recipeIngredientId, recipeId)
                .orElseThrow(() -> new IllegalArgumentException("Ingrediente de receta no encontrado: " + recipeIngredientId));

        if (request.ingredientName() != null && !request.ingredientName().isBlank()) {
            row.setIngredient(ingredientService.findOrCreateByName(request.ingredientName(), userId));
        }
        if (request.quantity() != null) {
            row.setQuantity(request.quantity());
        }
        if (request.measurementUnit() != null) {
            if (request.measurementUnit().isBlank()) {
                row.setUnitOfMeasure(null);
            } else {
                row.setUnitOfMeasure(unitOfMeasureService.findOrCreateByName(request.measurementUnit().trim()));
            }
        }
        return toDto(recipeIngredientRepository.save(row));
    }

    @Transactional
    public void delete(long userId, long recipeId, long recipeIngredientId) {
        ensureUserAndRecipeOwner(userId, recipeId);

        RecipeIngredient row = recipeIngredientRepository
                .findByRecipeIngredientIdAndRecipe_RecipeId(recipeIngredientId, recipeId)
                .orElseThrow(() -> new IllegalArgumentException("Ingrediente de receta no encontrado: " + recipeIngredientId));

        recipeIngredientRepository.delete(row);
    }

    @Transactional
    public void importToShoppingList(long userId, long recipeId, Float factor, List<Long> recipeIngredientIds) {
        ensureUserAndRecipeOwner(userId, recipeId);
        float f = (factor == null || factor <= 0f) ? 1.0f : factor;

        List<RecipeIngredient> rows = recipeIngredientRepository.findByRecipe_RecipeIdOrderByDisplayOrderAsc(recipeId);
        if (rows.isEmpty()) {
            throw new IllegalArgumentException("La receta no tiene ingredientes para importar.");
        }

        List<RecipeIngredient> toImport;
        if (recipeIngredientIds == null) {
            toImport = rows;
        } else {
            if (recipeIngredientIds.isEmpty()) {
                throw new IllegalArgumentException("Selecciona al menos un ingrediente para añadir.");
            }
            Set<Long> wanted = new HashSet<>(recipeIngredientIds);
            toImport = rows.stream()
                    .filter(r -> wanted.contains(r.getRecipeIngredientId()))
                    .toList();
            if (toImport.isEmpty()) {
                throw new IllegalArgumentException("Ningún ingrediente seleccionado pertenece a esta receta.");
            }
        }

        for (RecipeIngredient r : toImport) {
            String unitName = r.getUnitOfMeasure() != null ? r.getUnitOfMeasure().getName() : null;

            shoppingListService.addOrMergeItem(
                    userId,
                    r.getIngredient().getName(),
                    r.getQuantity() * f,
                    unitName
            );
        }
    }

    private Recipe ensureUserAndRecipeOwner(long userId, long recipeId) {
        userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado: " + userId));
        return recipeRepository.findByRecipeIdAndOwner_UserId(recipeId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Receta no encontrada: " + recipeId));
    }

    private RecipeIngredientDto toDto(RecipeIngredient row) {
        Ingredient i = row.getIngredient();
        IngredientDto ingredientDto = new IngredientDto(
                i.getIngredientId(),
                i.getName(),
                i.getCategory() != null ? i.getCategory().getCategoryId() : null,
                i.getCategory() != null ? i.getCategory().getName() : null
        );

        UnitOfMeasureDto unitDto = row.getUnitOfMeasure() == null ? null : new UnitOfMeasureDto(
                row.getUnitOfMeasure().getUnitId(),
                row.getUnitOfMeasure().getName(),
                row.getUnitOfMeasure().getSymbol()
        );

        return new RecipeIngredientDto(
                row.getRecipeIngredientId(),
                ingredientDto,
                row.getQuantity(),
                unitDto,
                row.getDisplayOrder()
        );
    }
}