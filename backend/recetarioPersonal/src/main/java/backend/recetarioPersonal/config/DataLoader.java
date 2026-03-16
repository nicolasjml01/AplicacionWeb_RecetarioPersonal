package backend.recetarioPersonal.config;

import backend.recetarioPersonal.model.Ingredient;
import backend.recetarioPersonal.model.IngredientCategory;
import backend.recetarioPersonal.repository.IngredientCategoryRepository;
import backend.recetarioPersonal.repository.IngredientRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/*
 * This class is used to load the data into the database. In future will be used to load the data from a file.
 * For now, it is used to load the data into the database.
 */
@Configuration
public class DataLoader {

    @Bean
    public CommandLineRunner loadData(
            IngredientCategoryRepository categoryRepo,
            IngredientRepository ingredientRepo) {
        return args -> {
            IngredientCategory own = categoryRepo.findByName("Own")
                    .orElseGet(() -> {
                        IngredientCategory c = new IngredientCategory();
                        c.setName("Own");
                        return categoryRepo.save(c);
                    });

            createCategoryWithIngredients(categoryRepo, ingredientRepo, "Dairy", "Milk", "Cheese", "Yogurt");
            createCategoryWithIngredients(categoryRepo, ingredientRepo, "Vegetables", "Tomato", "Onion", "Lettuce");
            createCategoryWithIngredients(categoryRepo, ingredientRepo, "Fruits", "Apple", "Banana", "Lemon");
        };
    }

    private void createCategoryWithIngredients(
            IngredientCategoryRepository categoryRepo,
            IngredientRepository ingredientRepo,
            String categoryName,
            String... ingredientNames) {
        IngredientCategory cat = categoryRepo.findByName(categoryName)
                .orElseGet(() -> {
                    IngredientCategory c = new IngredientCategory();
                    c.setName(categoryName);
                    return categoryRepo.save(c);
                });
        for (String name : ingredientNames) {
            if (ingredientRepo.findByName(name).isEmpty()) {
                Ingredient ing = new Ingredient();
                ing.setName(name);
                ing.setCategory(cat);
                ingredientRepo.save(ing);
            }
        }
    }
}