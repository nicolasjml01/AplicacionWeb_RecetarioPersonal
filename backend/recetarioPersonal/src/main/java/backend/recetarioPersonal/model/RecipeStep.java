/*package backend.recetarioPersonal.model;

import jakarta.persistence.*;

@Entity
@Table(name = "recipe_steps")
public class RecipeStep {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long stepId;
    @Column(nullable = false)
    private Long recipeId;
    @Column(nullable = false)
    private int stepNumber;
    @Column(nullable = false)
    private String stepDescription;

    public Long getStepId() {
        return stepId;
    }
    public void setStepId(Long stepId) {
        this.stepId = stepId;
    }
    public Long getRecipeId() {
        return recipeId;
    }
    public void setRecipeId(Long recipeId) {
        this.recipeId = recipeId;
    }
    public int getStepNumber() {
        return stepNumber;
    }
    public void setStepNumber(int stepNumber) {
        this.stepNumber = stepNumber;
    }
    public String getStepDescription() {
        return stepDescription;
    }
    public void setStepDescription(String stepDescription) {
        this.stepDescription = stepDescription;
    }
}
*/