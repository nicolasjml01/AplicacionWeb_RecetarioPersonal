# Cronograma – Recetario personal y planificación de menús

Documento para organizar el trabajo: **lista compacta** para el cronograma visual y **lista desarrollada** para entender cada tarea y presentarla a la tutora.

---

## 1. Lista compacta (para el cronograma)

Copia esta tabla o las filas en tu hoja de cálculo. Puedes usar la columna "Hito" como agrupación y "Tarea" como fila a marcar.

| Hito | Tarea |
|------|--------|
| **Hito 0** | Infraestructura: H2, JPA, entidad Usuario, repositorio, Auth con BD y BCrypt |
| **Hito 0** | Probar login/registro en Postman y persistencia en H2 |
| **Hito 1** | Entidades JPA: Receta, PasoReceta, Categoria, TipoComida, Ingrediente, relaciones |
| **Hito 1** | Repositorios y DTOs de recetas |
| **Hito 1** | RecetaService y RecetaController (CRUD) |
| **Hito 1** | Probar endpoints recetas en Postman |
| **Hito 2** | Entidades Multimedia y NotasReceta; DTOs y endpoints |
| **Hito 2** | Probar notas y multimedia en Postman |
| **Hito 3** | Estado/visibilidad receta (borrador–publicada); filtrar y endpoints publicar |
| **Hito 4** | Servicio importación desde URL; integrar con RecetaService; POST /api/recetas/import |
| **Hito 5** | Entidad Calendario, repositorio, DTOs, CalendarioService y Controller |
| **Hito 5** | Probar planificación semanal en Postman |
| **Hito 6** | Entidad ListaCompra, servicio y controller; opción “generar desde calendario” |
| **Hito 6** | Probar lista de la compra en Postman |
| **Hito 7** | Autenticación en API (JWT/sesión); filtrar datos por usuario; 401/403 |
| **Hito 8** | Frontend: proyecto, login/registro, recetas, calendario, lista compra |
| **Hito 9** | Tests unitarios e integración; perfiles; OpenAPI/Swagger; README y despliegue |

**Versión ultra-compacta (solo nombres de hitos para agrupar):**

- **Hito 0** – Fundamentos e infraestructura  
- **Hito 1** – CRUD Recetas (núcleo)  
- **Hito 2** – Ampliación Receta (notas, multimedia)  
- **Hito 3** – Publicación / visibilidad  
- **Hito 4** – Importación desde enlaces  
- **Hito 5** – Calendario y planificación de menús  
- **Hito 6** – Lista de la compra  
- **Hito 7** – Seguridad y autorización  
- **Hito 8** – Frontend  
- **Hito 9** – Calidad y despliegue  

---

## 2. Lista desarrollada (para entender y mostrar a la tutora)

Cada hito con objetivo, tareas concretas y criterios de “hecho”. Sirve para organizarse y para que la tutora vea cómo estás planificando el proyecto.

---

### Hito 0 – Fundamentos e infraestructura

**Objetivo:** Tener la base de datos conectada, el usuario persistido y el login/registro funcionando contra H2 en lugar de memoria.

**Tareas:**
- Configurar H2 y JPA en `application.properties` (URL, usuario, contraseña, dialecto, `ddl-auto`).
- Crear la entidad JPA `Usuario` en `model/` mapeada a la tabla del diseño (id_usuario, nombre, apellidos, correo_electronico, contrasena, verificado).
- Decidir criterio de login (por correo según diseño, o por username si se añade campo) y dejarlo documentado.
- Crear `UsuarioRepository` en `repository/` (`JpaRepository<Usuario, Long>`).
- Migrar `AuthService` para usar el repositorio (buscar usuario por email/username y comprobar contraseña).
- Añadir hash de contraseñas (BCrypt) en registro y en login.
- Probar login y registro con Postman y comprobar que los datos se guardan en H2.

**Hecho cuando:** Login y registro responden correctamente y los usuarios se persisten en la base de datos.

---

### Hito 1 – CRUD Recetas (núcleo)

