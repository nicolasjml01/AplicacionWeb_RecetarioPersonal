package backend.recetarioPersonal.repository;

import backend.recetarioPersonal.model.ShoppingListItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

/** Shopping list lines per user, with optional unit for merging duplicates. */
public interface ShoppingListItemRepository extends JpaRepository<ShoppingListItem, Long> {

    List<ShoppingListItem> findByUser_UserId(Long userId);

    List<ShoppingListItem> findByUser_UserIdAndBoughtFalse(Long userId);

    @Query("""
        SELECT s
        FROM ShoppingListItem s
        WHERE s.user.userId = :userId
          AND s.bought = false
          AND s.ingredient.ingredientId = :ingredientId
          AND (
            (:unitId IS NULL AND s.unitOfMeasure IS NULL)
            OR s.unitOfMeasure.unitId = :unitId
          )
    """)
    Optional<ShoppingListItem> findOpenByUserIngredientAndUnit(
            @Param("userId") long userId,
            @Param("ingredientId") long ingredientId,
            @Param("unitId") Long unitId
    );

    void deleteByIngredient_IngredientId(long ingredientId);

    long countByIngredient_IngredientId(long ingredientId);
}