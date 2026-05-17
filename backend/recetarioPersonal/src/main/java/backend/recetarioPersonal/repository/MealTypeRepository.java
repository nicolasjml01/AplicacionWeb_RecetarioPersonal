package backend.recetarioPersonal.repository;

import backend.recetarioPersonal.model.MealType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface MealTypeRepository extends JpaRepository<MealType, Long> {

    List<MealType> findByOwnerUserIdIsNullOrderByDefaultSortOrderAsc();

    List<MealType> findByOwner_UserIdOrderByNameAsc(long ownerUserId);

    Optional<MealType> findByOwner_UserIdAndNameIgnoreCase(long ownerUserId, String name);

    boolean existsByOwner_UserIdAndNameIgnoreCase(long ownerUserId, String name);

    @Query("""
            SELECT m FROM MealType m
            WHERE m.owner IS NULL AND LOWER(m.name) LIKE LOWER(CONCAT('%', :q, '%'))
            ORDER BY m.defaultSortOrder ASC
            """)
    List<MealType> searchSystemByNameContaining(@Param("q") String q);

    @Query("""
            SELECT m FROM MealType m
            WHERE m.owner.userId = :userId AND LOWER(m.name) LIKE LOWER(CONCAT('%', :q, '%'))
            ORDER BY m.name ASC
            """)
    List<MealType> searchByOwnerAndNameContaining(@Param("userId") long userId, @Param("q") String q);
}