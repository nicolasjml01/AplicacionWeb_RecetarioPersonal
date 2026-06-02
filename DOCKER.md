# Despliegue con Docker

Para preparar una **VM Alpine Linux** desde cero (paquetes, usuario, firewall, clonado y `.env`), ver [DESPLIEGUE-ALPINE-VM.md](DESPLIEGUE-ALPINE-VM.md).

Stack: **PostgreSQL 16** + **Spring Boot (Java 21)** + **React (Vite 7) + nginx 1.27**.

Solo se expone el puerto **80** (frontend). nginx sirve la SPA y hace proxy de `/api` y `/media` al backend.

## Requisitos

- Docker Engine 24+ y Docker Compose v2 (`docker compose`)

| Componente | Imagen |
|------------|--------|
| Java | 21 (eclipse-temurin) |
| Node (build) | 22-alpine |
| PostgreSQL | 16-alpine |
| nginx | 1.27-alpine |

## Arranque

```powershell
cd <raíz del repo>
copy .env.example .env
# Editar .env (ver tabla abajo)
docker compose up -d --build
```

Abre **http://localhost**. Logs: `docker compose logs -f backend`.

## Variables en `.env` (obligatorio)

| Variable | Descripción |
|----------|-------------|
| `POSTGRES_PASSWORD` | Contraseña de Postgres |
| `SPRING_DATASOURCE_PASSWORD` | La misma que `POSTGRES_PASSWORD` |
| `APP_JWT_SECRET` | Secreto JWT, **≥ 32 caracteres** |
| `APP_CORS_ALLOWED_ORIGIN_PATTERNS` | En VM: incluir `http://TU_IP:*` y `http://TU_IP` |
| `VITE_API_URL` | Dejar **vacío** (mismo origen vía nginx) |

No subas `.env` a Git.

## IP fija en la VM

Ejemplo con IP `10.20.30.40`:

```env
APP_CORS_ALLOWED_ORIGIN_PATTERNS=http://localhost:*,http://10.20.30.40:*,http://10.20.30.40
```

Acceso: `http://10.20.30.40`. Con HTTPS más adelante: `APP_JWT_COOKIE_SECURE=true`.

## Base de datos limpia

```bash
docker compose down -v
docker compose up -d --build
```

Flyway crea el esquema y el catálogo de ingredientes al arrancar el backend. No uses scripts `.txt` ni `DataLoader` antiguos.

## Persistencia

- `postgres_data` — base de datos  
- `recetario_media` — archivos subidos  
- `restart: unless-stopped` — reinicio automático con Docker/VM  

## Seguridad (JWT)

- Login/registro → `accessToken` + cookie HttpOnly `recetario_auth`
- `/api/**` y `/media/**` requieren autenticación
- `/api/users/{userId}/**` solo si `userId` coincide con el token

## Parar

```bash
docker compose down          # mantiene volúmenes
docker compose down -v       # borra BD y medios
```

## Qué archivos NO necesitas con Docker

| Archivo | Motivo |
|---------|--------|
| `application-local.properties` | Solo desarrollo local en IDE |
| Postgres instalado en Windows/Linux | Lo lleva el contenedor `db` |
| `frontend/.env` con API URL | El build usa `VITE_API_URL` vacío en `.env` raíz |
| `HELP.md` (eliminado) | Plantilla Spring Boot sin relación con este proyecto |

## Desarrollo local sin Docker

Ver sección opcional en [README.md](README.md): `application-local.properties.example` + Postgres local + `npm run dev`.
