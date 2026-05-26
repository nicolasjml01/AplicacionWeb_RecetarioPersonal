package backend.recetarioPersonal.controller;

import backend.recetarioPersonal.service.RecipeImportService;
import backend.recetarioPersonal.view.ImportRecipeFromUrlRequest;
import backend.recetarioPersonal.view.RecipeImportPreviewDto;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users/{userId}/recipes/import")
public class RecipeImportController {

    private final RecipeImportService recipeImportService;

    public RecipeImportController(RecipeImportService recipeImportService) {
        this.recipeImportService = recipeImportService;
    }

    @PostMapping("/preview")
    public ResponseEntity<RecipeImportPreviewDto> preview(
            @PathVariable long userId,
            @RequestBody @Valid ImportRecipeFromUrlRequest request) {
        RecipeImportPreviewDto preview = recipeImportService.previewFromUrl(userId, request);
        return ResponseEntity.ok(preview);
    }
}