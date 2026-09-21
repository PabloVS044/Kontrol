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

Acordada en la retrospectiva del Sprint 5 (SCRUM-23) y recalibrada el 20/09/2026 al declarar `coverage.include` y remedir sobre el denominador completo. Tres reglas:

1. **Umbral del 70 % por módulo crítico** — POS, presupuesto, autenticación y reportes. Dos excepciones vigentes, documentadas más abajo: el POS de backend arranca en 0 y `stores/auth.js` lleva 65 en ramas.
2. **Umbral global fijado en la línea base medida, menos 1 punto porcentual de margen.** El umbral no autoriza a bajar cobertura: el margen solo cubre la varianza de la medición.
3. **+5 puntos porcentuales por sprint** sobre el umbral global, contados desde esta base nueva.

Hasta el 20/09/2026 la regla 2 iba sin margen, y funcionaba mientras el denominador era pequeño y estable. Con el denominador real hay dos fuentes de varianza que antes no pesaban. La primera es la versión de Node: v8 contabiliza ramas y funciones de forma distinta entre versiones mayores, y la medición se hace en local mientras el CI usa el 22 de `.nvmrc`. La segunda es el tamaño del denominador: sobre 3 929 sentencias de backend, un controlador nuevo de 200 sentencias sin prueba baja `statements` 0.78 puntos por sí solo, y sobre 9 152 de frontend una vista nueva de 300 sentencias lo baja 0.32. Sin margen, cualquier PR que añada un archivo sin prueba quedaría rojo aunque no tocara nada de lo ya cubierto.

### Línea base: antes y después

La caída del 20/09/2026 es una corrección de medición, no una regresión. No se eliminó ninguna prueba y ninguna línea dejó de estar cubierta: el numerador es idéntico, 637 sentencias en backend y 929 en frontend. Lo único que cambió es el denominador, que antes contenía solo los archivos que algún test importaba.

| Backend | Antes | Después |
|---|---|---|
| Statements | 37.05 % (637/1 719) | **16.21 % (637/3 929)** |
| Branches | 23.96 % (265/1 106) | **10.94 % (265/2 421)** |
| Functions | 27.44 % (59/215) | **12.42 % (59/475)** |
| Lines | 37.24 % (610/1 638) | **16.46 % (610/3 705)** |
| Archivos en el reporte | 35 de 94 | **83 de 83** |

| Frontend | Antes | Después |
|---|---|---|
| Statements | 92.90 % (929/1 000) | **10.15 % (929/9 152)** |
| Branches | 87.07 % (586/673) | **9.84 % (586/5 955)** |
| Functions | 91.30 % (252/276) | **12.12 % (252/2 078)** |
| Lines | 93.90 % (848/903) | **10.46 % (848/8 104)** |
| Archivos en el reporte | 19 de código, más 6 recursos | **129 de 129** |

### Umbrales vigentes

Línea base medida el 20/09/2026.

| | Statements | Branches | Functions | Lines |
|---|---|---|---|---|
| Backend — actual | 15 | 9 | 11 | 15 |
| Backend — cierre Sprint 8 | 20 | 14 | 16 | 20 |
| Frontend — actual | 9 | 8 | 11 | 9 |
| Frontend — cierre Sprint 8 | 14 | 13 | 16 | 14 |

Por módulo crítico, con su medición real al lado:

| Módulo | Archivo | Medido | Umbral |
|---|---|---|---|
| Presupuesto | `backend/src/utils/budgetCalculations.js` | 100 / 100 / 100 / 100 | 70 × 4 |
| Autenticación | `backend/src/middleware/require{Auth,Role}.js` | 100 / 100 / 100 / 100 | 70 × 4 |
| Reportes | `backend/src/controllers/reportsController.js` | 97.53 / 100 / 100 / 97.53 | 70 × 4 |
| Reportes | `backend/src/routes/reportsRoutes.js` | 100 / 100 / 100 / 100 | 70 × 4 |
| Reportes | `backend/src/schemas/reportsSchemas.js` | 100 / 100 / 100 / 100 | 70 × 4 |
| POS | `backend/src/controllers/inventoryMovementController.js` | 0 / 0 / 0 / 0 | 0 × 4 |
| POS | `backend/src/routes/inventoryMovementRoutes.js` | 0 / 0 / 0 / 0 | 0 × 4 |
| POS | `backend/src/schemas/inventoryMovementSchemas.js` | 0 / 0 / 0 / 0 | 0 × 4 |
| POS | `frontend/src/utils/sales.js` | 95.45 / 94.44 / 100 / 100 | 70 × 4 |
| Autenticación | `frontend/src/stores/auth.js` | 71.60 / 66.66 / 70.37 / 75 | 70 / 65 / 70 / 70 |
| Reportes | `frontend/src/utils/reportExport.js` | 96.87 / 94.44 / 93.33 / 96.87 | 70 × 4 |
| Reportes | `frontend/src/utils/pdf/reportPdf.js` | 95.08 / 77.50 / 100 / 95.61 | 70 × 4 |
| Reportes | `frontend/src/utils/pdf/pdfDocument.js` | 89.04 / 75.26 / 96.66 / 90.40 | 70 × 4 |

