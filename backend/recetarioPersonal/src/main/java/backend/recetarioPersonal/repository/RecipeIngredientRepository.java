package backend.recetarioPersonal.repository;

import backend.recetarioPersonal.model.RecipeIngredient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RecipeIngredientRepository extends JpaRepository<RecipeIngredient, Long> {
    List<RecipeIngredient> findByRecipe_RecipeIdOrderByDisplayOrderAsc(long recipeId);
    Optional<RecipeIngredient> findByRecipeIngredientIdAndRecipe_RecipeId(Long recipeIngredientId, long recipeId);
    void deleteByRecipe_RecipeId(long recipeId);

    void deleteByIngredient_IngredientId(long ingredientId);

    long countByIngredient_IngredientId(long ingredientId);

    long countByUnitOfMeasure_UnitId(long unitId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE RecipeIngredient r SET r.unitOfMeasure = null WHERE r.unitOfMeasure.unitId = :unitId")
    int clearUnitReferences(@Param("unitId") long unitId);
}