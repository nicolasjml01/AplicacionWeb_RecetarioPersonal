package backend.recetarioPersonal.model;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "day_meal_layout")
public class DayMealLayout {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "day_meal_layout_id")
    private Long dayMealLayoutId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_user_id", nullable = false)
    private User owner;

    @Column(name = "plan_date", nullable = false)
    private LocalDate planDate;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "meal_type_id", nullable = false)
    private MealType mealType;

    @Column(name = "meal_sort_order", nullable = false)
    private int mealSortOrder;

    public Long getDayMealLayoutId() {
        return dayMealLayoutId;
    }

    public void setDayMealLayoutId(Long dayMealLayoutId) {
        this.dayMealLayoutId = dayMealLayoutId;
    }

    public User getOwner() {
        return owner;
    }

    public void setOwner(User owner) {
        this.owner = owner;
    }

    public LocalDate getPlanDate() {
        return planDate;
    }

    public void setPlanDate(LocalDate planDate) {
        this.planDate = planDate;
    }

    public MealType getMealType() {
        return mealType;
    }

    public void setMealType(MealType mealType) {
        this.mealType = mealType;
    }

    public int getMealSortOrder() {
        return mealSortOrder;
    }

    public void setMealSortOrder(int mealSortOrder) {
        this.mealSortOrder = mealSortOrder;
    }
}