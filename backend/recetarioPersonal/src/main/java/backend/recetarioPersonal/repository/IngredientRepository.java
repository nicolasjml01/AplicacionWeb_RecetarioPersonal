package backend.recetarioPersonal.repository;

import backend.recetarioPersonal.model.Ingredient;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/*
   This repository is used to manage the ingredients.
*/
public interface IngredientRepository extends JpaRepository<Ingredient, Long> {

    Optional<Ingredient> findByName(String name);
    List<Ingredient> findByNameContainingIgnoreCase(String name);
}