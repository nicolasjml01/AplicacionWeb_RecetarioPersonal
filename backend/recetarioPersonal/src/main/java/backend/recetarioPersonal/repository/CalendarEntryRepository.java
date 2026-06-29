package backend.recetarioPersonal.repository;

import backend.recetarioPersonal.model.CalendarEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface CalendarEntryRepository extends JpaRepository<CalendarEntry, Long> {

    Optional<CalendarEntry> findByCalendarEntryIdAndOwner_UserId(Long calendarEntryId, long ownerUserId);

    @Query("""
            SELECT COALESCE(MAX(e.recipeSortOrder), -1)
            FROM CalendarEntry e
            WHERE e.owner.userId = :userId
              AND e.planDate = :planDate
              AND e.mealType.mealTypeId = :mealTypeId
            """)
    int maxRecipeSortOrder(
            @Param("userId") long userId,
            @Param("planDate") LocalDate planDate,
            @Param("mealTypeId") long mealTypeId);

    List<CalendarEntry> findByOwner_UserIdAndPlanDateBetweenOrderByPlanDateAscRecipeSortOrderAsc(
            long ownerUserId, LocalDate from, LocalDate to);

    @Query("""
            SELECT e FROM CalendarEntry e
            JOIN FETCH e.recipe
            JOIN FETCH e.mealType
            WHERE e.calendarEntryId IN :ids
              AND e.owner.userId = :userId
              AND e.planDate = :planDate
            """)
    List<CalendarEntry> findSelectedEntriesForDay(
            @Param("ids") List<Long> calendarEntryIds,
            @Param("userId") long userId,
            @Param("planDate") LocalDate planDate);

    boolean existsByOwner_UserIdAndPlanDateAndMealType_MealTypeId(
            long ownerUserId, LocalDate planDate, long mealTypeId);

    long countByOwner_UserIdAndMealType_MealTypeId(long ownerUserId, long mealTypeId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            DELETE FROM CalendarEntry e
            WHERE e.owner.userId = :userId AND e.mealType.mealTypeId = :mealTypeId
            """)
    int deleteByOwner_UserIdAndMealType_MealTypeId(
            @Param("userId") long userId, @Param("mealTypeId") long mealTypeId);
}