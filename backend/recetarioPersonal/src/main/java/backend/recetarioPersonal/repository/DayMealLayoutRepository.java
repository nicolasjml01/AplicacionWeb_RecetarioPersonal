package backend.recetarioPersonal.repository;

import backend.recetarioPersonal.model.DayMealLayout;
import org.springframework.data.jpa.repository.JpaRepository;
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

    void deleteByOwner_UserIdAndPlanDate(long ownerUserId, LocalDate planDate);

    List<DayMealLayout> findByOwner_UserIdAndPlanDateBetweenOrderByPlanDateAscMealSortOrderAsc(
        long ownerUserId, LocalDate from, LocalDate to);
}