Tres notas sobre esta tabla:

- Los umbrales de reportes del frontend apuntaban antes a `views/ReportsView.vue`, `views/ReportDetailView.vue` y `components/reports/**`, y casaban con cero archivos. Los tests que esperaban nunca llegaron: esos quince archivos siguen a 0 %. Se redirigieron a los tres archivos del módulo que sí tienen pruebas, donde vive la lógica de exportación. Las vistas y los componentes no quedan desprotegidos: ahora entran al denominador global, así que su 0 % pesa ahí en lugar de esconderse detrás de un glob vacío.
- El POS de backend va en 0 a propósito. En 0 no protege nada: es un marcador que deja el módulo declarado como crítico con su cifra real a la vista, hasta que lleguen sus pruebas de caracterización. El único umbral de POS que existía antes era `frontend/src/utils/sales.js`, pero ahí solo están el subtotal y el total de línea del navegador; la venta que descuenta stock y cobra mide 0 % sobre 198 sentencias.
- `frontend/src/stores/auth.js` subió de 60/55/55/60, escalón fijado cuando el archivo medía 66.66/60.41/59.25/69.73. Ramas se queda en 65 porque mide 66.66. En funciones el margen es de 0.37 puntos (19 de 27): una función que deje de cubrirse incumple el umbral.

### Cobertura real por módulo

Punto de partida de las tareas de caracterización del Sprint 8. Formato: statements / branches / functions / lines.

| Módulo | Archivos | Cobertura | Sentencias |
|---|---|---|---|
| POS backend | 3 | **0 / 0 / 0 / 0** | 0 / 198 |
| Inventario backend | 3 | **0 / 0 / 0 / 0** | 0 / 205 |
| Proveedores backend | 3 | **0 / 0 / 0 / 0** | 0 / 72 |
| Autenticación backend | 3 | **0 / 0 / 0 / 0** | 0 / 126 |
| Autorización (`middleware/**`) | 9 | **50.00 / 37.33 / 66.67 / 48.39** | 50 / 100 |
| Presupuesto backend | 4 | 20.22 / 28.48 / 21.05 / 18.36 | 54 / 267 |
| Reportes backend | 3 | 97.92 / 100 / 100 / 97.92 | 94 / 96 |
| POS frontend — `utils/sales.js` | 1 | 95.45 / 94.44 / 100 / 100 | 42 / 44 |
| POS frontend — componentes de venta | 3 | 95.45 / 93.15 / 93.33 / 97.37 | 126 / 132 |
| Inventario frontend | 10 | 14.52 / 10.48 / 10.65 / 15.06 | 126 / 868 |
| Proveedores frontend (`SuppliersView.vue`) | 1 | **0 / 0 / 0 / 0** | 0 / 121 |
| Autenticación frontend | 3 | 70.94 / 67.90 / 70.59 / 72.90 | 83 / 117 |
| Reportes frontend — exportación | 3 | 92.33 / 83.41 / 96.92 / 93.36 | 277 / 300 |
| Reportes frontend — vistas y componentes | 15 | **0 / 0 / 0 / 0** | 0 / 887 |

Autorización es el único de los módulos bloqueantes que no parte de cero: `requireAuth.js` y `requireRole.js` al 100 %, `validate.js` 100/75/100/100, `requireCompanyRole.js` 87.50, `requireCompany.js` 61.90, `requireCompanyOwner.js` 14.28, `requireProjectPermission.js` 13.04, y `requireProject.js` y `requireSuperUser.js` a 0.

El 14.52 % de inventario del frontend se concentra en los tres componentes de venta, que están al 95 %. El resto del módulo, `InventoryPage.vue` incluido, está sin cubrir.

### Qué se mide

`coverage.all` no existe en Vitest 4, así que el denominador lo fija `coverage.include`. Desde el 20/09/2026 está declarado en los dos workspaces.

| | Backend | Frontend |
|---|---|---|
| `include` | `src/**/*.js` | `src/**/*.{js,vue}` |
| `exclude` | `tests/**`, `src/index.js`, `src/uploadthing.js`, `src/db/**`, `src/models/**` | `tests/**`, `src/main.js`, `src/router/**`, `src/locales/**`, `src/assets/**`, `src/styles/**`, `src/components/UI/Backgrounds/**` |
| Denominador | 83 archivos, 3 929 sentencias | 129 archivos, 9 152 sentencias |

Queda fuera el arranque del proceso, la configuración de SDK externos, las conexiones y scripts de base de datos, los esquemas declarativos de Mongoose, la tabla de rutas, los diccionarios de i18n, los recursos estáticos y los fondos WebGL. `src/socket/index.js` sí entra: son 450 líneas de lógica de chat, no infraestructura. Las extensiones explícitas del `include` del frontend dejan fuera los `.css`, `.png` y `.json` que antes figuraban como archivos medidos.

Consecuencia a tener presente: un glob de umbral que no case con ningún archivo del reporte **pasa en vacío, sin avisar**. No es hipotético — es lo que ocurrió con los tres umbrales de reportes del frontend durante un mes. Por eso cada umbral por módulo lleva su medición real en un comentario al lado en el config: un glob sin número es un glob que nadie ha comprobado.

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
