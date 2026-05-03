package backend.recetarioPersonal.controller;

import backend.recetarioPersonal.service.RecipeMediaService;
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