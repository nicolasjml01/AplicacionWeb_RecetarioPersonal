package backend.recetarioPersonal.controller;

import backend.recetarioPersonal.service.IngredientImageService;
import backend.recetarioPersonal.service.IngredientService;
import backend.recetarioPersonal.view.DeleteOwnedIngredientResponse;
import backend.recetarioPersonal.view.IngredientCategoryCatalogDto;
import backend.recetarioPersonal.view.IngredientDto;
import backend.recetarioPersonal.view.UpdateOwnedIngredientRequest;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * Per-user ingredient catalog: global seed rows ({@code owner == null}) plus user-owned rows.
 * JWT required; path {@code userId} must match the authenticated user (see PathUserAuthorizationFilter).
 */
@RestController
@RequestMapping("/api/users/{userId}/ingredients")
public class IngredientController {

    private final IngredientService ingredientService;
    private final IngredientImageService ingredientImageService;

    public IngredientController(IngredientService ingredientService, IngredientImageService ingredientImageService) {
        this.ingredientService = ingredientService;
        this.ingredientImageService = ingredientImageService;
    }

    /** Partial name search over catalog + user-owned ingredients visible to this user. */
    @GetMapping
    public ResponseEntity<List<IngredientDto>> search(
            @PathVariable long userId,
            @RequestParam(required = false) String search) {
        List<IngredientDto> results = ingredientService.searchByName(search != null ? search : "", userId);
        return ResponseEntity.ok(results);
    }

    /** Full catalog grouped by category for pickers (shopping list, recipe editor). */
    @GetMapping("/catalog")
    public ResponseEntity<List<IngredientCategoryCatalogDto>> getCatalog(@PathVariable long userId) {
        return ResponseEntity.ok(ingredientService.getCatalogGroupedByCategory(userId));
    }

    /** User-created ingredients only ({@code owner} set), sorted by name. */
    @GetMapping("/owned")
    public ResponseEntity<List<IngredientDto>> listOwned(@PathVariable long userId) {
        return ResponseEntity.ok(ingredientService.listCreatedByUser(userId));
    }

    /** Updates name/category on a user-owned row. Image upload is a separate endpoint. */
    @PatchMapping("/{ingredientId}")
    public ResponseEntity<IngredientDto> patchOwned(
            @PathVariable long userId,
            @PathVariable long ingredientId,
            @RequestBody @Valid UpdateOwnedIngredientRequest request) {
        IngredientDto dto = ingredientService.updateOwnedIngredient(userId, ingredientId, request);
        return ResponseEntity.ok(dto);
    }

    @DeleteMapping("/{ingredientId}")
    public ResponseEntity<DeleteOwnedIngredientResponse> deleteOwned(
            @PathVariable long userId,
            @PathVariable long ingredientId) {
        return ResponseEntity.ok(ingredientService.deleteOwnedIngredient(userId, ingredientId));
    }

    /** Multipart part name: {@code file} (same as recipe media uploads). */
    @PostMapping(value = "/{ingredientId}/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<IngredientDto> uploadIngredientImage(
            @PathVariable long userId,
            @PathVariable long ingredientId,
            @RequestPart("file") MultipartFile file) {
        IngredientDto dto = ingredientImageService.uploadImage(userId, ingredientId, file);
        return ResponseEntity.ok(dto);
    }
}
