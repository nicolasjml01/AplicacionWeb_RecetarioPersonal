package backend.recetarioPersonal.controller;

import backend.recetarioPersonal.service.RecipeIngredientService;
import backend.recetarioPersonal.view.CreateRecipeIngredientRequest;
import backend.recetarioPersonal.view.ImportRecipeIngredientsRequest;
import backend.recetarioPersonal.service.RecipeService;
import backend.recetarioPersonal.view.CreateRecipeStepRequest;
import backend.recetarioPersonal.view.CreateRecipeRequest;
import backend.recetarioPersonal.view.RecipeDto;
import backend.recetarioPersonal.view.RecipeIngredientDto;
import backend.recetarioPersonal.view.RecipeStepDto;
import backend.recetarioPersonal.view.UpdateRecipeRequest;
import backend.recetarioPersonal.view.UpdateRecipeIngredientRequest;
import backend.recetarioPersonal.view.UpdateRecipeStepRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users/{userId}/recipes")
public class RecipeController {

    private final RecipeService recipeService;
    private final RecipeIngredientService recipeIngredientService;

    public RecipeController(RecipeService recipeService, RecipeIngredientService recipeIngredientService) {
        this.recipeService = recipeService;
        this.recipeIngredientService = recipeIngredientService;
    }

    @PostMapping
    public ResponseEntity<RecipeDto> create(
            @PathVariable long userId,
            @RequestBody @Valid CreateRecipeRequest request) {
        RecipeDto created = recipeService.create(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping
    public ResponseEntity<List<RecipeDto>> list(
            @PathVariable long userId,
            @RequestParam(required = false) Boolean draftsOnly,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String recipeSearch,
            @RequestParam(required = false) String categorySearch) {
        if (Boolean.TRUE.equals(draftsOnly)) {
            return ResponseEntity.ok(recipeService.findDraftsByUser(userId));
        }
        return ResponseEntity.ok(
                recipeService.findAllByUser(userId, categoryId, recipeSearch, categorySearch)
        );
    }

    @PostMapping("/{recipeId}/publish")
    public ResponseEntity<RecipeDto> publish(
            @PathVariable long userId,
            @PathVariable long recipeId) {
        return ResponseEntity.ok(recipeService.publish(userId, recipeId));
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

    @PatchMapping("/{recipeId}")
    public ResponseEntity<RecipeDto> patchRecipe(
            @PathVariable long userId,
            @PathVariable long recipeId,
            @RequestBody @Valid UpdateRecipeRequest request) {
        return ResponseEntity.ok(recipeService.patchRecipe(userId, recipeId, request));
    }

    @PatchMapping("/{recipeId}/steps/{stepId}")
    public ResponseEntity<RecipeStepDto> patchStep(
            @PathVariable long userId,
            @PathVariable long recipeId,
            @PathVariable long stepId,
            @RequestBody @Valid UpdateRecipeStepRequest request) {
        return ResponseEntity.ok(recipeService.patchStep(userId, recipeId, stepId, request));
    }

    @DeleteMapping("/{recipeId}/steps/{stepId}")
    public ResponseEntity<Void> deleteStep(
            @PathVariable long userId,
            @PathVariable long recipeId,
            @PathVariable long stepId) {
        recipeService.deleteStep(userId, recipeId, stepId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{recipeId}")
    public ResponseEntity<Void> deleteRecipe(
            @PathVariable long userId,
            @PathVariable long recipeId) {
        recipeService.deleteRecipe(userId, recipeId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{recipeId}/ingredients")
    public ResponseEntity<List<RecipeIngredientDto>> listIngredients(
            @PathVariable long userId,
            @PathVariable long recipeId) {
        return ResponseEntity.ok(recipeIngredientService.listByRecipe(userId, recipeId));
    }

    @PostMapping("/{recipeId}/ingredients")
    public ResponseEntity<RecipeIngredientDto> addIngredient(
            @PathVariable long userId,
            @PathVariable long recipeId,
            @RequestBody @Valid CreateRecipeIngredientRequest request) {
        RecipeIngredientDto created = recipeIngredientService.add(userId, recipeId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PatchMapping("/{recipeId}/ingredients/{recipeIngredientId}")
    public ResponseEntity<RecipeIngredientDto> patchIngredient(
            @PathVariable long userId,
            @PathVariable long recipeId,
            @PathVariable long recipeIngredientId,
            @RequestBody @Valid UpdateRecipeIngredientRequest request) {
        return ResponseEntity.ok(recipeIngredientService.patch(userId, recipeId, recipeIngredientId, request));
    }

    @DeleteMapping("/{recipeId}/ingredients/{recipeIngredientId}")
    public ResponseEntity<Void> deleteIngredient(
            @PathVariable long userId,
            @PathVariable long recipeId,
            @PathVariable long recipeIngredientId) {
        recipeIngredientService.delete(userId, recipeId, recipeIngredientId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{recipeId}/ingredients/import-to-shopping-list")
    public ResponseEntity<Void> importIngredientsToShoppingList(
            @PathVariable long userId,
            @PathVariable long recipeId,
            @RequestBody(required = false) ImportRecipeIngredientsRequest request) {
        recipeIngredientService.importToShoppingList(
                userId,
                recipeId,
                request != null ? request.factor() : null,
                request != null ? request.recipeIngredientIds() : null,
                request != null ? request.items() : null
        );
        return ResponseEntity.noContent().build();
    }
}