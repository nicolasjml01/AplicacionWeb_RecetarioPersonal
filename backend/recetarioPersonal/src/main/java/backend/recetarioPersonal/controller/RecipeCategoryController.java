package backend.recetarioPersonal.controller;

import backend.recetarioPersonal.service.RecipeCategoryService;
import backend.recetarioPersonal.view.CreateRecipeCategoryRequest;
import backend.recetarioPersonal.view.RecipeCategoryDto;
import backend.recetarioPersonal.view.UpdateRecipeCategoryRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users/{userId}/recipe-categories")
public class RecipeCategoryController {

    private final RecipeCategoryService recipeCategoryService;

    public RecipeCategoryController(RecipeCategoryService recipeCategoryService) {
        this.recipeCategoryService = recipeCategoryService;
    }

    @GetMapping
    public ResponseEntity<List<RecipeCategoryDto>> list(@PathVariable long userId) {
        return ResponseEntity.ok(recipeCategoryService.findAll(userId));
    }

    @PostMapping
    public ResponseEntity<RecipeCategoryDto> create(
            @PathVariable long userId,
            @RequestBody @Valid CreateRecipeCategoryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(recipeCategoryService.create(userId, request));
    }

    @PutMapping("/{categoryId}")
    public ResponseEntity<RecipeCategoryDto> update(
            @PathVariable long userId,
            @PathVariable Long categoryId,
            @RequestBody @Valid UpdateRecipeCategoryRequest request) {
        return ResponseEntity.ok(recipeCategoryService.update(userId, categoryId, request));
    }

    @DeleteMapping("/{categoryId}")
    public ResponseEntity<Void> delete(
            @PathVariable long userId,
            @PathVariable Long categoryId) {
        recipeCategoryService.delete(userId, categoryId);
        return ResponseEntity.noContent().build();
    }
}