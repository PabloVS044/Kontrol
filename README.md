<div align="center">

# Kontrol

**Plataforma de gestión de proyectos, equipos, inventario y marketing — con agente de IA integrado.**

Monorepo: **Vue 3 + Vite** en el frontend · **Node.js + Express** en el backend · **PostgreSQL** + **MongoDB** como bases de datos.

[![CI](https://github.com/PabloVS044/Kontrol/actions/workflows/ci.yml/badge.svg?event=pull_request)](https://github.com/PabloVS044/Kontrol/actions/workflows/ci.yml)

![Vue](https://img.shields.io/badge/Vue-3-42b883?logo=vuedotjs&logoColor=white)
![Node](https://img.shields.io/badge/Node-20--22-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248?logo=mongodb&logoColor=white)
![Docker](https://img.shields.io/badge/Docker_Compose-ready-2496ED?logo=docker&logoColor=white)

</div>

---

## Tabla de contenido

- [Stack](#stack)
- [Requisitos](#requisitos)
- [Inicio rápido (Docker — Windows y Linux)](#inicio-rápido-docker--windows-y-linux)
- [Variables de entorno](#variables-de-entorno)
- [Comandos útiles de Docker](#comandos-útiles-de-docker)
- [Desarrollo sin Docker (opcional)](#desarrollo-sin-docker-opcional)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Cobertura de código](#cobertura-de-código)
- [Solución de problemas](#solución-de-problemas)
- [Contribuir](#contribuir)

---

## Stack

| Capa | Tecnología | Puerto local |
|---|---|---|
| Frontend | Vue 3 · Vite · Pinia · Vue Router · Socket.IO · Three / OGL / GSAP | `5173` |
| Backend | Node.js · Express · Socket.IO · Zod · JWT · Google OAuth | `3000` |
| Base de datos relacional | PostgreSQL 16 | `5433` (host) → `5432` (contenedor) |
| Base de datos de chat | MongoDB 7 | `27017` |
| Agente de IA | Servidor de inferencia compatible con OpenAI (Qwen 3.6 vía vLLM) | externo / configurable |

---

## Requisitos

| Camino | Necesitas |
|---|---|
| **Recomendado — Docker** | [Docker Desktop](https://www.docker.com/products/docker-desktop/) (incluye Docker Compose). En Linux: `docker` + `docker compose` v2. |
| **Sin Docker** | [Node.js 20–22](https://nodejs.org) (ver `.nvmrc` → `22`), PostgreSQL 16 y MongoDB 7 corriendo localmente. |

> El proyecto usa `node >=20 <23`. Si usas [`nvm`](https://github.com/nvm-sh/nvm) (Linux/macOS) o [`nvm-windows`](https://github.com/coreybutler/nvm-windows): `nvm install 22 && nvm use 22`.

---

## Inicio rápido (Docker — Windows y Linux)

Un solo flujo sirve para **ambos sistemas operativos**. Los comandos `git` y `docker compose` son idénticos; solo cambia cómo copias el archivo `.env`.

```bash
# 1. Clonar el repositorio
git clone git@github.com:PabloVS044/Kontrol.git
cd Kontrol
```

**2. Crear el archivo de variables de entorno**

<table>
<tr><th>Linux / macOS (bash)</th><th>Windows (PowerShell)</th><th>Windows (CMD)</th></tr>
<tr>
<td><code>cp backend/.env.example backend/.env</code></td>
<td><code>Copy-Item backend/.env.example backend/.env</code></td>
<td><code>copy backend\.env.example backend\.env</code></td>
</tr>
</table>

Edita `backend/.env` y rellena al menos `JWT_SECRET` (cualquier cadena larga aleatoria). El resto puede quedar vacío para un arranque básico — ver [Variables de entorno](#variables-de-entorno).

```bash
# 3. Levantar todo (frontend + backend + PostgreSQL + MongoDB)
docker compose up
```

La primera vez Docker construye las imágenes e inicializa PostgreSQL con `backend/kontrol.sql`. Cuando termine:

| Servicio | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend (API) | http://localhost:3000 |
| PostgreSQL | `localhost:5433` (usuario `postgres` / pass `postgres` / db `kontrol`) |
| MongoDB | `localhost:27017` (db `kontrol_chat`) |

**Hot reload activado** en frontend y backend: cualquier cambio en el código se refleja sin reiniciar nada.

> ¿El puerto `5433` está ocupado? Define otro antes de levantar:
> - Linux/macOS: `POSTGRES_HOST_PORT=5434 docker compose up`
> - PowerShell: `$env:POSTGRES_HOST_PORT=5434; docker compose up`

---

## Variables de entorno

Todas viven en `backend/.env` (copiado desde `backend/.env.example`). **Nunca** se commitea. Si añades una variable nueva, actualiza también `.env.example`.

| Variable | Obligatoria | Descripción |
|---|---|---|
| `PORT` | — | Puerto del backend (default `3000`). |
| `DATABASE_URL` | sí | Cadena de conexión a PostgreSQL. En Docker el host es `postgres`; sin Docker, `localhost`. |
| `DATABASE_SSL` | — | `true` solo si la DB remota exige SSL (ej. Supabase). |
| `JWT_SECRET` | **sí** | Secreto para firmar JWT. Cadena larga y aleatoria. |
| `JWT_EXPIRES_IN` | — | Caducidad del token (default `8h`). |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_CALLBACK_URL` | para login Google | Credenciales OAuth de [Google Cloud Console](https://console.cloud.google.com). |
| `FRONTEND_URL` | sí | URL del frontend para redirigir tras el callback OAuth. |
| `MONGODB_URI` | sí | Conexión a MongoDB (chat). En Docker el host es `mongo`. |
| `INTEGRATION_ENCRYPTION_KEY` | — | Clave para cifrar API keys/webhooks guardados. Si falta, usa `JWT_SECRET`. |
| `UPLOADTHING_TOKEN` | para adjuntos | Token de [UploadThing](https://uploadthing.com) (subida de archivos/imágenes/audio en el chat). |
| `AGENT_API_KEY` | para el agente IA | Token Bearer del endpoint Qwen de ClawStitch. |
| `AGENT_API_URL` | — | Override opcional de la base OpenAI-compatible del agente. Default: `https://model.clawstitch.com/v1`. |
| `AGENT_MODEL` | — | Modelo del agente (default `Qwen/Qwen3.6-27B-FP8`). |
| `AGENT_TEMPERATURE` / `AGENT_MAX_TOKENS` / `AGENT_MAX_STEPS` | — | Parámetros de inferencia del agente. |

> Para producción/despliegue en VM existe `.env.deploy.example` + `scripts/deploy.sh`. Eso es otro flujo, no necesario para desarrollo local.

---

## Comandos útiles de Docker

```bash
# Levantar en segundo plano
docker compose up -d

# Ver logs (todos / un servicio)
docker compose logs -f
docker compose logs -f backend
docker compose logs -f frontend

# Detener (mantiene los datos)
docker compose down

# Detener y BORRAR volúmenes (resetea PostgreSQL y MongoDB)
docker compose down -v

# Reconstruir imágenes (tras cambiar package.json o un Dockerfile.dev)
docker compose up --build

# Abrir una shell dentro de un contenedor
docker compose exec backend sh
docker compose exec postgres psql -U postgres -d kontrol
```

---

## Desarrollo sin Docker (opcional)

Solo si prefieres correr Node directamente. Necesitas **PostgreSQL 16** y **MongoDB 7** instalados y corriendo, y haber creado la base `kontrol` cargando `backend/kontrol.sql`.

Antes de empezar, configura `backend/.env` apuntando a `localhost`:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/kontrol
MONGODB_URI=mongodb://localhost:27017/kontrol_chat
```

**Opción A — una terminal por subcarpeta** (lo más habitual). Funciona igual en Windows y Linux:

```bash
# Terminal 1 — backend
cd backend
npm i
npm run dev        # Node --watch en :3000

# Terminal 2 — frontend
cd frontend
npm i
npm run dev        # Vite en :5173
```

**Opción B — desde la raíz** (workspaces, una sola terminal):

```bash
npm install        # instala backend + frontend de una vez
npm run dev        # levanta ambos en paralelo (concurrently)
```

Otros scripts del `package.json` raíz:

| Script | Acción |
|---|---|
| `npm run dev` | Frontend y backend en paralelo (`concurrently`). |
| `npm run dev:frontend` | Solo el frontend (Vite en `:5173`). |
| `npm run dev:backend` | Solo el backend (Node `--watch` en `:3000`). |
| `npm run build` | Build de producción del frontend. |

**Atajo en Linux:** `./dev.sh` abre backend y frontend en dos pestañas de `gnome-terminal`.

> El frontend hace proxy de `/api` y `/socket.io` hacia el backend (configurable con `VITE_API_PROXY_TARGET`).

---

## Estructura del proyecto

```
Kontrol/
├── frontend/              # Vue 3 + Vite + Pinia + Vue Router          -> :5173
│   ├── src/
│   ├── vite.config.js
│   └── Dockerfile.dev
├── backend/               # Node.js + Express + Socket.IO              -> :3000
│   ├── src/
│   │   ├── controllers/   # Lógica de cada recurso (auth, projects, tasks, ...)
│   │   ├── routes/        # Definición de endpoints
│   │   ├── middleware/    # Auth, roles, permisos, validación
│   │   ├── services/      # Integraciones, IA, notificaciones, email, Slack
│   │   ├── schemas/       # Validación con Zod
│   │   ├── models/        # Modelos de MongoDB (chat)
│   │   ├── db/            # Pool de PostgreSQL, conexión a Mongo, bootstrap
│   │   └── index.js       # Punto de entrada
│   ├── kontrol.sql        # Esquema inicial de PostgreSQL (lo carga Docker)
│   ├── .env.example
│   └── Dockerfile.dev
├── scripts/               # azure-setup.sh, deploy.sh (despliegue en VM)
├── docker-compose.yml     # Entorno de desarrollo
├── docker-compose.prod.yml# Entorno de producción
├── Caddyfile              # Reverse proxy en producción
├── dev.sh                 # Atajo para levantar dev en Linux
└── package.json           # Workspaces del monorepo
```

---

## Cobertura de código

La cobertura no es solo informativa: es un **control automático que bloquea el merge**. Vitest sale con código distinto de cero si un umbral no se cumple, y el workflow de CI propaga ese fallo, así que un PR que baje la cobertura queda en rojo.

```bash
npm run test:coverage -w backend
npm run test:coverage -w frontend
```

### Política de trinquete

Acordada en la retrospectiva del Sprint 5 (SCRUM-23). La retrospectiva planteaba un umbral global único del 60 %, pero ocho de los doce módulos de negocio siguen sin cobertura propia y ese valor habría dejado el pipeline en rojo de inmediato. Se adoptó en su lugar un trinquete de tres reglas:

1. **Umbral del 70 % por módulo crítico** — POS, presupuesto, autenticación y reportes.
2. **Umbral global fijado en la línea base medida**, sin margen. El umbral es exactamente la cobertura actual: puede mantenerse o subir, nunca bajar.
3. **+5 puntos porcentuales por sprint** sobre el umbral global.

### Umbrales vigentes

Línea base medida el 12/08/2026.

| | Statements | Branches | Functions | Lines |
|---|---|---|---|---|
| Backend — actual | 33 | 21 | 23 | 33 |
| Backend — cierre Sprint 6 | 38 | 26 | 28 | 38 |
| Frontend — actual | 83 | 83 | 78 | 85 |
| Frontend — cierre Sprint 6 | 85 | 85 | 80 | 88 |

Por módulo crítico, al 70 % en las cuatro métricas:

| Módulo | Archivos |
|---|---|
| POS | `frontend/src/utils/sales.js` |
| Presupuesto | `backend/src/utils/budgetCalculations.js` |
| Autenticación | `backend/src/middleware/require{Auth,Role}.js` |
| Reportes | `backend/src/controllers/reportsController.js`, `backend/src/routes/reportsRoutes.js`, `backend/src/schemas/reportsSchemas.js` |

`frontend/src/stores/auth.js` lleva un escalón temporal más bajo (60/55/55/60) porque hoy mide 66.66/60.41/59.25/69.73; sube a 70 cuando se amplíe `authStore.test.js`.

### Qué se mide

Se mide **solo lo que algún test importa**. `coverage.all` no existe en Vitest 4 y no se declara `coverage.include`, así que un archivo que ningún test toca no aparece en el reporte ni afecta al porcentaje. Es intencional: mantiene el gate estable mientras entra código sin tests propios.

Consecuencia a tener presente: un glob de umbral que no case con ningún archivo del reporte **pasa en vacío, sin avisar**. Si se borra el test que cubre uno de los archivos de la tabla, su umbral deja de proteger nada.

---

## Solución de problemas

| Síntoma | Causa / solución |
|---|---|
| `port is already allocated` al hacer `docker compose up` | Otro proceso usa `3000`, `5173`, `5433` o `27017`. Cierra ese proceso o cambia `POSTGRES_HOST_PORT`. |
| El backend arranca pero no conecta a PostgreSQL | `DATABASE_URL` debe usar host `postgres` dentro de Docker y `localhost` fuera. |
| Cambié `package.json` y no se ven las nuevas dependencias | `docker compose up --build` (las `node_modules` viven en un volumen). |
| Quiero empezar de cero (base de datos limpia) | `docker compose down -v && docker compose up`. |
| Login con Google falla | Faltan `GOOGLE_CLIENT_ID/SECRET` o la *redirect URI* no coincide con `GOOGLE_CALLBACK_URL`. |
| En Windows: `git clone` por SSH falla | Usa la URL HTTPS: `git clone https://github.com/PabloVS044/Kontrol.git` |
| `npm install` falla por versión de Node | Usa Node 20–22 (`.nvmrc` = `22`). |

---

## Contribuir

Lee [`CONTRIBUTING.md`](CONTRIBUTING.md): convención de ramas (`type/short-description`), Conventional Commits, plantillas de PR/issues y manejo de secretos.

Resumen rápido:
- Rama desde `main`: `feat/...`, `fix/...`, `docs/...`, etc.
- Commits: `type(scope): descripción en imperativo`.
- Un PR por feature/fix · rellena la plantilla · al menos una review antes de mergear.
- Nunca commitees `.env` con credenciales reales; actualiza `.env.example` al añadir variables.
