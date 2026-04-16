-- Initial global catalog.
-- owner_user_id = NULL => shared baseline visible to all users.

-- Categories
INSERT INTO ingredient_categories (name) VALUES ('Vegetales y Frutas') ON CONFLICT (name) DO NOTHING;
INSERT INTO ingredient_categories (name) VALUES ('Carnicería, Charcuteria y Pescados') ON CONFLICT (name) DO NOTHING;
INSERT INTO ingredient_categories (name) VALUES ('Granos y Pastas') ON CONFLICT (name) DO NOTHING;
INSERT INTO ingredient_categories (name) VALUES ('Saborizantes y Salsas') ON CONFLICT (name) DO NOTHING;
INSERT INTO ingredient_categories (name) VALUES ('Repostería y Desayunos') ON CONFLICT (name) DO NOTHING;
INSERT INTO ingredient_categories (name) VALUES ('Congelados y Conservas') ON CONFLICT (name) DO NOTHING;
INSERT INTO ingredient_categories (name) VALUES ('Bebidas') ON CONFLICT (name) DO NOTHING;
INSERT INTO ingredient_categories (name) VALUES ('Propios') ON CONFLICT (name) DO NOTHING;

-- Units (minimal/common set)
INSERT INTO units_of_measure (name, symbol) VALUES ('Gramo', 'g') ON CONFLICT (name) DO NOTHING;
INSERT INTO units_of_measure (name, symbol) VALUES ('Kilogramo', 'kg') ON CONFLICT (name) DO NOTHING;
INSERT INTO units_of_measure (name, symbol) VALUES ('Mililitro', 'ml') ON CONFLICT (name) DO NOTHING;
INSERT INTO units_of_measure (name, symbol) VALUES ('Litro', 'l') ON CONFLICT (name) DO NOTHING;
INSERT INTO units_of_measure (name, symbol) VALUES ('Unidad', 'ud') ON CONFLICT (name) DO NOTHING;

-- Ingredients: Vegetales y Frutas
INSERT INTO ingredients (name, category_id, owner_user_id)
SELECT 'Tomate', c.category_id, NULL FROM ingredient_categories c WHERE c.name = 'Vegetales y Frutas'
AND NOT EXISTS (SELECT 1 FROM ingredients i WHERE lower(i.name)=lower('Tomate') AND i.owner_user_id IS NULL);
INSERT INTO ingredients (name, category_id, owner_user_id)
SELECT 'Cebolla', c.category_id, NULL FROM ingredient_categories c WHERE c.name = 'Vegetales y Frutas'
AND NOT EXISTS (SELECT 1 FROM ingredients i WHERE lower(i.name)=lower('Cebolla') AND i.owner_user_id IS NULL);
INSERT INTO ingredients (name, category_id, owner_user_id)
SELECT 'Manzana', c.category_id, NULL FROM ingredient_categories c WHERE c.name = 'Vegetales y Frutas'
AND NOT EXISTS (SELECT 1 FROM ingredients i WHERE lower(i.name)=lower('Manzana') AND i.owner_user_id IS NULL);

-- Carnicería, Charcuteria y Pescados
INSERT INTO ingredients (name, category_id, owner_user_id)
SELECT 'Pechuga de pollo', c.category_id, NULL FROM ingredient_categories c WHERE c.name = 'Carnicería, Charcuteria y Pescados'
AND NOT EXISTS (SELECT 1 FROM ingredients i WHERE lower(i.name)=lower('Pechuga de pollo') AND i.owner_user_id IS NULL);
INSERT INTO ingredients (name, category_id, owner_user_id)
SELECT 'Carne picada', c.category_id, NULL FROM ingredient_categories c WHERE c.name = 'Carnicería, Charcuteria y Pescados'
AND NOT EXISTS (SELECT 1 FROM ingredients i WHERE lower(i.name)=lower('Carne picada') AND i.owner_user_id IS NULL);
INSERT INTO ingredients (name, category_id, owner_user_id)
SELECT 'Atún', c.category_id, NULL FROM ingredient_categories c WHERE c.name = 'Carnicería, Charcuteria y Pescados'
AND NOT EXISTS (SELECT 1 FROM ingredients i WHERE lower(i.name)=lower('Atún') AND i.owner_user_id IS NULL);

