package backend.recetarioPersonal.service;

import backend.recetarioPersonal.exception.FileStorageException;
import backend.recetarioPersonal.recipeimport.ImportImageFetcher;
import backend.recetarioPersonal.recipeimport.ImportImageFetcher.DownloadedImage;
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

import backend.recetarioPersonal.view.ImportRecipeMediaFromUrlsResponse;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Optional;
import java.util.Map;
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
    private final ImportImageFetcher importImageFetcher;

    public RecipeMediaService(
            RecipeRepository recipeRepository,
            RecipeStepRepository recipeStepRepository,
            RecipeMediaRepository recipeMediaRepository,
            UserRepository userRepository,
            MediaStorageService mediaStorageService,
            ImportImageFetcher importImageFetcher
    ) {
        this.recipeRepository = recipeRepository;
        this.recipeStepRepository = recipeStepRepository;
        this.recipeMediaRepository = recipeMediaRepository;
        this.userRepository = userRepository;
        this.mediaStorageService = mediaStorageService;
        this.importImageFetcher = importImageFetcher;
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

    /**
     * Replaces the physical file of an existing media item, keeping its id, step, and display order.
     * Used by the in-app image editor when the user re-edits an already uploaded photo.
     */
    @Transactional
    public RecipeMediaDto replaceContent(long userId, long recipeId, long mediaId, MultipartFile file) {
        userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado: " + userId));
        RecipeMedia media = recipeMediaRepository.findByMediaIdAndRecipe_RecipeId(mediaId, recipeId)
                .orElseThrow(() -> new IllegalArgumentException("Archivo multimedia no encontrado: " + mediaId));
        if (media.getRecipe().getOwner().getUserId() != userId) {
            throw new IllegalArgumentException("El archivo no pertenece a este usuario.");
        }

        String oldPath = media.getRelativePath();
        final String newPath;
        try {
            newPath = mediaStorageService.store(userId, recipeId, file);
        } catch (IOException e) {
            throw new FileStorageException("No se pudo guardar el archivo subido.", e);
        }

        media.setRelativePath(newPath);
        media.setContentType(file.getContentType() != null ? file.getContentType() : "application/octet-stream");
        media.setOriginalFilename(file.getOriginalFilename());

        RecipeMedia saved = recipeMediaRepository.save(media);

        // Best effort: orphan blob is preferable to losing the saved update.
        try {
            mediaStorageService.deleteIfExists(oldPath);
        } catch (FileStorageException ignored) {
            // swallow; the new file is already linked
        }

        return toDto(saved);
    }

    /**
     * Downloads images from public URLs (recipe import) and attaches them to the recipe gallery.
     */
    @Transactional
    public ImportRecipeMediaFromUrlsResponse importFromUrls(long userId, long recipeId, List<String> urls) {
        userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado: " + userId));
        Recipe recipe = recipeRepository.findByRecipeIdAndOwner_UserId(recipeId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Receta no encontrada: " + recipeId));

        List<RecipeMediaDto> imported = new ArrayList<>();
        List<String> warnings = new ArrayList<>();

        if (urls == null || urls.isEmpty()) {
            return new ImportRecipeMediaFromUrlsResponse(imported, warnings);
        }

        int nextOrder = recipeMediaRepository.maxDisplayOrderGlobal(recipeId) + 1;
        for (String raw : urls) {
            if (imported.size() >= 1) {
                break;
            }
            Optional<DownloadedImage> downloaded = importImageFetcher.fetch(raw);
            if (downloaded.isEmpty()) {
                continue;
            }
            DownloadedImage image = downloaded.get();
            try {
                String relative = mediaStorageService.storeBytes(
                        userId, recipeId, image.data(), image.contentType(), image.filename());

                RecipeMedia entity = new RecipeMedia();
                entity.setRecipe(recipe);
                entity.setStep(null);
                entity.setRelativePath(relative);
                entity.setContentType(image.contentType());
                entity.setOriginalFilename(image.filename());
                entity.setDisplayOrder(nextOrder);

                imported.add(toDto(recipeMediaRepository.save(entity)));
            } catch (IOException e) {
                warnings.add("No se pudo guardar la portada importada.");
            }
        }

        if (imported.isEmpty()) {
            warnings.add("No se pudo importar la portada desde el enlace (el sitio puede bloquear la descarga).");
        }

        return new ImportRecipeMediaFromUrlsResponse(imported, warnings);
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
     * Reorder media in one scope: {@code stepId == null} = recipe-level gallery; otherwise that step's attachments.
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

        // Index by mediaId to access in O(1) in the two passes.
        Map<Long, RecipeMedia> byId = inScope.stream()
                .collect(Collectors.toMap(RecipeMedia::getMediaId, m -> m));

        // Pass 1: park all rows of the scope in negative values
        // (-1, -2, -3, ...). The unique index uk_recipe_media_global_display_order /
        // uk_recipe_media_step_display_order is not violated at any moment
        // because no other row of the scope can have a negative.
        for (int i = 0; i < ordered.size(); i++) {
            byId.get(ordered.get(i)).setDisplayOrder(-(i + 1));
        }
        // Force Hibernate to send the UPDATEs with the negatives NOW. Without this
        // flush, Hibernate would merge the first pass and the second pass into a single UPDATE
        // per row (with the final positive value) and we would go back to the bug.
        recipeMediaRepository.flush();

        // Pass 2: there are no more rows of the scope with a positive display_order,
        // so we assign 0..N-1 without risk of collision. The final UPDATE will come
        // in the implicit flush of the commit of the transaction.
        for (int i = 0; i < ordered.size(); i++) {
            byId.get(ordered.get(i)).setDisplayOrder(i);
        }
    }

    private RecipeMediaDto toDto(RecipeMedia m) {
        String url = MEDIA_URL_PREFIX + m.getRelativePath();
        Long sid = m.getStep() != null ? m.getStep().getStepId() : null;
        return new RecipeMediaDto(m.getMediaId(), sid, m.getDisplayOrder(), url, m.getContentType());
    }
}