package backend.recetarioPersonal.repository;

import backend.recetarioPersonal.model.RecipeMedia;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RecipeMediaRepository extends JpaRepository<RecipeMedia, Long> {

    List<RecipeMedia> findByRecipe_RecipeId(long recipeId);
}