-- Granos y Pastas
INSERT INTO ingredients (name, category_id, owner_user_id)
SELECT 'Arroz', c.category_id, NULL FROM ingredient_categories c WHERE c.name = 'Granos y Pastas'
AND NOT EXISTS (SELECT 1 FROM ingredients i WHERE lower(i.name)=lower('Arroz') AND i.owner_user_id IS NULL);
INSERT INTO ingredients (name, category_id, owner_user_id)
SELECT 'Pasta', c.category_id, NULL FROM ingredient_categories c WHERE c.name = 'Granos y Pastas'
AND NOT EXISTS (SELECT 1 FROM ingredients i WHERE lower(i.name)=lower('Pasta') AND i.owner_user_id IS NULL);
INSERT INTO ingredients (name, category_id, owner_user_id)
SELECT 'Lentejas', c.category_id, NULL FROM ingredient_categories c WHERE c.name = 'Granos y Pastas'
AND NOT EXISTS (SELECT 1 FROM ingredients i WHERE lower(i.name)=lower('Lentejas') AND i.owner_user_id IS NULL);

-- Saborizantes y Salsas
INSERT INTO ingredients (name, category_id, owner_user_id)
SELECT 'Sal', c.category_id, NULL FROM ingredient_categories c WHERE c.name = 'Saborizantes y Salsas'
AND NOT EXISTS (SELECT 1 FROM ingredients i WHERE lower(i.name)=lower('Sal') AND i.owner_user_id IS NULL);
INSERT INTO ingredients (name, category_id, owner_user_id)
SELECT 'Pimienta negra', c.category_id, NULL FROM ingredient_categories c WHERE c.name = 'Saborizantes y Salsas'
AND NOT EXISTS (SELECT 1 FROM ingredients i WHERE lower(i.name)=lower('Pimienta negra') AND i.owner_user_id IS NULL);
INSERT INTO ingredients (name, category_id, owner_user_id)
SELECT 'Aceite de oliva', c.category_id, NULL FROM ingredient_categories c WHERE c.name = 'Saborizantes y Salsas'
AND NOT EXISTS (SELECT 1 FROM ingredients i WHERE lower(i.name)=lower('Aceite de oliva') AND i.owner_user_id IS NULL);

-- Repostería y Desayunos
INSERT INTO ingredients (name, category_id, owner_user_id)
SELECT 'Harina de trigo', c.category_id, NULL FROM ingredient_categories c WHERE c.name = 'Repostería y Desayunos'
AND NOT EXISTS (SELECT 1 FROM ingredients i WHERE lower(i.name)=lower('Harina de trigo') AND i.owner_user_id IS NULL);
INSERT INTO ingredients (name, category_id, owner_user_id)
SELECT 'Azúcar', c.category_id, NULL FROM ingredient_categories c WHERE c.name = 'Repostería y Desayunos'
AND NOT EXISTS (SELECT 1 FROM ingredients i WHERE lower(i.name)=lower('Azúcar') AND i.owner_user_id IS NULL);
INSERT INTO ingredients (name, category_id, owner_user_id)
SELECT 'Avena', c.category_id, NULL FROM ingredient_categories c WHERE c.name = 'Repostería y Desayunos'
AND NOT EXISTS (SELECT 1 FROM ingredients i WHERE lower(i.name)=lower('Avena') AND i.owner_user_id IS NULL);

-- Congelados y Conservas
INSERT INTO ingredients (name, category_id, owner_user_id)
SELECT 'Guisantes congelados', c.category_id, NULL FROM ingredient_categories c WHERE c.name = 'Congelados y Conservas'
AND NOT EXISTS (SELECT 1 FROM ingredients i WHERE lower(i.name)=lower('Guisantes congelados') AND i.owner_user_id IS NULL);
INSERT INTO ingredients (name, category_id, owner_user_id)
SELECT 'Maíz en conserva', c.category_id, NULL FROM ingredient_categories c WHERE c.name = 'Congelados y Conservas'
AND NOT EXISTS (SELECT 1 FROM ingredients i WHERE lower(i.name)=lower('Maíz en conserva') AND i.owner_user_id IS NULL);

-- Bebidas
INSERT INTO ingredients (name, category_id, owner_user_id)
SELECT 'Agua', c.category_id, NULL FROM ingredient_categories c WHERE c.name = 'Bebidas'
AND NOT EXISTS (SELECT 1 FROM ingredients i WHERE lower(i.name)=lower('Agua') AND i.owner_user_id IS NULL);
INSERT INTO ingredients (name, category_id, owner_user_id)
SELECT 'Leche', c.category_id, NULL FROM ingredient_categories c WHERE c.name = 'Bebidas'
AND NOT EXISTS (SELECT 1 FROM ingredients i WHERE lower(i.name)=lower('Leche') AND i.owner_user_id IS NULL);
INSERT INTO ingredients (name, category_id, owner_user_id)
SELECT 'Café molido', c.category_id, NULL FROM ingredient_categories c WHERE c.name = 'Bebidas'
AND NOT EXISTS (SELECT 1 FROM ingredients i WHERE lower(i.name)=lower('Café molido') AND i.owner_user_id IS NULL);
