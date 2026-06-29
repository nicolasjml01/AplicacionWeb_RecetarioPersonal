package backend.recetarioPersonal.service;

import backend.recetarioPersonal.model.RecipeCategory;
import backend.recetarioPersonal.model.User;
import backend.recetarioPersonal.repository.RecipeCategoryRepository;
import backend.recetarioPersonal.repository.UserRepository;
import backend.recetarioPersonal.view.CreateRecipeCategoryRequest;
import backend.recetarioPersonal.view.RecipeCategoryDto;
import backend.recetarioPersonal.view.UpdateRecipeCategoryRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class RecipeCategoryService {

    private final RecipeCategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private static final String DEFAULT_TAG_NAME = "Sin etiqueta";

    public RecipeCategoryService(
            RecipeCategoryRepository categoryRepository,
            UserRepository userRepository
    ) {
        this.categoryRepository = categoryRepository;
        this.userRepository = userRepository;
    }

    private boolean isDefaultTag(String name) {
        return name != null && name.trim().equalsIgnoreCase(DEFAULT_TAG_NAME);
    }

    @Transactional(readOnly = true)
    public List<RecipeCategoryDto> findAll(long userId) {
        return categoryRepository.findByOwner_UserIdOrderByNameAsc(userId).stream()
                .map(c -> new RecipeCategoryDto(c.getCategoryId(), c.getName()))
                .toList();
    }

    @Transactional
    public RecipeCategoryDto create(long userId, CreateRecipeCategoryRequest request) {
        String normalized = normalize(request.name());
        if (normalized.isBlank()) {
            throw new IllegalArgumentException("Category name is required.");
        }
        if (isDefaultTag(normalized)) {
            throw new IllegalArgumentException("Default category name is reserved.");
        }
        if (categoryRepository.existsByOwner_UserIdAndNameIgnoreCase(userId, normalized)) {
            throw new IllegalArgumentException("Recipe category already exists.");
        }

        User owner = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        RecipeCategory category = new RecipeCategory();
        category.setOwner(owner);
        category.setName(normalized);

        category = categoryRepository.save(category);
        return new RecipeCategoryDto(category.getCategoryId(), category.getName());
    }

    @Transactional
    public RecipeCategoryDto update(long userId, Long categoryId, UpdateRecipeCategoryRequest request) {
        RecipeCategory category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new IllegalArgumentException("Recipe category not found: " + categoryId));

        if (category.getOwner().getUserId() != userId) {
            throw new IllegalArgumentException("Category does not belong to user.");
        }

        if (isDefaultTag(category.getName())) {
            throw new IllegalArgumentException("Default category cannot be renamed.");
        }

        String normalized = normalize(request.name());
        if (normalized.isBlank()) {
            throw new IllegalArgumentException("Category name is required.");
        }

        if (isDefaultTag(normalized) && !isDefaultTag(category.getName())) {
            throw new IllegalArgumentException("Default category name is reserved.");
        }

        categoryRepository.findByOwner_UserIdAndNameIgnoreCase(userId, normalized).ifPresent(existing -> {
            if (!existing.getCategoryId().equals(categoryId)) {
                throw new IllegalArgumentException("Recipe category already exists.");
            }
        });

        category.setName(normalized);
        category = categoryRepository.save(category);
        return new RecipeCategoryDto(category.getCategoryId(), category.getName());
    }

    @Transactional
    public void delete(long userId, Long categoryId) {
        RecipeCategory category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new IllegalArgumentException("Recipe category not found: " + categoryId));

        if (category.getOwner().getUserId() != userId) {
            throw new IllegalArgumentException("Category does not belong to user.");
        }

        if (isDefaultTag(category.getName())) {
            throw new IllegalArgumentException("Default category cannot be deleted.");
        }

        categoryRepository.delete(category);
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }
}