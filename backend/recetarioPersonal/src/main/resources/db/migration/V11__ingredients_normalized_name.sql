-- New column with the "key" version of the ingredient name.
-- Lowercased, no accents, singular. Used to detect that "Patata" and
-- "Patatas" are the same ingredient. The user never sees this value.
ALTER TABLE ingredients
    ADD COLUMN normalized_name VARCHAR(255);

-- Index that makes exact lookups by normalized_name very fast.
-- Used every time we resolve an ingredient name (e.g. adding to a recipe).
CREATE INDEX idx_ingredients_normalized_name
    ON ingredients (normalized_name);

-- Enables the trigram index right below. Comes preinstalled with PostgreSQL.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Index that makes partial searches fast (LIKE '%cuscu%').
-- Used by the autocomplete in the ingredient picker.
CREATE INDEX idx_ingredients_normalized_name_trgm
    ON ingredients USING gin (normalized_name gin_trgm_ops);