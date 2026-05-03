ALTER TABLE recipe_media ADD COLUMN display_order INTEGER NOT NULL DEFAULT 0;

UPDATE recipe_media rm
SET display_order = sub.ord
FROM (
    SELECT media_id,
           (ROW_NUMBER() OVER (PARTITION BY recipe_id, recipe_step_id ORDER BY media_id) - 1) AS ord
    FROM recipe_media
) sub
WHERE rm.media_id = sub.media_id;

CREATE UNIQUE INDEX uk_recipe_media_global_display_order
    ON recipe_media (recipe_id, display_order)
    WHERE recipe_step_id IS NULL;

CREATE UNIQUE INDEX uk_recipe_media_step_display_order
    ON recipe_media (recipe_step_id, display_order)
    WHERE recipe_step_id IS NOT NULL;