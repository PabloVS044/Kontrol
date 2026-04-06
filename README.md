# Control

Monorepo con frontend en Vue 3 y backend en Node.js.

## Requisitos

- [Docker](https://www.docker.com/get-started) y Docker Compose

## Levantar el ambiente local

```bash
# 1. Clonar el repositorio
git clone git@github.com:PabloVS044/Kontrol.git
cd control

# 2. Crear el archivo de variables de entorno
cp backend/.env.example backend/.env

# 3. Levantar todo
docker compose up
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3000

El hot reload está habilitado en ambos servicios — cualquier cambio en el código se refleja automáticamente sin reiniciar nada.

## Comandos útiles

```bash
# Levantar en background
docker compose up -d

# Ver logs
docker compose logs -f

# Ver logs de un servicio específico
docker compose logs -f frontend
docker compose logs -f backend

# Detener
docker compose down

# Reconstruir (cuando cambia package.json o Dockerfile.dev)
docker compose up --build
```

## Estructura del proyecto

```
control/
├── frontend/   # Vue 3 + Vite + Pinia + Vue Router  →  :5173
└── backend/    # Node.js + Express                  →  :3000
```

## Variables de entorno

Copia `backend/.env.example` a `backend/.env` y ajusta los valores según tu entorno local. El archivo `.env` nunca se commitea.
