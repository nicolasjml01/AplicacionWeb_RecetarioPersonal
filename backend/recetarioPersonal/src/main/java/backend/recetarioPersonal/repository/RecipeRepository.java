package backend.recetarioPersonal.repository;

import backend.recetarioPersonal.model.Recipe;
import backend.recetarioPersonal.model.RecipePublicationState;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RecipeRepository extends JpaRepository<Recipe, Long> {

    List<Recipe> findByOwner_UserIdAndPublicationStateOrderByRecipeIdDesc(
            long ownerUserId,
            RecipePublicationState publicationState);

    Optional<Recipe> findByRecipeIdAndOwner_UserId(Long recipeId, long ownerUserId);

    List<Recipe> findDistinctByOwner_UserIdAndPublicationStateAndCategories_CategoryIdOrderByRecipeIdDesc(
            long ownerUserId,
            RecipePublicationState publicationState,
            Long categoryId);

    List<Recipe> findDistinctByOwner_UserIdAndPublicationStateAndTitleContainingIgnoreCaseOrderByRecipeIdDesc(
            long ownerUserId,
            RecipePublicationState publicationState,
            String titlePart);

    List<Recipe> findDistinctByOwner_UserIdAndPublicationStateAndCategories_NameContainingIgnoreCaseOrderByRecipeIdDesc(
            long ownerUserId,
            RecipePublicationState publicationState,
            String categoryNamePart);

    List<Recipe> findDistinctByOwner_UserIdAndPublicationStateAndCategories_CategoryIdAndTitleContainingIgnoreCaseOrderByRecipeIdDesc(
            long ownerUserId,
            RecipePublicationState publicationState,
            Long categoryId,
            String titlePart);

    List<Recipe> findDistinctByOwner_UserIdAndPublicationStateAndCategories_NameContainingIgnoreCaseAndTitleContainingIgnoreCaseOrderByRecipeIdDesc(
            long ownerUserId,
            RecipePublicationState publicationState,
            String categoryNamePart,
            String titlePart);

    List<Recipe> findDistinctByOwner_UserIdAndPublicationStateAndCategories_CategoryIdAndCategories_NameContainingIgnoreCaseAndTitleContainingIgnoreCaseOrderByRecipeIdDesc(
            long ownerUserId,
            RecipePublicationState publicationState,
            Long categoryId,
            String categoryNamePart,
            String titlePart);
}
