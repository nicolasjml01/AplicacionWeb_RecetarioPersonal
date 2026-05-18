package backend.recetarioPersonal.repository;

import backend.recetarioPersonal.model.CalendarEntry;
import org.springframework.data.jpa.repository.JpaRepository;
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
}