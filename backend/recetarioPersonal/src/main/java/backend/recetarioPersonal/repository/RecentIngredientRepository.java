package backend.recetarioPersonal.repository;

import backend.recetarioPersonal.model.RecentIngredient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RecentIngredientRepository extends JpaRepository<RecentIngredient, Long> {

    Optional<RecentIngredient> findByUser_UserIdAndIngredient_IngredientId(Long userId, Long ingredientId);

    List<RecentIngredient> findTop10ByUser_UserIdOrderByLastUsedAtDesc(Long userId);

    @Modifying
    @Query(value = """
        DELETE FROM recent_ingredients r
        WHERE r.user_id = :userId
          AND r.recent_id NOT IN (
            SELECT recent_id
            FROM recent_ingredients
            WHERE user_id = :userId
            ORDER BY last_used_at DESC
            LIMIT 10
          )
        """, nativeQuery = true)
    void deleteOlderThanTop10(@Param("userId") long userId);
}