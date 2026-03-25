package backend.recetarioPersonal.model;

import jakarta.persistence.*;

@Entity
@Table(name = "recipeIngredients")
public class RecipeIngredient {

    @EmbeddedId
    private RecipeIngredientId id = new RecipeIngredientId();

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("recipeId")
    @JoinColumn(name = "recipeId")
    private Recipe recipe;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("ingredientId")
    @JoinColumn(name = "ingredientId")
    private Ingredient ingredient;

    @Column(nullable = false, length = 64)
    private String quantity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "unitOfMeasureId")
    private UnitOfMeasure unitOfMeasure;

    public RecipeIngredient() {
    }

    public RecipeIngredientId getId() {
        return id;
    }

    public void setId(RecipeIngredientId id) {
        this.id = id;
    }

    public Recipe getRecipe() {
        return recipe;
    }

    public void setRecipe(Recipe recipe) {
        this.recipe = recipe;
    }

    public Ingredient getIngredient() {
        return ingredient;
    }

    public void setIngredient(Ingredient ingredient) {
        this.ingredient = ingredient;
    }

    public String getQuantity() {
        return quantity;
    }

    public void setQuantity(String quantity) {
        this.quantity = quantity;
    }

    public UnitOfMeasure getUnitOfMeasure() {
        return unitOfMeasure;
    }

    public void setUnitOfMeasure(UnitOfMeasure unitOfMeasure) {
        this.unitOfMeasure = unitOfMeasure;
    }
}