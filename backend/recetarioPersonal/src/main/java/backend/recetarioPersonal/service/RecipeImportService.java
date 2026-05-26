package backend.recetarioPersonal.service;

import backend.recetarioPersonal.exception.RecipeImportException;
import backend.recetarioPersonal.recipeimport.PageFetcher;
import backend.recetarioPersonal.recipeimport.RecipeExtractor;
import backend.recetarioPersonal.recipeimport.UrlValidator;
import backend.recetarioPersonal.repository.UserRepository;
import backend.recetarioPersonal.view.ImportRecipeFromUrlRequest;
import backend.recetarioPersonal.view.RecipeImportPreviewDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RecipeImportService {

    private final UserRepository userRepository;
    private final UrlValidator urlValidator;
    private final PageFetcher pageFetcher;
    private final RecipeExtractor schemaOrgRecipeExtractor;

    public RecipeImportService(
            UserRepository userRepository,
            UrlValidator urlValidator,
            PageFetcher pageFetcher,
            RecipeExtractor schemaOrgRecipeExtractor) {
        this.userRepository = userRepository;
        this.urlValidator = urlValidator;
        this.pageFetcher = pageFetcher;
        this.schemaOrgRecipeExtractor = schemaOrgRecipeExtractor;
    }

    /**
     * Fetches the page and extracts a recipe preview. Does not persist anything.
     */
    @Transactional(readOnly = true)
    public RecipeImportPreviewDto previewFromUrl(long userId, ImportRecipeFromUrlRequest request) {
        userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado: " + userId));

        String normalizedUrl = urlValidator.validateAndNormalize(request.url());
        String html = pageFetcher.fetch(normalizedUrl);

        RecipeImportPreviewDto preview = schemaOrgRecipeExtractor
                .extract(html, normalizedUrl)
                .orElseThrow(() -> new RecipeImportException(
                        "Esta página no incluye datos de receta reconocibles (Schema.org). "
                                + "Prueba con un enlace de un blog de cocina o introduce la receta manualmente."));

        if (isEffectivelyEmpty(preview)) {
            throw new RecipeImportException(
                    "No se pudo extraer información útil de la receta en ese enlace.");
        }

        return preview;
    }

    private boolean isEffectivelyEmpty(RecipeImportPreviewDto preview) {
        boolean hasTitle = preview.title() != null && !preview.title().isBlank();
        boolean hasIngredients = preview.ingredients() != null && !preview.ingredients().isEmpty();
        boolean hasSteps = preview.steps() != null && !preview.steps().isEmpty();
        return !hasTitle && !hasIngredients && !hasSteps;
    }
}