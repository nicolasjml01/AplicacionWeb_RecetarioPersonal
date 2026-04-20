package backend.recetarioPersonal.repository;

import backend.recetarioPersonal.model.RecipeCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RecipeCategoryRepository extends JpaRepository<RecipeCategory, Long> {
    Optional<RecipeCategory> findByNameIgnoreCase(String name);
    boolean existsByNameIgnoreCase(String name);
}