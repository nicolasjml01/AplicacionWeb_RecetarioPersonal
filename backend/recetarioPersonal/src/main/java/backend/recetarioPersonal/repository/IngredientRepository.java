package backend.recetarioPersonal.repository;

import backend.recetarioPersonal.model.Ingredient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

/** Catalog ({@code owner} null) and per-user ingredient rows. */
public interface IngredientRepository extends JpaRepository<Ingredient, Long> {

    @Query("""
            select i from Ingredient i
            left join fetch i.category
            where i.normalizedName = :key
            and (i.owner is null or i.owner.userId = :userId)
            """)
    Optional<Ingredient> findVisibleToUserByNormalizedKey(
            @Param("key") String key,
            @Param("userId") long userId
    );

    @Query("""
            select i from Ingredient i
            left join fetch i.category
            where i.normalizedName like concat('%', :key, '%')
            and (i.owner is null or i.owner.userId = :userId)
            """)
    List<Ingredient> searchVisibleToUserByNormalizedKey(
            @Param("key") String key,
            @Param("userId") long userId
    );

    @Query("""
            select i from Ingredient i
            left join fetch i.category
            where i.owner is not null and i.owner.userId = :userId
            order by lower(i.name)
            """)
    List<Ingredient> findOwnedByUserOrderByName(@Param("userId") long userId);

    @Query("""
            select i from Ingredient i
            left join fetch i.category
            where i.owner is null or i.owner.userId = :userId
            """)
    List<Ingredient> findAllVisibleToUser(@Param("userId") long userId);

    Optional<Ingredient> findByIngredientIdAndOwner_UserId(long ingredientId, long ownerUserId);
}
