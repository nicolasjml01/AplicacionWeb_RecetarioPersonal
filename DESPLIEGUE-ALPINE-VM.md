# Despliegue en una VM Alpine Linux

Guía paso a paso para preparar una máquina virtual con **Alpine Linux**, instalar Docker y dejar en marcha **Recetario personal** con el `docker-compose.yml` del repositorio.

No necesitas instalar Java, Node ni PostgreSQL en la VM: todo va dentro de contenedores. En el host solo hace falta Docker, Git y la configuración de red/firewall.

Para detalles del stack y variables, consulta también [DOCKER.md](DOCKER.md).

---

## 1. Qué vas a tener al final

| Elemento | Dónde corre |
|----------|-------------|
| PostgreSQL 16 | Contenedor `db` |
| Backend Spring Boot (Java 21) | Contenedor `backend` |
| Frontend React + nginx | Contenedor `web` |
| Puerto público | **80** (variable `WEB_PORT` en `.env`) |

Acceso típico: `http://IP_DE_TU_VM` (por ejemplo `http://10.20.30.40`).

---

## 2. Requisitos de la VM (antes de instalar nada)

Recomendado:

| Recurso | Mínimo razonable | Notas |
|---------|------------------|--------|
| RAM | 2 GB | 4 GB si el primer `docker compose build` va justo de memoria |
| Disco | 15–20 GB libres | Las imágenes y capas de build ocupan bastante |
| CPU | 2 vCPU | Acelera el primer build |
| Red | IP fija o reserva DHCP | La necesitas para CORS y para acceder desde el navegador |
| SO | Alpine Linux 3.18+ (64 bits) | Con acceso root o `sudo` (paquete `doas` en Alpine) |

Conexión: SSH desde tu PC (`ssh root@IP` o `ssh recetario@IP` cuando crees el usuario).

---

## 3. Actualizar el sistema

Conéctate por SSH y ejecuta:

```sh
apk update
apk upgrade
```

Reinicia solo si el upgrade lo pide (kernel o servicios críticos):

```sh
reboot
```

---

## 4. Crear un usuario para desplegar (recomendado)

No uses `root` para el día a día del proyecto. Ejemplo con usuario `recetario`:

```sh
adduser -D -s /bin/sh recetario
adduser recetario docker
passwd recetario
```

- `-D`: sin contraseña inicial en algunos setups; `passwd` la fija después.
- El grupo `docker` lo crea el paquete Docker al instalarlo (paso 5). Si aún no existe, instala Docker primero y vuelve a ejecutar `adduser recetario docker`.

Para administrar la VM como `recetario` con privilegios puntuales, instala `doas` (opcional):

```sh
apk add doas
echo 'permit persist :recetario as root cmd apk' >> /etc/doas.d/recetario.conf
echo 'permit persist :recetario as root cmd rc-service' >> /etc/doas.d/recetario.conf
```

A partir de aquí puedes trabajar como `recetario` (vía `su - recetario` o SSH con ese usuario).

---

## 5. Instalar Docker y Compose en Alpine

```sh
apk add docker docker-cli-compose git curl
```

Habilitar Docker al arranque e iniciarlo:

```sh
rc-update add docker boot
service docker start
```

Comprobar:

```sh
docker --version
docker compose version
docker run --rm hello-world
```

Si `hello-world` falla con permisos y usas el usuario `recetario`, cierra sesión y vuelve a entrar (para que el grupo `docker` aplique) o reinicia la VM.

---

## 6. Zona horaria y utilidades (opcional pero útil)

```sh
apk add tzdata
# Ejemplo España:
setup-timezone -z Europe/Madrid
```

Para ver logs con fecha local coherente.

---

## 7. Firewall: abrir solo lo necesario

Por defecto Alpine puede no tener firewall activo; en producción conviene restringir.

### Opción A: `iptables` (clásico en Alpine)

Instalar y guardar reglas si usas OpenRC:

```sh
apk add iptables
```

Ejemplo mínimo (ajusta la interfaz; a menudo `eth0` o `ens18`):

