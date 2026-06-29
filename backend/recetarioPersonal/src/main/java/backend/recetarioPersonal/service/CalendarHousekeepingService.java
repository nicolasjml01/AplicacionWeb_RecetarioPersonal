package backend.recetarioPersonal.service;

import backend.recetarioPersonal.model.MealType;
import backend.recetarioPersonal.repository.CalendarEntryRepository;
import backend.recetarioPersonal.repository.DayMealLayoutRepository;
import backend.recetarioPersonal.repository.MealTypeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
public class CalendarHousekeepingService {

    public record MealTypeDeletionResult(
            int calendarEntriesRemoved,
            int layoutRowsRemoved,
            String mealTypeName
    ) {}

    private final CalendarEntryRepository calendarEntryRepository;
    private final DayMealLayoutRepository dayMealLayoutRepository;
    private final MealTypeRepository mealTypeRepository;

    public CalendarHousekeepingService(
            CalendarEntryRepository calendarEntryRepository,
            DayMealLayoutRepository dayMealLayoutRepository,
            MealTypeRepository mealTypeRepository) {
        this.calendarEntryRepository = calendarEntryRepository;
        this.dayMealLayoutRepository = dayMealLayoutRepository;
        this.mealTypeRepository = mealTypeRepository;
    }

    /** Deletes all calendar data for a custom meal type, then the type itself. */
    @Transactional
    public MealTypeDeletionResult deleteCustomMealTypeCascade(long userId, MealType mealType) {
        long mealTypeId = mealType.getMealTypeId();
        int entriesRemoved = calendarEntryRepository
                .deleteByOwner_UserIdAndMealType_MealTypeId(userId, mealTypeId);
        int layoutsRemoved = dayMealLayoutRepository
                .deleteByOwner_UserIdAndMealType_MealTypeId(userId, mealTypeId);
        String name = mealType.getName();
        mealTypeRepository.delete(mealType);
        return new MealTypeDeletionResult(entriesRemoved, layoutsRemoved, name);
    }

    /** After removing the last recipe in a meal slot on a day. */
    @Transactional
    public void pruneMealLayoutIfEmpty(long userId, LocalDate planDate, long mealTypeId) {
        boolean stillHasEntries = calendarEntryRepository
                .existsByOwner_UserIdAndPlanDateAndMealType_MealTypeId(
                        userId, planDate, mealTypeId);
        if (!stillHasEntries) {
            dayMealLayoutRepository.deleteByOwner_UserIdAndPlanDateAndMealType_MealTypeId(
                    userId, planDate, mealTypeId);
        }
    }

    /** After recipe delete (DB already removed entries via FK). */
    @Transactional
    public int pruneOrphanLayoutsForUser(long userId) {
        return dayMealLayoutRepository.deleteOrphanLayoutsForUser(userId);
    }
}