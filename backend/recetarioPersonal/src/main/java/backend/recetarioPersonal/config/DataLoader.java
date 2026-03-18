package backend.recetarioPersonal.config;

import backend.recetarioPersonal.model.Ingredient;
import backend.recetarioPersonal.model.IngredientCategory;
import backend.recetarioPersonal.model.UnitOfMeasure;
import backend.recetarioPersonal.repository.IngredientCategoryRepository;
import backend.recetarioPersonal.repository.IngredientRepository;
import backend.recetarioPersonal.repository.ShoppingListItemRepository;
import backend.recetarioPersonal.repository.UnitOfMeasureRepository;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Loads initial data into the database.
 * Categories from CategoryData.txt, ingredients from IngredientData.txt.
 * Skips loading if files do not exist or data already exists.
 */
@Configuration
public class DataLoader {

    private static final String CATEGORY_DATA_FILE = "CategoryData.txt";
    private static final String INGREDIENT_DATA_FILE = "IngredientData.txt";
    private static final String UNIT_DATA_FILE = "UnitData.txt";

    @Bean
    public CommandLineRunner loadData(
            IngredientCategoryRepository categoryRepo,
            IngredientRepository ingredientRepo,
            UnitOfMeasureRepository unitRepo,
            ShoppingListItemRepository shoppingListItemRepo) {
        return args -> {
            // --- Load categories from CategoryData.txt ---
            ClassPathResource resource = new ClassPathResource(CATEGORY_DATA_FILE);
            if (resource.exists() && categoryRepo.count() == 0) {
                shoppingListItemRepo.deleteAll();
                ingredientRepo.deleteAll();
                unitRepo.deleteAll(); 
                categoryRepo.deleteAll();

                List<String> categoryNames;
                try (BufferedReader reader = new BufferedReader(
                        new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {
                    categoryNames = reader.lines()
                            .map(String::trim)
                            .filter(line -> !line.isEmpty())
                            .collect(Collectors.toList());
                }

                for (String name : categoryNames) {
                    IngredientCategory cat = new IngredientCategory();
                    cat.setName(name);
                    categoryRepo.save(cat);
                }
            }

            // --- Load ingredients from IngredientData.txt ---
            ClassPathResource ingredientResource = new ClassPathResource(INGREDIENT_DATA_FILE);
            if (ingredientResource.exists() && ingredientRepo.count() == 0) {
                List<IngredientCategory> categories = categoryRepo.findAll();
                Map<String, IngredientCategory> categoryByName = categories.stream()
                        .collect(Collectors.toMap(IngredientCategory::getName, c -> c));

                try (BufferedReader reader = new BufferedReader(
                        new InputStreamReader(ingredientResource.getInputStream(), StandardCharsets.UTF_8))) {
                    reader.lines()
                            .map(String::trim)
                            .filter(line -> !line.isEmpty())
                            .forEach(line -> {
                                String[] parts = line.split(";", 2);
                                if (parts.length != 2) return;
                                String ingredientName = parts[0].trim();
                                String categoryName = parts[1].trim();
                                if (ingredientName.isEmpty() || categoryName.isEmpty()) return;

                                IngredientCategory category = categoryByName.get(categoryName);
                                if (category == null) return;

                                if (ingredientRepo.findByName(ingredientName).isEmpty()) {
                                    Ingredient ing = new Ingredient();
                                    ing.setName(ingredientName);
                                    ing.setCategory(category);
                                    ingredientRepo.save(ing);
                                }
                            });
                }
            }

            // --- Load units from UnitData.txt ---
            ClassPathResource unitResource = new ClassPathResource(UNIT_DATA_FILE);
            if (unitResource.exists() && unitRepo.count() == 0) {
                try (BufferedReader reader = new BufferedReader(
                        new InputStreamReader(unitResource.getInputStream(), StandardCharsets.UTF_8))) {
                    reader.lines()
                            .map(String::trim)
                            .filter(line -> !line.isEmpty())
                            .forEach(line -> {
                                String[] parts = line.split(";", 2);
                                String unitName = parts[0].trim();
                                if (unitName.isEmpty()) return;
                                String symbol = parts.length > 1 ? parts[1].trim() : null;
                                if (unitRepo.findByNameIgnoreCase(unitName).isEmpty()) {
                                    UnitOfMeasure unit = new UnitOfMeasure();
                                    unit.setName(unitName);
                                    unit.setSymbol(symbol.isEmpty() ? null : symbol);
                                    unitRepo.save(unit);
                                }
                            });
                }
            }
        };
    }
}