```sh
# Permitir loopback y conexiones ya establecidas
iptables -A INPUT -i lo -j ACCEPT
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# SSH (cambia el puerto si no usas 22)
iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# HTTP de la aplicación
iptables -A INPUT -p tcp --dport 80 -j ACCEPT

# Bloquear el resto
iptables -A INPUT -j DROP
```

**No abras el puerto 5432** hacia Internet salvo que lo necesites expresamente: Postgres está en el compose pero no hace falta exponerlo fuera de la VM para usar la app.

Para persistir reglas en Alpine, documenta las tuyas en `/etc/iptables/rules` o usa el paquete/script que ya uses en tu entorno; el detalle depende de si usas `iptables-save` + servicio al boot.

### Opción B: sin firewall en laboratorio

En una red aislada de pruebas puedes omitir este paso; en una VM accesible desde internet, el paso 7 es importante.

---

## 8. Obtener el proyecto en la VM

### 8.1 Directorio de trabajo

Como usuario `recetario` (o el que uses):

```sh
mkdir -p ~/apps
cd ~/apps
```

### 8.2 Clonar el repositorio

**HTTPS** (más simple):

```sh
git clone https://github.com/TU_USUARIO/AplicacionWeb_RecetarioPersonal.git
cd AplicacionWeb_RecetarioPersonal
```

**SSH** (si tienes clave en la VM):

```sh
git clone git@github.com:TU_USUARIO/AplicacionWeb_RecetarioPersonal.git
cd AplicacionWeb_RecetarioPersonal
```

Sustituye la URL por la de tu remoto real.

### 8.3 Rama y actualizaciones futuras

```sh
git checkout main   # o la rama que despliegues
git pull
```

Para actualizar la app más adelante: `git pull` y luego `docker compose up -d --build` (sección 11).

---

## 9. Configurar `.env` en la VM

En la **raíz del repo** (junto a `docker-compose.yml`):

```sh
cp .env.example .env
vi .env    # o nano .env si lo instalas: apk add nano
```

### 9.1 Valores obligatorios a cambiar

| Variable | Qué poner |
|----------|-----------|
| `POSTGRES_PASSWORD` | Contraseña larga y aleatoria |
| `SPRING_DATASOURCE_PASSWORD` | **La misma** que `POSTGRES_PASSWORD` |
| `APP_JWT_SECRET` | Cadena aleatoria de **al menos 32 caracteres** |
| `APP_CORS_ALLOWED_ORIGIN_PATTERNS` | Incluir la IP (o hostname) de la VM |

### 9.2 Ejemplo con IP fija `10.20.30.40`

```env
POSTGRES_PASSWORD=tu_password_segura_aqui
SPRING_DATASOURCE_PASSWORD=tu_password_segura_aqui
APP_JWT_SECRET=genera_un_secreto_largo_de_32_caracteres_minimo
APP_CORS_ALLOWED_ORIGIN_PATTERNS=http://localhost:*,http://127.0.0.1:*,http://10.20.30.40:*,http://10.20.30.40
WEB_PORT=80
VITE_API_URL=
APP_JWT_COOKIE_SECURE=false
```

- Deja `VITE_API_URL` **vacío**: nginx hace proxy de `/api` y `/media` al backend.
- `APP_JWT_COOKIE_SECURE=false` es correcto mientras entres por **HTTP**. Si más adelante pones HTTPS delante, cámbialo a `true`.

### 9.3 Generar secretos en la VM (opcional)

```sh
# Contraseña Postgres (ejemplo)
head -c 24 /dev/urandom | base64

# JWT (32+ bytes en base64)
head -c 48 /dev/urandom | base64
```

No subas `.env` a Git.

---

## 10. Primer arranque con Docker Compose

Desde la raíz del repo:

```sh
cd ~/apps/AplicacionWeb_RecetarioPersonal
docker compose up -d --build
```

La primera vez tarda: descarga imágenes base, compila backend (Maven/Java 21) y frontend (Node 22).

### 10.1 Comprobar que todo está arriba

```sh
docker compose ps
docker compose logs -f
```

Servicios esperados: `db`, `backend`, `web` en estado **running**. El backend espera a que Postgres pase el healthcheck.

### 10.2 Probar en el navegador

Desde tu PC: `http://IP_DE_LA_VM`

