/*package backend.recetarioPersonal.model;

import jakarta.persistence.*;

@Entity
@Table(name = "recipes")
public class Recipe {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long recipeId;
    @Column(nullable = false)
    private Long userId;
    @Column(nullable = false, unique = true)
    private String name;

    public Long getId() {
        return recipeId;
    }
    public void setId(Long id) {
        this.recipeId = recipeId;
    }
    public Long getUserId() {
        return userId;
    }
    public void setUserId(Long userId) {
        this.userId = userId;
    }
    public String getName() {
        return name;
    }
    public void setName(String name) {
        this.name = name;
    }
}
*/
