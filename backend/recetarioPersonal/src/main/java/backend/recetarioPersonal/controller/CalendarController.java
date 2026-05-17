package backend.recetarioPersonal.controller;

import backend.recetarioPersonal.service.CalendarService;
import backend.recetarioPersonal.view.AssignCalendarEntryRequest;
import backend.recetarioPersonal.view.CalendarEntryDto;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users/{userId}/calendar")
public class CalendarController {

    private final CalendarService calendarService;

    public CalendarController(CalendarService calendarService) {
        this.calendarService = calendarService;
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
}