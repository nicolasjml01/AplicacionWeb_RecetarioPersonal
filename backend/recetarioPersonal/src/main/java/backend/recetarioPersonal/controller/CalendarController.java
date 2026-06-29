package backend.recetarioPersonal.controller;

import backend.recetarioPersonal.service.CalendarService;
import backend.recetarioPersonal.view.AssignCalendarEntryRequest;
import backend.recetarioPersonal.view.CalendarEntryDto;
import backend.recetarioPersonal.view.DayPlanDto;
import backend.recetarioPersonal.view.CalendarRangeDto;
import backend.recetarioPersonal.view.ReorderDayMealsRequest;
import backend.recetarioPersonal.view.ReorderCalendarEntriesRequest;
import backend.recetarioPersonal.service.CalendarShoppingImportService;
import backend.recetarioPersonal.view.DayShoppingImportPreviewDto;
import backend.recetarioPersonal.view.DayShoppingImportPreviewRequest;
import backend.recetarioPersonal.view.ImportDayShoppingListResponse;
import backend.recetarioPersonal.view.ImportDayToShoppingListRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import java.time.LocalDate;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users/{userId}/calendar")
public class CalendarController {

    private final CalendarService calendarService;
    private final CalendarShoppingImportService calendarShoppingImportService;

    public CalendarController(
            CalendarService calendarService,
            CalendarShoppingImportService calendarShoppingImportService) {
        this.calendarService = calendarService;
        this.calendarShoppingImportService = calendarShoppingImportService;
    }

    @PostMapping("/entries")
    public ResponseEntity<CalendarEntryDto> assign(
            @PathVariable long userId,
            @RequestBody @Valid AssignCalendarEntryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(calendarService.assign(userId, request));
    }

    @DeleteMapping("/entries/{calendarEntryId}")
    public ResponseEntity<Void> remove(
            @PathVariable long userId,
            @PathVariable Long calendarEntryId) {
        calendarService.remove(userId, calendarEntryId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    public ResponseEntity<CalendarRangeDto> getRange(
            @PathVariable long userId,
            @RequestParam LocalDate from,
            @RequestParam LocalDate to) {
        return ResponseEntity.ok(calendarService.getRange(userId, from, to));
    }

    @GetMapping("/days/{date}")
    public ResponseEntity<DayPlanDto> getDayPlan(
            @PathVariable long userId,
            @PathVariable LocalDate date) {
        return ResponseEntity.ok(calendarService.getDayPlan(userId, date));
    }
    
    @PatchMapping("/days/{date}/meal-order")
    public ResponseEntity<Void> reorderDayMeals(
            @PathVariable long userId,
            @PathVariable LocalDate date,
            @RequestBody @Valid ReorderDayMealsRequest request) {
        calendarService.reorderDayMeals(userId, date, request);
        return ResponseEntity.noContent().build();
    }
    
    @PatchMapping("/entries/reorder")
    public ResponseEntity<Void> reorderEntries(
            @PathVariable long userId,
            @RequestParam LocalDate date,
            @RequestBody @Valid ReorderCalendarEntriesRequest request) {
        calendarService.reorderEntries(userId, date, request);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/days/{date}/shopping-import-preview")
    public ResponseEntity<DayShoppingImportPreviewDto> shoppingImportPreview(
            @PathVariable long userId,
            @PathVariable LocalDate date,
            @RequestBody @Valid DayShoppingImportPreviewRequest request) {
        return ResponseEntity.ok(
                calendarShoppingImportService.buildPreview(userId, date, request.calendarEntryIds()));
    }

    @PostMapping("/days/{date}/import-to-shopping-list")
    public ResponseEntity<ImportDayShoppingListResponse> importDayToShoppingList(
            @PathVariable long userId,
            @PathVariable LocalDate date,
            @RequestBody @Valid ImportDayToShoppingListRequest request) {
        int itemsAdded = calendarShoppingImportService.importToShoppingList(userId, date, request);
        return ResponseEntity.ok(new ImportDayShoppingListResponse(itemsAdded));
    }

}