Registro/login de prueba. Si la página carga pero las peticiones API fallan por CORS, revisa `APP_CORS_ALLOWED_ORIGIN_PATTERNS` (IP exacta, con y sin `:*`).

### 10.3 Logs por servicio

```sh
docker compose logs -f backend
docker compose logs -f web
docker compose logs -f db
```

---

## 11. Operación habitual en la VM

| Acción | Comando |
|--------|---------|
| Parar (conservar datos) | `docker compose down` |
| Arrancar de nuevo | `docker compose up -d` |
| Reconstruir tras cambios de código | `docker compose up -d --build` |
| Ver estado | `docker compose ps` |
| Reinicio automático | Ya definido: `restart: unless-stopped` en el compose |

Tras reiniciar la VM, Docker arranca con OpenRC y los contenedores deberían levantarse solos si antes hiciste `docker compose up -d`.

---

## 12. Persistencia de datos

Volúmenes Docker (no se borran con `docker compose down`):

| Volumen | Contenido |
|---------|-----------|
| `postgres_data` | Base de datos |
| `recetario_media` | Imágenes/vídeos subidos |

**Borrado total** (BD + medios, empezar de cero):

```sh
docker compose down -v
docker compose up -d --build
```

Flyway recrea el esquema y el catálogo de ingredientes al arrancar el backend.

---

## 13. Copias de seguridad (recomendado)

### Base de datos

```sh
docker compose exec -T db pg_dump -U recetario_user recetario_db > backup_$(date +%Y%m%d).sql
```

(Ajusta usuario y nombre de BD si los cambiaste en `.env`.)

### Medios

Localiza el volumen:

```sh
docker volume inspect AplicacionWeb_RecetarioPersonal_recetario_media
```

Copia el directorio `_data` que indique `Mountpoint` (suele requerir root o parar el stack un momento).

---

## 14. Seguridad en producción (checklist)

- [ ] Usuario dedicado (`recetario`), no despliegues como root.
- [ ] Contraseñas fuertes en `.env` y permisos `chmod 600 .env`.
- [ ] Firewall: solo **22** (SSH) y **80** (o 443 si añades HTTPS).
- [ ] No exponer **5432** a internet.
- [ ] SSH con clave pública; deshabilitar login root por contraseña si aplica.
- [ ] Actualizar Alpine y imágenes periódicamente: `apk upgrade`, `docker compose pull`, `docker compose up -d --build`.
- [ ] HTTPS: delante un reverse proxy (Traefik, Caddy, nginx en el host) o certificado en otro nivel; entonces `APP_JWT_COOKIE_SECURE=true`.

---

## 15. Problemas frecuentes

| Síntoma | Qué revisar |
|---------|-------------|
| `Cannot connect to the Docker daemon` | `service docker start`, usuario en grupo `docker`, nueva sesión SSH |
| Build se queda colgado o OOM | Más RAM/swap: `apk add util-linux` y configurar swap en disco |
| `connection refused` en el navegador | `docker compose ps`, firewall puerto 80, `WEB_PORT` en `.env` |
| API 403 / CORS | `APP_CORS_ALLOWED_ORIGIN_PATTERNS` con la IP exacta de la VM |
| Backend no arranca | `docker compose logs backend`, que `SPRING_DATASOURCE_PASSWORD` = `POSTGRES_PASSWORD` |
| Puerto 80 ocupado | Cambiar `WEB_PORT=8080` en `.env` y abrir 8080 en firewall |

### Espacio en disco

```sh
docker system df
docker system prune -a   # cuidado: borra imágenes no usadas
```

---

## 16. Resumen rápido (orden de ejecución)

1. `apk update && apk upgrade`
2. `apk add docker docker-cli-compose git`
3. `rc-update add docker boot && service docker start`
4. Usuario `recetario` + grupo `docker`
5. Firewall: 22 + 80
6. `git clone` del repo en `~/apps`
7. `cp .env.example .env` y editar secretos + IP en CORS
8. `docker compose up -d --build`
9. Abrir `http://IP_VM` en el navegador

Con eso la VM queda preparada y el proyecto en funcionamiento sin instalar Java, Node ni Postgres en Alpine.
