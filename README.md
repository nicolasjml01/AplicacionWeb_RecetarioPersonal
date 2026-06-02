# Recetario personal

Gestión de recetas, calendario de comidas y lista de la compra.

## Arranque (Docker)

```bash
cp .env.example .env
# Editar contraseñas, APP_JWT_SECRET y CORS con tu IP si aplica
docker compose up -d --build
```

Abre **http://localhost** (o la IP de tu VM). Documentación completa: [DOCKER.md](DOCKER.md). Despliegue en Alpine: [DESPLIEGUE-ALPINE-VM.md](DESPLIEGUE-ALPINE-VM.md).
