package backend.recetarioPersonal.service;

import backend.recetarioPersonal.model.Recipe;
import backend.recetarioPersonal.model.RecipeMedia;
import backend.recetarioPersonal.model.RecipeStep;
import backend.recetarioPersonal.repository.RecipeMediaRepository;
import backend.recetarioPersonal.repository.RecipeRepository;
import backend.recetarioPersonal.repository.RecipeStepRepository;
import backend.recetarioPersonal.repository.UserRepository;
import backend.recetarioPersonal.view.RecipeMediaDto;
import backend.recetarioPersonal.exception.FileStorageException;

import java.io.IOException;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

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
     * Saves uploaded media for a recipe, optionally linked to a step. Disk I/O is handled inside
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
        RecipeMedia entity = new RecipeMedia();
        entity.setRecipe(recipe);
        entity.setStep(step);
        entity.setRelativePath(relative);
        entity.setContentType(file.getContentType() != null ? file.getContentType() : "application/octet-stream");
        entity.setOriginalFilename(file.getOriginalFilename());
        RecipeMedia saved = recipeMediaRepository.save(entity);

        return toDto(saved);
    }

    private RecipeMediaDto toDto(RecipeMedia m) {
        String url = MEDIA_URL_PREFIX + m.getRelativePath();
        Long stepId = m.getStep() != null ? m.getStep().getStepId() : null;
        return new RecipeMediaDto(m.getMediaId(), stepId, url, m.getContentType());
    }
}