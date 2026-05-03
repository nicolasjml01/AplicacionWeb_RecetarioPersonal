package backend.recetarioPersonal.repository;

import backend.recetarioPersonal.model.RecipeStep;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RecipeStepRepository extends JpaRepository<RecipeStep, Long> {

    List<RecipeStep> findByRecipe_RecipeIdOrderByStepNumberAsc(long recipeId);

    Optional<RecipeStep> findByStepIdAndRecipe_RecipeId(long stepId, long recipeId);
}