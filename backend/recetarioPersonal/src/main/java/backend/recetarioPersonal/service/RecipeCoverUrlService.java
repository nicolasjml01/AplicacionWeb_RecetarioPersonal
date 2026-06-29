package backend.recetarioPersonal.service;

import backend.recetarioPersonal.model.RecipeMedia;
import backend.recetarioPersonal.repository.RecipeMediaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Resolves a single cover image URL per recipe (recipe-level media first, then step media).
 * Shared by calendar views and day shopping import preview.
 */
@Service
public class RecipeCoverUrlService {

    private final RecipeMediaRepository recipeMediaRepository;

    public RecipeCoverUrlService(RecipeMediaRepository recipeMediaRepository) {
        this.recipeMediaRepository = recipeMediaRepository;
    }

    @Transactional(readOnly = true)
    public Map<Long, String> loadCoverUrlsByRecipeId(List<Long> recipeIds) {
        if (recipeIds == null || recipeIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, String> out = new HashMap<>();

        List<RecipeMedia> global = recipeMediaRepository
                .findByRecipe_RecipeIdInAndStepIsNullOrderByRecipe_RecipeIdAscDisplayOrderAsc(recipeIds);
        for (RecipeMedia m : global) {
            out.putIfAbsent(m.getRecipe().getRecipeId(),
                    RecipeMediaService.MEDIA_URL_PREFIX + m.getRelativePath());
        }

        List<Long> missing = recipeIds.stream().filter(id -> !out.containsKey(id)).toList();
        if (!missing.isEmpty()) {
            List<RecipeMedia> stepMedia = recipeMediaRepository
                    .findByRecipe_RecipeIdInAndStepIsNotNullOrderByRecipe_RecipeIdAscStep_StepNumberAscDisplayOrderAsc(
                            missing);
            for (RecipeMedia m : stepMedia) {
                out.putIfAbsent(m.getRecipe().getRecipeId(),
                        RecipeMediaService.MEDIA_URL_PREFIX + m.getRelativePath());
            }
        }
        return out;
    }
}
