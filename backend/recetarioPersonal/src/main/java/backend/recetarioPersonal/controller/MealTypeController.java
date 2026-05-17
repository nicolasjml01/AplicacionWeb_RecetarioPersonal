package backend.recetarioPersonal.controller;

import backend.recetarioPersonal.service.MealTypeService;
import backend.recetarioPersonal.view.CreateMealTypeRequest;
import backend.recetarioPersonal.view.MealTypeDto;
import backend.recetarioPersonal.view.UpdateMealTypeRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users/{userId}/meal-types")
public class MealTypeController {

    private final MealTypeService mealTypeService;

    public MealTypeController(MealTypeService mealTypeService) {
        this.mealTypeService = mealTypeService;
    }

    @GetMapping
    public ResponseEntity<List<MealTypeDto>> list(@PathVariable long userId) {
        return ResponseEntity.ok(mealTypeService.findAll(userId));
    }

    @GetMapping("/search")
    public ResponseEntity<List<MealTypeDto>> search(
            @PathVariable long userId,
            @RequestParam(required = false) String q) {
        return ResponseEntity.ok(mealTypeService.search(userId, q));
    }

    @PostMapping
    public ResponseEntity<MealTypeDto> create(
            @PathVariable long userId,
            @RequestBody @Valid CreateMealTypeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(mealTypeService.create(userId, request));
    }

    @PatchMapping("/{mealTypeId}")
    public ResponseEntity<MealTypeDto> update(
            @PathVariable long userId,
            @PathVariable Long mealTypeId,
            @RequestBody @Valid UpdateMealTypeRequest request) {
        return ResponseEntity.ok(mealTypeService.update(userId, mealTypeId, request));
    }

    @DeleteMapping("/{mealTypeId}")
    public ResponseEntity<Void> delete(
            @PathVariable long userId,
            @PathVariable Long mealTypeId) {
        mealTypeService.delete(userId, mealTypeId);
        return ResponseEntity.noContent().build();
    }
}