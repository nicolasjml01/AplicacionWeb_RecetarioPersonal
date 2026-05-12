package backend.recetarioPersonal.service;

import backend.recetarioPersonal.exception.FileStorageException;
import backend.recetarioPersonal.model.Ingredient;
import backend.recetarioPersonal.repository.IngredientRepository;
import backend.recetarioPersonal.repository.UserRepository;
import backend.recetarioPersonal.view.IngredientDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@Service
public class IngredientImageService {

    private final UserRepository userRepository;
    private final IngredientRepository ingredientRepository;
    private final MediaStorageService mediaStorageService;
    private final IngredientService ingredientService;

    public IngredientImageService(
            UserRepository userRepository,
            IngredientRepository ingredientRepository,
            MediaStorageService mediaStorageService,
            IngredientService ingredientService
    ) {
        this.userRepository = userRepository;
        this.ingredientRepository = ingredientRepository;
        this.mediaStorageService = mediaStorageService;
        this.ingredientService = ingredientService;
    }

    /**
     * Only user-owned ingredients ({@code owner} non-null) may have a custom image path.
     */
    @Transactional
    public IngredientDto uploadImage(long userId, long ingredientId, MultipartFile file) {
        userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado: " + userId));

        Ingredient ing = ingredientRepository.findByIngredientIdAndOwner_UserId(ingredientId, userId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Ingrediente no encontrado o no es tuyo (no se puede asignar imagen al catálogo global)."));

        String previous = ing.getImageRelativePath();
        final String relative;
        try {
            relative = mediaStorageService.storeIngredientImage(userId, ingredientId, file);
        } catch (IOException e) {
            throw new FileStorageException("No se pudo guardar la imagen del ingrediente.", e);
        }

        if (previous != null && !previous.isBlank() && !previous.equals(relative)) {
            mediaStorageService.deleteIfExists(previous);
        }

        ing.setImageRelativePath(relative);
        ingredientRepository.save(ing);

        return ingredientService.toDto(ingredientRepository.findById(ingredientId).orElseThrow());
    }
}