**Objetivo:** Poder crear, ver, editar y eliminar recetas con sus pasos e ingredientes, asociadas al usuario.

**Tareas:**
- Crear entidades JPA: `Receta`, `PasoReceta`, `Categoria`, `TipoComida`, `CategoriaIngrediente`, `Ingrediente`, y las relaciones (Receta–Categoría, Receta–Ingrediente con cantidad).
- Crear repositorios para cada entidad (RecetaRepository, PasoRecetaRepository, CategoriaRepository, IngredienteRepository, etc.).
- Definir DTOs en `view/`: RecetaDto, RecetaCreateRequest, RecetaUpdateRequest, PasoRecetaDto, IngredienteEnRecetaDto.
- Implementar `RecetaService`: crear, obtener por id, listar por usuario, actualizar, eliminar; gestionar pasos e ingredientes.
- Crear `RecetaController` con POST/GET/PUT/DELETE bajo `/api/recetas`, asociando siempre las recetas al usuario autenticado.
- Probar todos los endpoints de recetas con Postman.

**Hecho cuando:** Se pueden crear, listar, ver, modificar y borrar recetas con pasos e ingredientes desde la API.

---

### Hito 2 – Ampliación del modelo de Receta

**Objetivo:** Añadir notas y multimedia (URL/tipo) a las recetas o a los pasos.

**Tareas:**
- Crear entidades y repositorios para `Multimedia` y `NotasReceta` según el diseño de BD.
- Incluir en DTOs y servicios: alta/baja de notas por receta; asociación de multimedia a receta o paso.
- Ampliar endpoints de recetas (o añadir subrecursos) para notas y multimedia.
- Probar en Postman.

**Hecho cuando:** Se pueden añadir y consultar notas y enlaces multimedia por receta/paso.

---

### Hito 3 – Publicación / visibilidad (opcional)

**Objetivo:** Diferenciar recetas en borrador y publicadas (o privadas/compartidas) y filtrar en listados.

**Tareas:**
- Definir modelo: estado (borrador/publicada) o visibilidad (privada/compartida) y añadir campo(s) en la entidad Receta.
- Actualizar RecetaService y DTOs para filtrar por estado/visibilidad en listados y detalle.
- Endpoints para “publicar”/“despublicar” (o cambiar visibilidad).
- Probar en Postman.

**Hecho cuando:** Las recetas tienen estado/visibilidad y la API permite filtrar y cambiar ese estado.

---

### Hito 4 – Importación de recetas desde enlaces

**Objetivo:** Dada una URL, extraer título, ingredientes y pasos e crear una receta en el sistema.

**Tareas:**
- Definir alcance: qué sitios soportar y formato de salida (título, ingredientes, pasos).
- Implementar servicio de extracción (p. ej. `RecetaImportService`) que, dada una URL, devuelva datos estructurados.
- Integrar con RecetaService: “crear receta desde URL” (crear Receta + pasos + ingredientes).
- Endpoint `POST /api/recetas/import` con body `{ "url": "..." }` y manejo de errores (URL no soportada, fallo de red).
- Probar con varias URLs en Postman.

**Hecho cuando:** Se puede enviar una URL y obtener una receta creada con ingredientes y pasos extraídos.

---

### Hito 5 – Calendario y planificación de menús

**Objetivo:** Asignar recetas a días y tipos de comida (desayuno, comida, cena, etc.) y consultar la planificación por rango de fechas.

**Tareas:**
- Entidad JPA `Calendario` (id_calendario, id_usuario, id_receta, id_tipo_comida, fecha) y asegurar entidad TipoComida.
- CalendarioRepository con métodos por usuario y rango de fechas (p. ej. findByUsuarioIdAndFechaBetween).
- DTOs: EntradaCalendarioDto, CalendarioSemanaDto (o similar).
- CalendarioService: asignar receta a día y tipo de comida; listar por semana; desasignar; validar que la receta sea del usuario.
- CalendarioController: GET /api/calendario?desde=&hasta=, POST/PUT/DELETE para asignaciones.
- Probar planificación semanal en Postman.

