# Despliegue con Docker



Para preparar una **VM Alpine Linux** desde cero, ver [DESPLIEGUE-ALPINE-VM.md](DESPLIEGUE-ALPINE-VM.md).



Stack: **PostgreSQL 16** + **Spring Boot (Java 21)** + **React (Vite 7) + nginx 1.27**.



Solo se expone el puerto **80** (frontend). nginx sirve la SPA y hace proxy de `/api` y `/media` al backend. Postgres solo es accesible dentro de la red Docker.



## Requisitos



- Docker Engine 24+ y Docker Compose v2 (`docker compose`)



| Componente | Imagen |

|------------|--------|

| Java | 21 (eclipse-temurin) |

| Node (build) | 22-alpine |

| PostgreSQL | 16-alpine |

| nginx | 1.27-alpine |



## Arranque



```bash

cd <raíz del repo>

cp .env.example .env

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



Flyway crea el esquema y el catálogo de ingredientes al arrancar el backend.



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



## Mantenimiento de Postgres

En `docker-compose.yml`, Postgres publica **127.0.0.1:5432** en el host (solo localhost de esa máquina, no `0.0.0.0`). El backend sigue usando `db:5432` por la red interna Docker.

### Cliente gráfico (DBeaver, pgAdmin) en tu PC

| Dónde corre Docker | Conexión |
|--------------------|----------|
| Windows (local) | Host `localhost`, puerto `5432`, BD `recetario_db`, usuario/contraseña del `.env` |
| VM Alpine | Túnel SSH (no abras 5432 en el firewall): `ssh -L 5432:127.0.0.1:5432 recetario@IP_VM` y en DBeaver `localhost:5432` |

### Terminal en el contenedor

```bash
docker compose exec db psql -U recetario_user -d recetario_db
```

### Copias de seguridad

```bash
docker compose exec -T db pg_dump -U recetario_user recetario_db > backup.sql
docker compose exec -T db psql -U recetario_user -d recetario_db < backup.sql
```

