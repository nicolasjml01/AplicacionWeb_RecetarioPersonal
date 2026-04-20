package backend.recetarioPersonal.repository;

import backend.recetarioPersonal.model.Ingredient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

/**
 * Ingredient persistence. Visibility: catalog rows ({@code owner} null) plus rows owned by the given user.
 */
public interface IngredientRepository extends JpaRepository<Ingredient, Long> {

        @Query("""
                select i from Ingredient i
                left join fetch i.category
                where lower(i.name) like lower(concat('%', :q, '%'))
                and (i.owner is null or i.owner.userId = :userId)
                """)
        List<Ingredient> searchVisibleToUser(@Param("q") String q, @Param("userId") long userId);

        @Query("""
                select i from Ingredient i
                left join fetch i.category
                where lower(i.name) = lower(:name)
                and (i.owner is null or i.owner.userId = :userId)
                """)
        Optional<Ingredient> findVisibleToUserByExactNameIgnoreCase(
                @Param("name") String name,
                @Param("userId") long userId
        );
        
        @Query("""
                select i from Ingredient i
                left join fetch i.category
                where i.owner is null or i.owner.userId = :userId
                """)
        List<Ingredient> findAllVisibleToUser(@Param("userId") long userId);
        }
