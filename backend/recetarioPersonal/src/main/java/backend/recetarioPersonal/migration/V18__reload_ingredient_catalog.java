package backend.recetarioPersonal.migration;

import backend.recetarioPersonal.service.util.IngredientNameNormalizer;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

import java.io.InputStream;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.HashMap;
import java.util.HashSet;

/**
 * Replaces the ingredient catalog (global rows and categories) from {@code catalog/ingredients.json}.
 * <p>Clears user links that reference ingredients (shopping list, recipe lines, recents) so FK constraints
 * are satisfied. User accounts, recipes (headers), calendar and media rows are kept.</p>
 */
public class V18__reload_ingredient_catalog extends BaseJavaMigration {

    private static final String CATALOG_RESOURCE = "/catalog/ingredients.json";
    private static final String PROPIOS_CATEGORY = "Propios";
    private static final int INSERT_BATCH_SIZE = 200;

    private static final ObjectMapper JSON = new ObjectMapper();

    @Override
    public void migrate(Context context) throws Exception {
        Connection connection = context.getConnection();
        clearIngredientReferences(connection);
        clearIngredientsAndCategories(connection);

        List<CatalogEntry> entries = loadCatalog();
        Map<String, Long> categoryIds = insertCategories(connection, entries);
        insertCatalogIngredients(connection, entries, categoryIds);
    }

    private static void clearIngredientReferences(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.executeUpdate("DELETE FROM recent_ingredients");
            statement.executeUpdate("DELETE FROM shopping_list_items");
            statement.executeUpdate("DELETE FROM recipe_ingredients");
        }
    }

    private static void clearIngredientsAndCategories(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.executeUpdate("DELETE FROM ingredients");
            statement.executeUpdate("DELETE FROM ingredient_categories");
        }
    }

    private static List<CatalogEntry> loadCatalog() throws Exception {
        try (InputStream input = V18__reload_ingredient_catalog.class.getResourceAsStream(CATALOG_RESOURCE)) {
            if (input == null) {
                throw new IllegalStateException("Catalog resource not found: " + CATALOG_RESOURCE);
            }
            List<CatalogEntry> entries = JSON.readValue(input, new TypeReference<>() {});
            if (entries == null || entries.isEmpty()) {
                throw new IllegalStateException("Catalog is empty: " + CATALOG_RESOURCE);
            }
            return entries;
        }
    }

    private static Map<String, Long> insertCategories(Connection connection, List<CatalogEntry> entries)
            throws SQLException {
        LinkedHashSet<String> names = new LinkedHashSet<>();
        for (CatalogEntry entry : entries) {
            String category = trimToNull(entry.category());
            if (category != null) {
                names.add(category);
            }
        }
        names.add(PROPIOS_CATEGORY);

        String insertSql = "INSERT INTO ingredient_categories (name) VALUES (?) ON CONFLICT (name) DO NOTHING";
        String selectSql = "SELECT category_id FROM ingredient_categories WHERE name = ?";

        try (PreparedStatement insert = connection.prepareStatement(insertSql);
             PreparedStatement select = connection.prepareStatement(selectSql)) {
            for (String name : names) {
                insert.setString(1, name);
                insert.executeUpdate();
            }
        }

        Map<String, Long> ids = new HashMap<>();
        try (PreparedStatement select = connection.prepareStatement(selectSql)) {
            for (String name : names) {
                select.setString(1, name);
                try (ResultSet rs = select.executeQuery()) {
                    if (rs.next()) {
                        ids.put(name, rs.getLong("category_id"));
                    } else {
                        throw new IllegalStateException("Category not found after insert: " + name);
                    }
                }
            }
        }
        return ids;
    }

    private static void insertCatalogIngredients(
            Connection connection,
            List<CatalogEntry> entries,
            Map<String, Long> categoryIds
    ) throws SQLException {
        String sql = """
                INSERT INTO ingredients (name, normalized_name, category_id, owner_user_id)
                VALUES (?, ?, ?, NULL)
                """;
        Set<String> seenNormalized = new HashSet<>();
        int inserted = 0;

        try (PreparedStatement insert = connection.prepareStatement(sql)) {
            int batchCount = 0;
            for (CatalogEntry entry : entries) {
                String name = trimToNull(entry.name());
                String categoryName = trimToNull(entry.category());
                if (name == null || categoryName == null) {
                    continue;
                }

                String normalized = IngredientNameNormalizer.normalize(name);
                if (normalized.isEmpty() || !seenNormalized.add(normalized)) {
                    continue;
                }

                Long categoryId = categoryIds.get(categoryName);
                if (categoryId == null) {
                    throw new IllegalStateException("Unknown category in catalog JSON: " + categoryName);
                }

                insert.setString(1, name);
                insert.setString(2, normalized);
                insert.setLong(3, categoryId);
                insert.addBatch();
                batchCount++;
                inserted++;

                if (batchCount >= INSERT_BATCH_SIZE) {
                    insert.executeBatch();
                    batchCount = 0;
                }
            }
            if (batchCount > 0) {
                insert.executeBatch();
            }
        }

        if (inserted == 0) {
            throw new IllegalStateException("No catalog ingredients were inserted");
        }
        // Skipped duplicates/blank rows are expected for large catalogs; no need to fail migration.
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private record CatalogEntry(String category, String name) {
    }
}
