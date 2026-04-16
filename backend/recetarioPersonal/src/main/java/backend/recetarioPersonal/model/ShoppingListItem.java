package backend.recetarioPersonal.model;

import jakarta.persistence.*;

@Entity
@Table(name = "shopping_list_items")
public class ShoppingListItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "shopping_list_item_id")
    private Long shoppingListItemId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, referencedColumnName = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ingredient_id", nullable = false, referencedColumnName = "ingredient_id")
    private Ingredient ingredient;

    @Column(name = "bought", nullable = false)
    private boolean bought;

    @Column(name = "quantity", nullable = false)
    private float quantity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "unit_of_measure_id", nullable = true, referencedColumnName = "unit_id")
    private UnitOfMeasure unitOfMeasure;

    public ShoppingListItem() {
    }

    public Long getShoppingListItemId() {
        return shoppingListItemId;
    }

    public void setShoppingListItemId(Long shoppingListItemId) {
        this.shoppingListItemId = shoppingListItemId;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public Ingredient getIngredient() {
        return ingredient;
    }

    public void setIngredient(Ingredient ingredient) {
        this.ingredient = ingredient;
    }

    public boolean isBought() {
        return bought;
    }

    public void setBought(boolean bought) {
        this.bought = bought;
    }

    public float getQuantity() {
        return quantity;
    }

    public void setQuantity(float quantity) {
        this.quantity = quantity;
    }

    public UnitOfMeasure getUnitOfMeasure() {
        return unitOfMeasure;
    }

    public void setUnitOfMeasure(UnitOfMeasure unitOfMeasure) {
        this.unitOfMeasure = unitOfMeasure;
    }
}
