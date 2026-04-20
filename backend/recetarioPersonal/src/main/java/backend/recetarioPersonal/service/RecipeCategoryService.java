package backend.recetarioPersonal.service;

import backend.recetarioPersonal.model.RecipeCategory;
import backend.recetarioPersonal.repository.RecipeCategoryRepository;
import backend.recetarioPersonal.view.CreateRecipeCategoryRequest;
import backend.recetarioPersonal.view.RecipeCategoryDto;
import backend.recetarioPersonal.view.UpdateRecipeCategoryRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class RecipeCategoryService {

    private final RecipeCategoryRepository categoryRepository;
    private static final String DEFAULT_CATEGORY_NAME = "Sin categoría";

    public RecipeCategoryService(RecipeCategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    private boolean isDefaultCategory(String name) {
        return name != null && name.trim().equalsIgnoreCase(DEFAULT_CATEGORY_NAME);
    }

    @Transactional(readOnly = true)
    public List<RecipeCategoryDto> findAll() {
        return categoryRepository.findAll().stream()
                .map(c -> new RecipeCategoryDto(c.getCategoryId(), c.getName()))
                .toList();
    }

    @Transactional
    public RecipeCategoryDto create(CreateRecipeCategoryRequest request) {
        String normalized = normalize(request.name());
        if (categoryRepository.existsByNameIgnoreCase(normalized)) {
            throw new IllegalArgumentException("Recipe category already exists.");
        }
        if (normalized.isBlank()) {
            throw new IllegalArgumentException("Category name is required.");
        }
        RecipeCategory category = new RecipeCategory();
        category.setName(normalized);
        category = categoryRepository.save(category);
        return new RecipeCategoryDto(category.getCategoryId(), category.getName());
    }

    @Transactional
    public RecipeCategoryDto update(Long categoryId, UpdateRecipeCategoryRequest request) {
        RecipeCategory category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new IllegalArgumentException("Recipe category not found: " + categoryId));
    
        // Not allowed to rename the default category
        if (isDefaultCategory(category.getName())) {
            throw new IllegalArgumentException("Default category cannot be renamed.");
        }
    
        String normalized = normalize(request.name());
        categoryRepository.findByNameIgnoreCase(normalized).ifPresent(existing -> {
            if (!existing.getCategoryId().equals(categoryId)) {
                throw new IllegalArgumentException("Recipe category already exists.");
            }
        });
    
        category.setName(normalized);
        category = categoryRepository.save(category);
        return new RecipeCategoryDto(category.getCategoryId(), category.getName());
    }
    
    @Transactional
    public void delete(Long categoryId) {
        RecipeCategory category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new IllegalArgumentException("Recipe category not found: " + categoryId));
    
        // Not allowed to delete the default category
        if (isDefaultCategory(category.getName())) {
            throw new IllegalArgumentException("Default category cannot be deleted.");
        }
    
        categoryRepository.delete(category);
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }
}