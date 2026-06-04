-- Per-user units (owner_user_id set) alongside global catalog rows (owner_user_id NULL).

ALTER TABLE units_of_measure
    ADD COLUMN owner_user_id BIGINT;

ALTER TABLE units_of_measure
    ADD CONSTRAINT fk_units_of_measure_owner_user
        FOREIGN KEY (owner_user_id) REFERENCES users (user_id);

ALTER TABLE units_of_measure
    DROP CONSTRAINT uk_units_of_measure_name;

CREATE UNIQUE INDEX uk_units_catalog_name_lower
    ON units_of_measure (lower(name))
    WHERE owner_user_id IS NULL;

CREATE UNIQUE INDEX uk_units_user_name_lower
    ON units_of_measure (owner_user_id, lower(name))
    WHERE owner_user_id IS NOT NULL;

CREATE UNIQUE INDEX uk_units_catalog_symbol_lower
    ON units_of_measure (lower(symbol))
    WHERE owner_user_id IS NULL AND symbol IS NOT NULL;

CREATE UNIQUE INDEX uk_units_user_symbol_lower
    ON units_of_measure (owner_user_id, lower(symbol))
    WHERE owner_user_id IS NOT NULL AND symbol IS NOT NULL;
