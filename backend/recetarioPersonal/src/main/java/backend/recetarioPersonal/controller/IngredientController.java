package backend.recetarioPersonal.controller;

import backend.recetarioPersonal.service.IngredientService;
import backend.recetarioPersonal.view.IngredientCategoryCatalogDto;
import backend.recetarioPersonal.view.IngredientDto;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/ingredients")
public class IngredientController {

    private final IngredientService ingredientService;

    public IngredientController(IngredientService ingredientService) {
        this.ingredientService = ingredientService;
    }

    @GetMapping
    public ResponseEntity<List<IngredientDto>> search(@RequestParam(required = false) String search) {
        List<IngredientDto> results = ingredientService.searchByName(search != null ? search : "");
        return ResponseEntity.ok(results);
    }

    @GetMapping("/catalog")
    public ResponseEntity<List<IngredientCategoryCatalogDto>> getCatalog() {
        return ResponseEntity.ok(ingredientService.getCatalogGroupedByCategory());
    }
}