package backend.recetarioPersonal.controller;

import backend.recetarioPersonal.service.IngredientService;
import backend.recetarioPersonal.view.IngredientCategoryCatalogDto;
import backend.recetarioPersonal.view.IngredientDto;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Ingredient catalog and search scoped per user: platform seed data ({@code owner} null) plus that user's own rows.
 */
@RestController
@RequestMapping("/api/users/{userId}/ingredients")
public class IngredientController {

    private final IngredientService ingredientService;

    public IngredientController(IngredientService ingredientService) {
        this.ingredientService = ingredientService;
    }

    @GetMapping
    public ResponseEntity<List<IngredientDto>> search(
            @PathVariable long userId,
            @RequestParam(required = false) String search) {
        List<IngredientDto> results = ingredientService.searchByName(search != null ? search : "", userId);
        return ResponseEntity.ok(results);
    }

    @GetMapping("/catalog")
    public ResponseEntity<List<IngredientCategoryCatalogDto>> getCatalog(@PathVariable long userId) {
        return ResponseEntity.ok(ingredientService.getCatalogGroupedByCategory(userId));
    }
}
