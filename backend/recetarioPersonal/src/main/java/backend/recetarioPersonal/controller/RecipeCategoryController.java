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
@RequestMapping("/api/recipe-categories")
public class RecipeCategoryController {

    private final RecipeCategoryService recipeCategoryService;

    public RecipeCategoryController(RecipeCategoryService recipeCategoryService) {
        this.recipeCategoryService = recipeCategoryService;
    }

    @GetMapping
    public ResponseEntity<List<RecipeCategoryDto>> list() {
        return ResponseEntity.ok(recipeCategoryService.findAll());
    }

    @PostMapping
    public ResponseEntity<RecipeCategoryDto> create(@RequestBody @Valid CreateRecipeCategoryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(recipeCategoryService.create(request));
    }

    @PutMapping("/{categoryId}")
    public ResponseEntity<RecipeCategoryDto> update(
            @PathVariable Long categoryId,
            @RequestBody @Valid UpdateRecipeCategoryRequest request) {
        return ResponseEntity.ok(recipeCategoryService.update(categoryId, request));
    }

    @DeleteMapping("/{categoryId}")
    public ResponseEntity<Void> delete(@PathVariable Long categoryId) {
        recipeCategoryService.delete(categoryId);
        return ResponseEntity.noContent().build();
    }
}