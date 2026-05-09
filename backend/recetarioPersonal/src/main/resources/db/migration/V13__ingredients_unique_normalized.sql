-- Make normalized_name not nullable
ALTER TABLE ingredients
    ALTER COLUMN normalized_name SET NOT NULL;

-- Drop old uniqueness rules that compared LOWER(name)
DROP INDEX IF EXISTS uk_ingredients_catalog_name_lower;
DROP INDEX IF EXISTS uk_ingredients_user_name_lower;

-- Create new uniqueness rules that compare normalized_name
CREATE UNIQUE INDEX uk_ingredients_catalog_normalized
    ON ingredients (normalized_name)
    WHERE owner_user_id IS NULL;

-- Create new uniqueness rule for user-owned ingredients
CREATE UNIQUE INDEX uk_ingredients_user_normalized
    ON ingredients (owner_user_id, normalized_name)
    WHERE owner_user_id IS NOT NULL;