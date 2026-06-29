package backend.recetarioPersonal.repository;

import backend.recetarioPersonal.model.UnitOfMeasure;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UnitOfMeasureRepository extends JpaRepository<UnitOfMeasure, Long> {

    Optional<UnitOfMeasure> findByUnitIdAndOwner_UserId(long unitId, long ownerUserId);

    @Query("""
        SELECT u FROM UnitOfMeasure u
        WHERE u.owner IS NULL OR u.owner.userId = :userId
        ORDER BY u.name ASC
        """)
    List<UnitOfMeasure> findAllVisibleToUser(@Param("userId") long userId);

    @Query("""
        SELECT u FROM UnitOfMeasure u
        WHERE u.owner IS NOT NULL AND u.owner.userId = :userId
        ORDER BY u.name ASC
        """)
    List<UnitOfMeasure> findOwnedByUserOrderByName(@Param("userId") long userId);

    @Query("""
        SELECT u FROM UnitOfMeasure u
        WHERE (u.owner IS NULL OR u.owner.userId = :userId)
          AND (
            lower(u.name) = lower(:token)
            OR (u.symbol IS NOT NULL AND lower(u.symbol) = lower(:token))
          )
        """)
    Optional<UnitOfMeasure> findVisibleToUserByNameOrSymbol(@Param("token") String token, @Param("userId") long userId);

    @Query("""
        SELECT u FROM UnitOfMeasure u
        WHERE u.owner IS NULL AND lower(u.name) = lower(:name)
        """)
    Optional<UnitOfMeasure> findCatalogByNameIgnoreCase(@Param("name") String name);

    @Query("""
        SELECT u FROM UnitOfMeasure u
        WHERE u.owner.userId = :userId AND lower(u.name) = lower(:name)
        """)
    Optional<UnitOfMeasure> findOwnedByUserAndNameIgnoreCase(
            @Param("userId") long userId,
            @Param("name") String name);

    @Query("""
        SELECT u FROM UnitOfMeasure u
        WHERE u.owner IS NULL
          AND u.symbol IS NOT NULL
          AND lower(u.symbol) = lower(:symbol)
        """)
    Optional<UnitOfMeasure> findCatalogBySymbolIgnoreCase(@Param("symbol") String symbol);

    @Query("""
        SELECT u FROM UnitOfMeasure u
        WHERE u.owner.userId = :userId
          AND u.symbol IS NOT NULL
          AND lower(u.symbol) = lower(:symbol)
        """)
    Optional<UnitOfMeasure> findOwnedByUserAndSymbolIgnoreCase(
            @Param("userId") long userId,
            @Param("symbol") String symbol);
}
