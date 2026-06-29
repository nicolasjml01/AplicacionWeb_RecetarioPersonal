package backend.recetarioPersonal.repository;

import backend.recetarioPersonal.model.IngredientCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/** Global ingredient category names (seed data). */
public interface IngredientCategoryRepository extends JpaRepository<IngredientCategory, Long> {

    Optional<IngredientCategory> findByName(String name);
}