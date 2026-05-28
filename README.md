# Recetario personal

Gestión de recetas, calendario de comidas y lista de la compra.

## Despliegue (Docker) — forma recomendada

Toda la aplicación (PostgreSQL + API + frontend) se levanta con un solo comando.

1. Instala [Docker Desktop](https://www.docker.com/products/docker-desktop/) (o Docker Engine + Compose en la VM).
2. En la raíz del repositorio:

   ```powershell
   copy .env.example .env
   ```

3. Edita `.env`: contraseñas y `APP_JWT_SECRET` (mínimo 32 caracteres). En la VM, añade tu IP fija en `APP_CORS_ALLOWED_ORIGIN_PATTERNS`.
4. Arranca:

   ```powershell
   docker compose up -d --build
   ```

5. Abre **http://localhost** (o `http://IP_DE_TU_VM`).

Detalles, reset de base de datos, JWT y volúmenes: **[DOCKER.md](DOCKER.md)**.

### Archivos que debes crear tú (Docker)

| Archivo | Acción |
|---------|--------|
| `.env` | Copiar desde `.env.example` y personalizar secretos |
| Nada más | No hace falta `application-local.properties` ni Postgres instalado en el host |

## Desarrollo en el IDE (opcional)

Solo si quieres depurar backend/front **sin** Docker:

- Postgres instalado en el PC + base `recetario_db`
- Copiar `backend/recetarioPersonal/src/main/resources/application-local.properties.example` → `application-local.properties` y poner la contraseña
- Backend: perfil `local` (por defecto)
- Front: `npm run dev` en `frontend/` (puerto 5173)

No mezcles este modo con Docker a la vez en los mismos puertos.

## Estructura

- `backend/recetarioPersonal` — Spring Boot, Flyway, JWT
- `frontend` — React
- `docker-compose.yml` — orquestación