**Hecho cuando:** Se puede consultar y modificar la planificación de menús por fechas y tipo de comida.

---

### Hito 6 – Lista de la compra

**Objetivo:** Gestionar una lista de ingredientes (cantidad, unidad, comprado) y opcionalmente generarla desde el calendario.

**Tareas:**
- Entidad JPA `ListaCompra` (id_listas, id_usuario, id_ingrediente, comprado, cantidad, unidad_medida) y repositorio.
- DTOs para ítems de lista y para peticiones de creación/actualización.
- ListaCompraService: añadir/actualizar/eliminar ítems; marcar comprado; opcionalmente “generar desde calendario” (ingredientes de recetas planificadas en un rango).
- ListaCompraController: GET/POST/PUT/DELETE bajo /api/lista-compra; opcional: endpoint “generar desde calendario” con fechas.
- Probar en Postman: generar lista desde calendario y marcar ítems.

**Hecho cuando:** La lista de la compra se puede gestionar y, si se implementa, generar a partir del calendario.

---

### Hito 7 – Seguridad y autorización

**Objetivo:** Que todas las operaciones estén ligadas al usuario autenticado y que no se vean datos de otros usuarios.

**Tareas:**
- Integrar autenticación en la API (JWT, sesión o API key): identificar usuario en cada petición.
- Asegurar que Receta, Calendario y Lista_Compra solo exponen datos del usuario autenticado (filtrar por id_usuario).
- Respuestas claras 401/403 cuando no hay autenticación o no hay permiso.
- Revisar validaciones en DTOs y permisos; probar con Postman.

**Hecho cuando:** No se puede acceder a recetas, calendario o lista de otro usuario sin estar autenticado o con otro usuario.

---

### Hito 8 – Frontend

**Objetivo:** Interfaz web (p. ej. React) que consuma el backend y permita usar las funcionalidades principales.

**Tareas:**
- Inicializar proyecto frontend y configurar la URL base del backend.
- Pantallas: login/registro; listado y detalle de recetas; formulario alta/edición receta.
- Vista de calendario semanal y asignación de recetas a días/tipos de comida.
- Vista de lista de la compra (ver, marcar comprado, añadir ítem manual).
- Opcional: pantalla de importación por URL y mensajes de error/éxito.

**Hecho cuando:** Un usuario puede hacer las operaciones principales desde el navegador.

---

### Hito 9 – Calidad y despliegue

**Objetivo:** Tests automatizados, configuración por entornos y documentación para ejecutar y desplegar el proyecto.

**Tareas:**
- Tests unitarios de servicios (AuthService, RecetaService, CalendarioService, ListaCompraService).
- Tests de integración de controladores (MockMvc o RestAssured) para login, CRUD recetas, calendario, lista.
- Configuración de perfiles (dev/prod), variables de entorno para BD y secretos.
- Documentación de la API (OpenAPI/Swagger) y README con instrucciones para ejecutar backend y frontend.
- Preparar despliegue: jar ejecutable, opcional Docker, instrucciones para un hosting sencillo.

**Hecho cuando:** Hay tests que pasan, la API está documentada y se puede desplegar siguiendo el README.

---

## 3. Orden sugerido y dependencias

- **Hito 0** debe estar hecho antes que el resto (base de datos y auth).
- **Hito 1** es la base de recetas; los hitos 2, 3 y 4 amplían recetas y pueden hacerse después de 1 (entre ellos se pueden reordenar).
- **Hito 5** (calendario) usa recetas, así que después de Hito 1.
- **Hito 6** (lista de la compra) puede usar el calendario para “generar desde calendario”, así que después de Hito 5.
- **Hito 7** (seguridad) se puede ir introduciendo cuando haya varios endpoints; conviene tenerlo antes del frontend.
- **Hito 8** (frontend) una vez el backend esté estable y autenticado.
- **Hito 9** (calidad y despliegue) al final, o en paralelo (tests desde que haya servicios/controllers).

Con esta lista compacta rellenas el cronograma visual y con la desarrollada explicas a tu tutora cómo te organizas y qué implica cada hito.
