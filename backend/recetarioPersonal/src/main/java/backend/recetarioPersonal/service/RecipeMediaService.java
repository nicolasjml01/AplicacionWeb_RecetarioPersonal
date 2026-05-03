package backend.recetarioPersonal.service;

import backend.recetarioPersonal.exception.FileStorageException;
import backend.recetarioPersonal.model.Recipe;
import backend.recetarioPersonal.model.RecipeMedia;
import backend.recetarioPersonal.model.RecipeStep;
import backend.recetarioPersonal.repository.RecipeMediaRepository;
import backend.recetarioPersonal.repository.RecipeRepository;
import backend.recetarioPersonal.repository.RecipeStepRepository;
import backend.recetarioPersonal.repository.UserRepository;
import backend.recetarioPersonal.view.RecipeMediaDto;
import backend.recetarioPersonal.view.UpdateRecipeMediaOrderRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class RecipeMediaService {

    public static final String MEDIA_URL_PREFIX = "/media/";

    private final RecipeRepository recipeRepository;
    private final RecipeStepRepository recipeStepRepository;
    private final RecipeMediaRepository recipeMediaRepository;
    private final UserRepository userRepository;
    private final MediaStorageService mediaStorageService;

    public RecipeMediaService(
            RecipeRepository recipeRepository,
            RecipeStepRepository recipeStepRepository,
            RecipeMediaRepository recipeMediaRepository,
            UserRepository userRepository,
            MediaStorageService mediaStorageService
    ) {
        this.recipeRepository = recipeRepository;
        this.recipeStepRepository = recipeStepRepository;
        this.recipeMediaRepository = recipeMediaRepository;
        this.userRepository = userRepository;
        this.mediaStorageService = mediaStorageService;
    }

    /**
     * Saves uploaded media for a recipe, optionally linked to a step. Assigns the next {@code display_order}
     * within the same scope (global vs step).
     */
    @Transactional
    public RecipeMediaDto upload(long userId, long recipeId, Long stepId, MultipartFile file) {
        userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado: " + userId));
        Recipe recipe = recipeRepository.findByRecipeIdAndOwner_UserId(recipeId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Receta no encontrada: " + recipeId));

        RecipeStep step = null;
        if (stepId != null) {
            step = recipeStepRepository.findByStepIdAndRecipe_RecipeId(stepId, recipeId)
                    .orElseThrow(() -> new IllegalArgumentException("Paso no encontrado: " + stepId));
        }

        final String relative;
        try {
            relative = mediaStorageService.store(userId, recipeId, file);
        } catch (IOException e) {
            throw new FileStorageException("No se pudo guardar el archivo subido.", e);
        }

        int nextOrder = step == null
                ? recipeMediaRepository.maxDisplayOrderGlobal(recipeId) + 1
                : recipeMediaRepository.maxDisplayOrderForStep(step.getStepId()) + 1;

        RecipeMedia entity = new RecipeMedia();
        entity.setRecipe(recipe);
        entity.setStep(step);
        entity.setRelativePath(relative);
        entity.setContentType(file.getContentType() != null ? file.getContentType() : "application/octet-stream");
        entity.setOriginalFilename(file.getOriginalFilename());
        entity.setDisplayOrder(nextOrder);

        RecipeMedia saved = recipeMediaRepository.save(entity);
        return toDto(saved);
    }

    @Transactional
    public void deleteMedia(long userId, long recipeId, long mediaId) throws IOException {
        userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado: " + userId));
        RecipeMedia media = recipeMediaRepository.findByMediaIdAndRecipe_RecipeId(mediaId, recipeId)
                .orElseThrow(() -> new IllegalArgumentException("Archivo multimedia no encontrado: " + mediaId));
        if (media.getRecipe().getOwner().getUserId() != userId) {
            throw new IllegalArgumentException("El archivo no pertenece a este usuario.");
        }
        mediaStorageService.deleteIfExists(media.getRelativePath());
        recipeMediaRepository.delete(media);
    }

    /**
     * Reorders media in one scope: {@code stepId == null} = recipe-level gallery; otherwise that step's attachments.
     * Body must list every media id in that scope exactly once, in desired order (index 0 = cover / first in UI).
     */
    @Transactional
    public void reorderMedia(long userId, long recipeId, Long stepId, UpdateRecipeMediaOrderRequest request) {
        userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado: " + userId));
        recipeRepository.findByRecipeIdAndOwner_UserId(recipeId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Receta no encontrada: " + recipeId));

        List<RecipeMedia> all = recipeMediaRepository.findByRecipe_RecipeId(recipeId);
        List<RecipeMedia> inScope = all.stream()
                .filter(m -> stepId == null
                        ? m.getStep() == null
                        : (m.getStep() != null && Objects.equals(m.getStep().getStepId(), stepId)))
                .toList();

        Set<Long> scopeIds = inScope.stream().map(RecipeMedia::getMediaId).collect(Collectors.toSet());
        List<Long> ordered = request.mediaIdsInOrder();
        if (ordered.isEmpty() || scopeIds.size() != ordered.size() || !scopeIds.equals(new HashSet<>(ordered))) {
            throw new IllegalArgumentException(
                    "La lista de ids no coincide con los archivos multimedia de este ámbito.");
        }

        for (int i = 0; i < ordered.size(); i++) {
            Long mid = ordered.get(i);
            RecipeMedia m = inScope.stream()
                    .filter(x -> x.getMediaId().equals(mid))
                    .findFirst()
                    .orElseThrow();
            m.setDisplayOrder(i);
            recipeMediaRepository.save(m);
        }
    }

    private RecipeMediaDto toDto(RecipeMedia m) {
        String url = MEDIA_URL_PREFIX + m.getRelativePath();
        Long sid = m.getStep() != null ? m.getStep().getStepId() : null;
        return new RecipeMediaDto(m.getMediaId(), sid, m.getDisplayOrder(), url, m.getContentType());
    }
}