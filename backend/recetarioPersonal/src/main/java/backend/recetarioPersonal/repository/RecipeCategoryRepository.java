package backend.recetarioPersonal.repository;

import backend.recetarioPersonal.model.RecipeCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RecipeCategoryRepository extends JpaRepository<RecipeCategory, Long> {
    List<RecipeCategory> findByOwner_UserIdOrderByNameAsc(long ownerUserId);
    Optional<RecipeCategory> findByOwner_UserIdAndNameIgnoreCase(long ownerUserId, String name);
    boolean existsByOwner_UserIdAndNameIgnoreCase(long ownerUserId, String name);
}