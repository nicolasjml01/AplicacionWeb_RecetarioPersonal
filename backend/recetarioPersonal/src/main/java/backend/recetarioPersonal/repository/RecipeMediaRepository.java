package backend.recetarioPersonal.repository;

import backend.recetarioPersonal.model.RecipeMedia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface RecipeMediaRepository extends JpaRepository<RecipeMedia, Long> {

    List<RecipeMedia> findByRecipe_RecipeId(long recipeId);

    /**
     * Global (recipe-level) media for many recipes, ordered so the first row per recipe is the cover (display_order).
     */
    List<RecipeMedia> findByRecipe_RecipeIdInAndStepIsNullOrderByRecipe_RecipeIdAscDisplayOrderAsc(
            Collection<Long> recipeIds);

    /**
     * Step-attached media for many recipes (fallback cover), ordered by step number then display_order.
     */
    List<RecipeMedia> findByRecipe_RecipeIdInAndStepIsNotNullOrderByRecipe_RecipeIdAscStep_StepNumberAscDisplayOrderAsc(
            Collection<Long> recipeIds);

    Optional<RecipeMedia> findByMediaIdAndRecipe_RecipeId(Long mediaId, long recipeId);

    @Query("SELECT COALESCE(MAX(m.displayOrder), -1) FROM RecipeMedia m WHERE m.recipe.recipeId = :rid AND m.step IS NULL")
    int maxDisplayOrderGlobal(@Param("rid") long recipeId);

    @Query("SELECT COALESCE(MAX(m.displayOrder), -1) FROM RecipeMedia m WHERE m.step.stepId = :sid")
    int maxDisplayOrderForStep(@Param("sid") long stepId);
}