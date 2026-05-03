package backend.recetarioPersonal.controller;

import backend.recetarioPersonal.service.RecipeService;
import backend.recetarioPersonal.view.CreateRecipeStepRequest;
import backend.recetarioPersonal.view.RecipeDto;
import backend.recetarioPersonal.view.RecipeStepDto;
import jakarta.validation.Valid;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users/{userId}/recipes")
public class RecipeController {

    private final RecipeService recipeService;

    public RecipeController(RecipeService recipeService) {
        this.recipeService = recipeService;
    }

    @GetMapping
    public ResponseEntity<List<RecipeDto>> list(
            @PathVariable long userId,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String recipeSearch,
            @RequestParam(required = false) String categorySearch) {
        return ResponseEntity.ok(
                recipeService.findAllByUser(userId, categoryId, recipeSearch, categorySearch)
        );
    }

    @GetMapping("/{recipeId}")
    public ResponseEntity<RecipeDto> getOne(
            @PathVariable long userId,
            @PathVariable Long recipeId) {
        return ResponseEntity.ok(recipeService.findOneByUser(userId, recipeId));
    }

    @PostMapping("/{recipeId}/steps")
    public ResponseEntity<RecipeStepDto> addStep(
            @PathVariable long userId,
            @PathVariable long recipeId,
            @RequestBody @Valid CreateRecipeStepRequest request) {
        RecipeStepDto created = recipeService.addStep(userId, recipeId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }
}