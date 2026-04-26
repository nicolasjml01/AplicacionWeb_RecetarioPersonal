package backend.recetarioPersonal.controller;

import backend.recetarioPersonal.service.RecipeService;
import backend.recetarioPersonal.view.CreateRecipeRequest;
import backend.recetarioPersonal.view.RecipeDto;
import jakarta.validation.Valid;
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

    @PostMapping
    public ResponseEntity<RecipeDto> create(
            @PathVariable long userId,
            @RequestBody @Valid CreateRecipeRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(recipeService.create(userId, request));
    }
}