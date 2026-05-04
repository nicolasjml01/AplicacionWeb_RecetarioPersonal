-- Add publication_state column to recipes table.

ALTER TABLE recipes
    ADD COLUMN publication_state VARCHAR(20) NOT NULL DEFAULT 'PUBLISHED';
