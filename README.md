# Recetario Personal

Aplicación web para organizar recetas, planificar comidas y gestionar la lista de la compra. Cada usuario tiene su propio espacio privado con catálogo de ingredientes, medios y preferencias personalizadas.

---

## Qué puedes hacer

### Recetario

- Organizar recetas en **categorías** propias (crear, renombrar, eliminar).
- **Crear y editar** recetas con título, ingredientes, pasos y fotos o vídeos.
- Guardar **borradores** y publicar cuando estén listas.
- **Buscar** por nombre de receta o categoría desde la pantalla principal.
- **Importar** una receta pegando la URL de un blog de cocina (extrae datos vía Schema.org).
- Ver el **detalle** con carrusel de imágenes, ingredientes colapsables y pasos con medios.

### Editor de recetas

- Añadir ingredientes desde un **catálogo** con imágenes o crear los tuyos.
- Asignar cantidades y unidades de medida.
- Subir y **reordenar** fotos y vídeos a nivel de receta o de cada paso.
- **Recortar y ajustar** imágenes antes de guardarlas.
- Etiquetar recetas y asignarlas a varias categorías.

### Calendario de comidas

- Vistas de **día, semana y mes**.
- Planificar qué recetas cocinar en cada fecha.
- Bloques de comida configurables (desayuno, comida, cena y tipos personalizados).
- Reordenar entradas y comidas del día.
- **Enviar ingredientes** de un día o de una receta concreta a la lista de la compra.

### Lista de la compra

- Añadir productos buscando en el catálogo o escribiendo uno nuevo.
- Agrupar por **categoría** de ingrediente (verdura, lácteos, etc.).
- Marcar artículos como comprados.
- Editar cantidades y unidades sobre la marcha.

### Cuenta

- Gestionar **ingredientes propios** (nombre, categoría, imagen).
- Definir **tipos de comida** para el calendario.
- Crear **unidades de medida** personalizadas.
- Cerrar sesión de forma segura.

---

## Estructura del proyecto

```
├── frontend/                 React + TypeScript (Vite)
├── backend/recetarioPersonal/  API REST con Spring Boot (Java 21)
└── docker-compose.yml        Orquestación de servicios
```

| Capa        | Tecnologías principales                          |
|-------------|--------------------------------------------------|
| Frontend    | React 19, React Router, Bootstrap 5, TypeScript  |
| Backend     | Spring Boot 4, Spring Security, JWT, Flyway      |
| Base de datos | PostgreSQL 16                                |

---

## Pantallas

| Ruta | Descripción |
|------|-------------|
| `/login`, `/register` | Acceso y registro |
| `/home` | Categorías, búsqueda e importación por URL |
| `/home/recipes/new` | Editor de receta (nueva, borrador o importada) |
| `/home/recipes/:id` | Detalle de receta |
| `/home/drafts` | Borradores pendientes |
| `/calendar` | Planificación de comidas |
| `/shopping` | Lista de la compra |
| `/account` | Ajustes personales |

---

*Proyecto de recetario personal — gestión integral de cocina en casa.*
