package backend.recetarioPersonal.repository;

import backend.recetarioPersonal.model.Recipe;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RecipeRepository extends JpaRepository<Recipe, Long> {
    List<Recipe> findByOwner_UserIdOrderByRecipeIdDesc(long ownerUserId);
}