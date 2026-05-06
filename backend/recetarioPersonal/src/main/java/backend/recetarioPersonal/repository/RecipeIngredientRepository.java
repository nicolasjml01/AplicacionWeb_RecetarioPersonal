package backend.recetarioPersonal.repository;

import backend.recetarioPersonal.model.RecipeIngredient;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RecipeIngredientRepository extends JpaRepository<RecipeIngredient, Long> {
    List<RecipeIngredient> findByRecipe_RecipeIdOrderByDisplayOrderAsc(long recipeId);
    Optional<RecipeIngredient> findByRecipeIngredientIdAndRecipe_RecipeId(Long recipeIngredientId, long recipeId);
    void deleteByRecipe_RecipeId(long recipeId);
}