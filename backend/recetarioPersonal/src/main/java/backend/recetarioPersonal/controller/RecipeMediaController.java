package backend.recetarioPersonal.controller;

import backend.recetarioPersonal.service.RecipeMediaService;
import backend.recetarioPersonal.view.ImportRecipeMediaFromUrlsRequest;
import backend.recetarioPersonal.view.ImportRecipeMediaFromUrlsResponse;
import backend.recetarioPersonal.view.RecipeMediaDto;
import backend.recetarioPersonal.view.UpdateRecipeMediaOrderRequest;
import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;

import java.io.IOException;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/users/{userId}/recipes/{recipeId}/media")
public class RecipeMediaController {

    private final RecipeMediaService recipeMediaService;

    public RecipeMediaController(RecipeMediaService recipeMediaService) {
        this.recipeMediaService = recipeMediaService;
    }

    /**
     * multipart: field "file". Optional: stepId (query) to attach to the step; without stepId = global recipe media.
     */
    @PostMapping(value = "/import-from-urls", consumes = "application/json")
    public ResponseEntity<ImportRecipeMediaFromUrlsResponse> importFromUrls(
            @PathVariable long userId,
            @PathVariable long recipeId,
            @RequestBody @Valid ImportRecipeMediaFromUrlsRequest request) {
        ImportRecipeMediaFromUrlsResponse response =
                recipeMediaService.importFromUrls(userId, recipeId, request.urls());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<RecipeMediaDto> upload(
            @PathVariable long userId,
            @PathVariable long recipeId,
            @RequestParam(value = "stepId", required = false) Long stepId,
            @RequestPart("file") MultipartFile file
    ) {
        RecipeMediaDto dto = recipeMediaService.upload(userId, recipeId, stepId, file);
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    @DeleteMapping("/items/{mediaId}")
    public ResponseEntity<Void> deleteMedia(
            @PathVariable long userId,
            @PathVariable long recipeId,
            @PathVariable long mediaId) throws IOException {
        recipeMediaService.deleteMedia(userId, recipeId, mediaId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Replaces the file backing an existing media item. Keeps mediaId, step, and displayOrder.
     */
    @PostMapping(value = "/items/{mediaId}/content", consumes = "multipart/form-data")
    public ResponseEntity<RecipeMediaDto> replaceContent(
            @PathVariable long userId,
            @PathVariable long recipeId,
            @PathVariable long mediaId,
            @RequestPart("file") MultipartFile file
    ) {
        RecipeMediaDto dto = recipeMediaService.replaceContent(userId, recipeId, mediaId, file);
        return ResponseEntity.ok(dto);
    }

    @PatchMapping(value = "/items/order", consumes = "application/json")
    public ResponseEntity<Void> reorderMedia(
            @PathVariable long userId,
            @PathVariable long recipeId,
            @RequestParam(value = "stepId", required = false) Long stepId,
            @RequestBody @Valid UpdateRecipeMediaOrderRequest request) {
        recipeMediaService.reorderMedia(userId, recipeId, stepId, request);
        return ResponseEntity.noContent().build();
    }
}