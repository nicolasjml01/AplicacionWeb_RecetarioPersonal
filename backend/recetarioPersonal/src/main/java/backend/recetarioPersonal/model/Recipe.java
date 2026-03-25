package backend.recetarioPersonal.model;

import jakarta.persistence.*;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "recipes")
public class Recipe {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long recipeId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "userId", nullable = false, referencedColumnName = "userId")
    private User user;

    @Column(nullable = false)
    private String name;

    @ManyToMany
    @JoinTable(
            name = "recipeRecipeCategory",
            joinColumns = @JoinColumn(name = "recipeId", referencedColumnName = "recipeId"),
            inverseJoinColumns = @JoinColumn(name = "categoryId", referencedColumnName = "categoryId")
    )
    private Set<RecipeCategory> categories = new HashSet<>();

    @OneToMany(mappedBy = "recipe", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<RecipeStep> steps = new HashSet<>();

    @OneToMany(mappedBy = "recipe", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<RecipeIngredient> ingredients = new HashSet<>();

    public Recipe() {
    }

    public Long getRecipeId() {
        return recipeId;
    }

    public void setRecipeId(Long recipeId) {
        this.recipeId = recipeId;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Set<RecipeCategory> getCategories() {
        return categories;
    }

    public Set<RecipeStep> getSteps() {
        return steps;
    }

    public Set<RecipeIngredient> getIngredients() {
        return ingredients;
    }
}