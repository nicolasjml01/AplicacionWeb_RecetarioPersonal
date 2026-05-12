package backend.recetarioPersonal.controller;

import backend.recetarioPersonal.service.IngredientImageService;
import backend.recetarioPersonal.service.IngredientService;
import backend.recetarioPersonal.view.IngredientCategoryCatalogDto;
import backend.recetarioPersonal.view.IngredientDto;
import backend.recetarioPersonal.view.UpdateOwnedIngredientRequest;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
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
 * Ingredient catalog and search scoped per user: platform seed data ({@code owner} null) plus that user's own rows.
 * <p><b>Seguridad:</b> con la configuración actual ({@code permitAll}) las rutas no exigen autenticación.
 * Cuando se restrinja el acceso (JWT, sesión, etc.), debe comprobarse que el usuario autenticado
 * coincida con {@code userId} en la URL en todas las operaciones de este controlador.</p>
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

    /**
     * Lists ingredients created by this user ({@code owner} non-null), in any category, sorted by name.
     * Excludes global catalog rows ({@code owner} null).
     */
    @GetMapping("/owned")
    public ResponseEntity<List<IngredientDto>> listOwned(@PathVariable long userId) {
        return ResponseEntity.ok(ingredientService.listCreatedByUser(userId));
    }

    /**
     * Updates category for a user-owned ingredient. See {@link UpdateOwnedIngredientRequest} for JSON semantics.
     * Does not change the display name; use {@link #uploadIngredientImage} to replace the image.
     */
    @PatchMapping("/{ingredientId}")
    public ResponseEntity<IngredientDto> patchOwned(
            @PathVariable long userId,
            @PathVariable long ingredientId,
            @RequestBody @Valid UpdateOwnedIngredientRequest request) {
        IngredientDto dto = ingredientService.updateOwnedIngredientCategory(
                userId,
                ingredientId,
                request.ingredientCategoryId());
        return ResponseEntity.ok(dto);
    }

    /**
     * Multipart field name expected: {@code file} (same convention as recipe media uploads).
     */
    @PostMapping(value = "/{ingredientId}/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<IngredientDto> uploadIngredientImage(
            @PathVariable long userId,
            @PathVariable long ingredientId,
            @RequestPart("file") MultipartFile file) {
        IngredientDto dto = ingredientImageService.uploadImage(userId, ingredientId, file);
        return ResponseEntity.ok(dto);
    }
}