package backend.recetarioPersonal.migration;

import backend.recetarioPersonal.service.util.IngredientNameNormalizer;
import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

/**
 * Fills {@code normalized_name} for ingredient rows that existed before V11.
 * Only touches rows where the column is NULL, so it's safe to retry.
 */
public class V12__backfill_normalized_name extends BaseJavaMigration {

    @Override
    public void migrate(Context context) throws Exception {
        Connection connection = context.getConnection();
        try (PreparedStatement select = connection.prepareStatement(
                "SELECT ingredient_id, name FROM ingredients WHERE normalized_name IS NULL");
             PreparedStatement update = connection.prepareStatement(
                     "UPDATE ingredients SET normalized_name = ? WHERE ingredient_id = ?")) {

            int batched = 0;
            try (ResultSet rs = select.executeQuery()) {
                while (rs.next()) {
                    long id = rs.getLong("ingredient_id");
                    String name = rs.getString("name");
                    update.setString(1, IngredientNameNormalizer.normalize(name));
                    update.setLong(2, id);
                    update.addBatch();
                    batched++;
                }
            }
            if (batched > 0) {
                update.executeBatch();
            }
        }
    }
}
