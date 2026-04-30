package backend.recetarioPersonal.repository;

import backend.recetarioPersonal.model.Recipe;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RecipeRepository extends JpaRepository<Recipe, Long> {
    List<Recipe> findByOwner_UserIdOrderByRecipeIdDesc(long ownerUserId);

    Optional<Recipe> findByRecipeIdAndOwner_UserId(Long recipeId, long ownerUserId);
    
    List<Recipe> findDistinctByOwner_UserIdAndCategories_CategoryIdOrderByRecipeIdDesc(
        long ownerUserId,
        Long categoryId
    );

    List<Recipe> findDistinctByOwner_UserIdAndTitleContainingIgnoreCaseOrderByRecipeIdDesc(
        long ownerUserId,
        String titlePart
    );

    List<Recipe> findDistinctByOwner_UserIdAndCategories_NameContainingIgnoreCaseOrderByRecipeIdDesc(
        long ownerUserId,
        String categoryNamePart
    );

    List<Recipe> findDistinctByOwner_UserIdAndCategories_CategoryIdAndTitleContainingIgnoreCaseOrderByRecipeIdDesc(
            long ownerUserId,
            Long categoryId,
            String titlePart
    );

    List<Recipe> findDistinctByOwner_UserIdAndCategories_NameContainingIgnoreCaseAndTitleContainingIgnoreCaseOrderByRecipeIdDesc(
            long ownerUserId,
            String categoryNamePart,
            String titlePart
    );

    List<Recipe> findDistinctByOwner_UserIdAndCategories_CategoryIdAndCategories_NameContainingIgnoreCaseAndTitleContainingIgnoreCaseOrderByRecipeIdDesc(
            long ownerUserId,
            Long categoryId,
            String categoryNamePart,
            String titlePart
    );
    }