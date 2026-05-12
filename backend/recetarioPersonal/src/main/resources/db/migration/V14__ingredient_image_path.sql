ALTER TABLE ingredients
    ADD COLUMN IF NOT EXISTS image_relative_path VARCHAR(512) NULL;