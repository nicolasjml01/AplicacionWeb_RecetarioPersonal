package backend.recetarioPersonal.model;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "calendar_entries")
public class CalendarEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "calendar_entry_id")
    private Long calendarEntryId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_user_id", nullable = false)
    private User owner;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recipe_id", nullable = false)
    private Recipe recipe;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "meal_type_id", nullable = false)
    private MealType mealType;

    @Column(name = "plan_date", nullable = false)
    private LocalDate planDate;

    @Column(name = "recipe_sort_order", nullable = false)
    private int recipeSortOrder;

    public Long getCalendarEntryId() {
        return calendarEntryId;
    }

    public void setCalendarEntryId(Long calendarEntryId) {
        this.calendarEntryId = calendarEntryId;
    }

    public User getOwner() {
        return owner;
    }

    public void setOwner(User owner) {
        this.owner = owner;
    }

    public Recipe getRecipe() {
        return recipe;
    }

    public void setRecipe(Recipe recipe) {
        this.recipe = recipe;
    }

    public MealType getMealType() {
        return mealType;
    }

    public void setMealType(MealType mealType) {
        this.mealType = mealType;
    }

    public LocalDate getPlanDate() {
        return planDate;
    }

    public void setPlanDate(LocalDate planDate) {
        this.planDate = planDate;
    }

    public int getRecipeSortOrder() {
        return recipeSortOrder;
    }

    public void setRecipeSortOrder(int recipeSortOrder) {
        this.recipeSortOrder = recipeSortOrder;
    }
}