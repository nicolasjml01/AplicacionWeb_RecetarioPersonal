package backend.recetarioPersonal.repository;

import backend.recetarioPersonal.model.DayMealLayout;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface DayMealLayoutRepository extends JpaRepository<DayMealLayout, Long> {

    List<DayMealLayout> findByOwner_UserIdAndPlanDateOrderByMealSortOrderAsc(
            long ownerUserId, LocalDate planDate);

    Optional<DayMealLayout> findByOwner_UserIdAndPlanDateAndMealType_MealTypeId(
            long ownerUserId, LocalDate planDate, long mealTypeId);

    @Query("""
            SELECT COALESCE(MAX(l.mealSortOrder), -1)
            FROM DayMealLayout l
            WHERE l.owner.userId = :userId AND l.planDate = :planDate
            """)
    int maxMealSortOrder(@Param("userId") long userId, @Param("planDate") LocalDate planDate);

    /** Bulk delete for a day; flush so re-insert in the same transaction does not hit uk_day_meal_layout. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            DELETE FROM DayMealLayout l
            WHERE l.owner.userId = :userId AND l.planDate = :planDate
            """)
    int deleteByOwner_UserIdAndPlanDate(@Param("userId") long userId, @Param("planDate") LocalDate planDate);

    List<DayMealLayout> findByOwner_UserIdAndPlanDateBetweenOrderByPlanDateAscMealSortOrderAsc(
            long ownerUserId, LocalDate from, LocalDate to);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            DELETE FROM DayMealLayout l
            WHERE l.owner.userId = :userId
              AND l.planDate = :planDate
              AND l.mealType.mealTypeId = :mealTypeId
            """)
    int deleteByOwner_UserIdAndPlanDateAndMealType_MealTypeId(
            @Param("userId") long userId,
            @Param("planDate") LocalDate planDate,
            @Param("mealTypeId") long mealTypeId);

    long countByOwner_UserIdAndMealType_MealTypeId(long ownerUserId, long mealTypeId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            DELETE FROM DayMealLayout l
            WHERE l.owner.userId = :userId AND l.mealType.mealTypeId = :mealTypeId
            """)
    int deleteByOwner_UserIdAndMealType_MealTypeId(
            @Param("userId") long userId, @Param("mealTypeId") long mealTypeId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = """
            DELETE FROM day_meal_layout l
            WHERE l.owner_user_id = :userId
              AND NOT EXISTS (
                SELECT 1 FROM calendar_entries e
                WHERE e.owner_user_id = l.owner_user_id
                  AND e.plan_date = l.plan_date
                  AND e.meal_type_id = l.meal_type_id
              )
            """, nativeQuery = true)
    int deleteOrphanLayoutsForUser(@Param("userId") long userId);
}