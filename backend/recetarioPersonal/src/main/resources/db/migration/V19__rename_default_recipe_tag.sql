UPDATE recipe_categories
SET name = 'Sin etiqueta'
WHERE LOWER(TRIM(name)) = 'sin categoría';
