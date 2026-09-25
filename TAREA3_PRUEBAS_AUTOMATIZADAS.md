# Tarea 3 — Pruebas Automatizadas

**Universidad del Valle de Guatemala · CC3091 – Ingeniería de Software 2 · Semestre II – 2026**

**Proyecto: Kontrol** — Plataforma de gestión de proyectos, equipos, inventario y marketing con agente de IA integrado.

| Capa | Tecnología |
|---|---|
| Frontend | Vue 3 · Vite 6 · Pinia · Vue Router · Socket.IO |
| Backend | Node.js 20–22 · Express 4 · Zod · JWT · Socket.IO (ES Modules) |
| Bases de datos | PostgreSQL 16 · MongoDB 7 |

---

## 1. Herramientas y frameworks existentes (20 pts)

Nuestro stack es **JavaScript en ambas capas** (Vue 3 en frontend, Node.js + Express en backend), por lo que el ecosistema de herramientas es compartido en gran parte.

### 1.1 Frameworks de pruebas unitarias para JavaScript / Node.js (backend)

| Herramienta | Descripción | Puntos fuertes | Puntos débiles |
|---|---|---|---|
| **Jest** | El framework más popular históricamente (Meta). Runner + asserts + mocks + cobertura todo en uno. | Enorme comunidad, documentación, snapshots. | Soporte de **ES Modules aún experimental** (requiere flags); arranque lento en proyectos grandes. |
| **Vitest** | Runner moderno construido sobre Vite. API compatible con Jest. | **ESM nativo**, muy rápido (workers + caché de Vite), watch mode instantáneo, cobertura vía `v8`. | Comunidad más joven que Jest (aunque ya es el estándar del ecosistema Vite/Vue). |
| **node:test** | Runner **nativo de Node ≥18** (`node --test`). | Cero dependencias. | Sin mocks avanzados ni ecosistema; asserts básicos. |
| **Mocha + Chai + Sinon** | El stack clásico y modular: runner (Mocha), asserts (Chai), mocks/spies (Sinon). | Muy flexible y maduro. | Hay que armar y configurar 3+ librerías por separado. |
| **AVA** | Runner minimalista con ejecución concurrente por defecto. | Rápido, aislamiento por archivo. | Comunidad pequeña, sin mocks integrados. |
| **Supertest** | No es un runner: librería para probar **endpoints HTTP de Express** sin levantar el servidor. Se combina con cualquier runner. | Ideal para probar middleware + rutas reales. | Solo cubre la capa HTTP. |

### 1.2 Herramientas para pruebas unitarias de componentes Vue (frontend)

| Herramienta | Descripción | Puntos fuertes | Puntos débiles |
|---|---|---|---|
| **Vitest + @vue/test-utils** | Combinación **oficial recomendada por el equipo de Vue**. `@vue/test-utils` monta componentes; Vitest los ejecuta en jsdom/happy-dom. | Reutiliza la config de Vite del proyecto (alias, plugins, SFC `.vue`) sin configuración extra. | Ejecuta en DOM simulado, no navegador real. |
| **Jest + vue-jest** | La opción tradicional pre-Vite. | Documentación abundante. | Necesita transformadores (`vue-jest`, Babel) para compilar SFC; duplica la configuración que Vite ya tiene. |
| **Testing Library (Vue)** | Capa encima de test-utils orientada a probar "como el usuario" (por texto/rol, no por implementación). | Buenas prácticas de accesibilidad. | Es un complemento, no un runner. |
| **Cypress Component Testing** | Monta componentes en un **navegador real**. | Máxima fidelidad visual. | Pesado y lento para unitarias puras; más orientado a E2E. |
| **Playwright Component Testing** | Similar a Cypress, multi-navegador (Microsoft). | Rápido para ser navegador real. | Aún experimental para Vue; overkill para unitarias. |

---

## 2. Herramientas seleccionadas y justificación (25 pts)

### Selección: **Vitest** como runner único para todo el monorepo, con **@vue/test-utils** (frontend) y **Supertest** (backend).

| Criterio | Razón |
|---|---|
| **Compatibilidad técnica** | El backend de Kontrol usa `"type": "module"` (ES Modules puros). Jest requiere flags experimentales para ESM; **Vitest lo soporta de forma nativa sin configuración**. El frontend ya usa **Vite 6**: Vitest reutiliza exactamente la misma configuración (plugin de Vue, alias, SFC) — cero duplicación. |
| **Un solo framework para el monorepo** | Frontend y backend comparten runner, sintaxis de asserts, sistema de mocks (`vi.mock`, `vi.fn`, fake timers) y reporte de cobertura. Todo el equipo aprende **una sola API**. |
| **Rendimiento** | Ejecución en paralelo con worker threads y transformación vía esbuild. En nuestras corridas, la suite completa (24 tests) corre en **menos de 2 segundos**; el modo `watch` re-ejecuta solo los tests afectados de forma casi instantánea (estilo HMR). |
| **Popularidad y comunidad** | +14 millones de descargas semanales en npm; es el runner por defecto de `create-vue`, Nuxt, SvelteKit y Astro. Es la **recomendación oficial de la documentación de Vue 3** para pruebas unitarias. |
| **Documentación** | vitest.dev tiene documentación completa en varios idiomas; al ser API-compatible con Jest, casi cualquier ejemplo/respuesta de Stack Overflow de Jest aplica directamente. |
| **Robustez** | Cobertura integrada (`@vitest/coverage-v8`), UI web opcional (`@vitest/ui`), tipado TS de fábrica, snapshots, mocks de módulos y de tiempo. |
| **Supertest para el backend** | Permite probar rutas Express reales (middleware de validación + controlador) **sin levantar el servidor ni la base de datos**, inyectando peticiones HTTP simuladas. Es el estándar de facto para Express. |

**Alternativas descartadas:** Jest (fricción con ESM y con Vite — habría que mantener una segunda configuración de compilación), `node:test` (sin mocks ni ecosistema suficientes para mockear `pg`/`mongoose`), Mocha/Chai/Sinon (3 librerías que configurar vs. 1), Cypress/Playwright CT (son para component/E2E testing en navegador, no unitarias rápidas).

### Instalación en el proyecto

```bash
# raíz del monorepo
npm i -D vitest @vitest/coverage-v8 -w backend
npm i -D vitest @vue/test-utils jsdom -w frontend
npm i -D supertest -w backend
```

```jsonc
// backend/package.json  y  frontend/package.json → scripts
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

```js
// frontend/vite.config.js — se agrega el bloque test a la config existente
export default defineConfig({
  plugins: [vue()],
  test: { environment: 'jsdom', globals: true },
})
```

---

## 3. Ejemplos de pruebas unitarias en el proyecto (35 pts)

Todos los ejemplos prueban **código real de Kontrol** (rutas de archivo incluidas).

### 3.1 Backend

#### Ejemplo B1 — Validación del esquema de registro (`backend/src/schemas/authSchemas.js`)

El `registerSchema` de Zod protege el endpoint de registro. Probamos casos válidos e inválidos:

```js
// backend/tests/authSchemas.test.js
import { describe, it, expect } from 'vitest'
import { registerSchema, loginSchema } from '../src/schemas/authSchemas.js'

const validUser = {
  nombre: 'Jonathan', apellido: 'Tubac',
  email: 'jonathan@kontrol.gt', password: 'segura123', role: 'admin',
}

describe('registerSchema', () => {
  it('acepta un usuario válido', () => {
    expect(registerSchema.safeParse(validUser).success).toBe(true)
  })

  it('rechaza un email con formato inválido', () => {
    const r = registerSchema.safeParse({ ...validUser, email: 'no-es-email' })
    expect(r.success).toBe(false)
    expect(r.error.issues[0].message).toBe('Invalid email format.')
  })

  it('rechaza contraseñas de menos de 8 caracteres', () => {
    const r = registerSchema.safeParse({ ...validUser, password: '1234567' })
    expect(r.success).toBe(false)
  })

  it('rechaza roles fuera del enum admin/usuario', () => {
    const r = registerSchema.safeParse({ ...validUser, role: 'superjefe' })
    expect(r.success).toBe(false)
  })
})

describe('loginSchema', () => {
  it('el inviteToken es opcional pero debe medir al menos 16 caracteres', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: 'x' }).success).toBe(true)
    expect(loginSchema.safeParse({ email: 'a@b.com', password: 'x', inviteToken: 'corto' }).success).toBe(false)
  })
})
```

#### Ejemplo B2 — Middleware genérico de validación (`backend/src/middleware/validate.js`)

Se prueba el middleware aislado, **mockeando** `req`, `res` y `next` con `vi.fn()`:

```js
// backend/tests/validate.test.js
import { describe, it, expect, vi } from 'vitest'
import { z } from 'zod'
import validate from '../src/middleware/validate.js'

const schema = z.object({ nombre: z.string().min(1) })

function mockRes() {
  return { status: vi.fn().mockReturnThis(), json: vi.fn() }
}

describe('validate middleware', () => {
  it('llama a next() y reemplaza req.body con los datos parseados', () => {
    const req = { body: { nombre: 'Kontrol', extra: 'se descarta' } }
    const res = mockRes()
    const next = vi.fn()

    validate(schema)(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(req.body).toEqual({ nombre: 'Kontrol' }) // campo extra eliminado por Zod
  })

  it('responde 400 con la lista de errores cuando el body es inválido', () => {
    const req = { body: {} }
    const res = mockRes()
    const next = vi.fn()

    validate(schema)(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        errors: [{ field: 'nombre', message: expect.any(String) }],
      }),
    )
  })
})
```

#### Ejemplo B3 — Middleware de autenticación JWT (`backend/src/middleware/requireAuth.js`)

Se firman tokens reales con `jsonwebtoken` para cubrir los tres caminos: sin token, token inválido y token válido.

```js
// backend/tests/requireAuth.test.js
import { describe, it, expect, vi, beforeAll } from 'vitest'
import jwt from 'jsonwebtoken'
import requireAuth from '../src/middleware/requireAuth.js'

beforeAll(() => { process.env.JWT_SECRET = 'secreto-de-test' })

const mockRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() })

describe('requireAuth', () => {
  it('rechaza con 401 si no hay header Authorization', () => {
    const res = mockRes(); const next = vi.fn()
    requireAuth({ headers: {} }, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('rechaza con 401 un token firmado con otro secreto', () => {
    const token = jwt.sign({ id_usuario: 1 }, 'otro-secreto')
    const res = mockRes(); const next = vi.fn()
    requireAuth({ headers: { authorization: `Bearer ${token}` } }, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('adjunta el payload a req.user y llama next() con token válido', () => {
    const payload = { id_usuario: 7, email: 'j@kontrol.gt', nombre_rol: 'admin' }
    const token = jwt.sign(payload, process.env.JWT_SECRET)
    const req = { headers: { authorization: `Bearer ${token}` } }
    const next = vi.fn()

    requireAuth(req, mockRes(), next)

    expect(next).toHaveBeenCalledOnce()
    expect(req.user).toMatchObject(payload)
  })
})
```

#### Ejemplo B4 — Ruta Express completa con Supertest (validación + endpoint)

Prueba de la cadena `validate(loginSchema)` montada en una mini-app Express, sin levantar servidor ni base de datos:

```js
// backend/tests/loginRoute.test.js
import { describe, it, expect } from 'vitest'
import express from 'express'
import request from 'supertest'
import validate from '../src/middleware/validate.js'
import { loginSchema } from '../src/schemas/authSchemas.js'

const app = express()
app.use(express.json())
app.post('/api/auth/login', validate(loginSchema), (req, res) =>
  res.json({ success: true, email: req.body.email }),
)

describe('POST /api/auth/login', () => {
  it('devuelve 400 con detalle de campos si faltan credenciales', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'mal' })
    expect(res.status).toBe(400)
    expect(res.body.errors.map(e => e.field)).toContain('password')
  })

  it('devuelve 200 con credenciales bien formadas', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'j@kontrol.gt', password: 'segura123' })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ success: true, email: 'j@kontrol.gt' })
  })
})
```

### 3.2 Frontend

#### Ejemplo F1 — Helpers de formato (`frontend/src/utils/statusHelpers.js`)

```js
// frontend/tests/statusHelpers.test.js
import { describe, it, expect } from 'vitest'
import { formatMoney, formatBudget, statusPill } from '@/utils/statusHelpers'

describe('formatMoney', () => {
  it('abrevia millones y miles', () => {
    expect(formatMoney(2_500_000)).toBe('2.5M')
    expect(formatMoney(1_500)).toBe('1.5K')
    expect(formatMoney(999)).toBe('999.00')
  })

  it('trata null/undefined como 0', () => {
    expect(formatMoney(null)).toBe('0.00')
  })
})

describe('formatBudget', () => {
  it('antepone el símbolo de dólar y redondea miles sin decimales', () => {
    expect(formatBudget(1_200_000)).toBe('$1.2M')
    expect(formatBudget(4500)).toBe('$5K')
    expect(formatBudget('no-numérico')).toBe('$0')
  })
})

describe('statusPill', () => {
  it('devuelve etiqueta y colores para un estado conocido', () => {
    expect(statusPill('EN_PROGRESO')).toEqual({
      label: 'In Progress', color: '#34d399', bg: '#34d3991a',
    })
  })

  it('usa el estado crudo y color por defecto para estados desconocidos', () => {
    expect(statusPill('RARO')).toEqual({ label: 'RARO', color: '#888', bg: '#8881a' })
  })
})
```

#### Ejemplo F2 — Lógica de vencimiento con tiempo simulado (`isOverdue`)

Vitest permite **congelar el reloj** (`vi.setSystemTime`) para que la prueba sea determinista:

```js
// frontend/tests/isOverdue.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isOverdue } from '@/utils/statusHelpers'

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-07-17')) })
afterEach(() => vi.useRealTimers())

describe('isOverdue', () => {
  it('una tarea con fecha pasada y estado activo está vencida', () => {
    expect(isOverdue({ fecha_vencimiento: '2026-07-01', estado: 'EN_PROGRESO' })).toBe(true)
  })

  it('una tarea COMPLETADA o CANCELADA nunca está vencida', () => {
    expect(isOverdue({ fecha_vencimiento: '2026-07-01', estado: 'COMPLETADA' })).toBe(false)
    expect(isOverdue({ fecha_vencimiento: '2026-07-01', estado: 'CANCELADA' })).toBe(false)
  })

  it('sin fecha de vencimiento no está vencida', () => {
    expect(isOverdue({ estado: 'EN_PROGRESO' })).toBe(false)
  })
})
```

#### Ejemplo F3 — Utilidades de invitaciones (`frontend/src/utils/invitation.js`)

```js
// frontend/tests/invitation.test.js
import { describe, it, expect } from 'vitest'
import { getInviteTokenFromQuery, getInviteErrorMessage } from '@/utils/invitation'

describe('getInviteTokenFromQuery', () => {
  it('prefiere ?invite= sobre ?inviteToken=', () => {
    expect(getInviteTokenFromQuery({ invite: 'abc', inviteToken: 'xyz' })).toBe('abc')
  })

  it('devuelve cadena vacía si no hay token o no es string', () => {
    expect(getInviteTokenFromQuery({})).toBe('')
    expect(getInviteTokenFromQuery({ invite: ['array'] })).toBe('')
  })
})

describe('getInviteErrorMessage', () => {
  it('mapea códigos conocidos a mensajes', () => {
    expect(getInviteErrorMessage('invite_not_found'))
      .toBe('The invitation does not exist or was removed.')
  })

  it('devuelve mensaje genérico para códigos desconocidos y vacío para null', () => {
    expect(getInviteErrorMessage('otro_codigo')).toBe('The invitation could not be processed.')
    expect(getInviteErrorMessage(null)).toBe('')
  })
})
```

#### Ejemplo F4 — Componente Vue con @vue/test-utils (`frontend/src/components/UI/Pill/Pill.vue`)

```js
// frontend/tests/Pill.test.js
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Pill from '@/components/UI/Pill/Pill.vue'

describe('Pill.vue', () => {
  it('renderiza la etiqueta recibida por props', () => {
    const wrapper = mount(Pill, { props: { label: 'En progreso' } })
    expect(wrapper.find('.pill-text').text()).toBe('En progreso')
  })

  it('muestra el punto de color solo cuando se pasa circleColor', () => {
    const sin = mount(Pill, { props: { label: 'X' } })
    const con = mount(Pill, { props: { label: 'X', circleColor: '#34d399' } })
    expect(sin.find('.dot').exists()).toBe(false)
    expect(con.find('.dot').exists()).toBe(true)
  })

  it('inyecta los colores como variables CSS', () => {
    const wrapper = mount(Pill, {
      props: { label: 'X', btnColor: '#111', textColor: '#eee' },
    })
    const style = wrapper.attributes('style')
    expect(style).toContain('--color: #111')
    expect(style).toContain('--text: #eee')
  })
})
```

### Ejecución

```bash
npm test -w backend      # 4 archivos · pruebas de schemas, middleware y rutas
npm test -w frontend     # 4 archivos · utils, fake timers y componente Vue
npm run test:coverage -w backend   # reporte de cobertura v8
```

---

## 4. Conclusiones (20 pts)

1. **Tiempo de confección.** Configurar Vitest en ambos workspaces tomó menos de 15 minutos (en el frontend fue solo agregar el bloque `test` a la config de Vite existente). Escribir las 8 suites de ejemplo tomó ~2 horas; la curva de aprendizaje fue mínima porque la API es idéntica a Jest, que ya conocíamos de cursos anteriores.

2. **Eficiencia de la herramienta.** La suite completa corre en **menos de 2 segundos** y el modo watch re-ejecuta al instante solo los tests afectados por el archivo que se edita. Esto hace viable correr las pruebas continuamente durante el desarrollo, no solo antes del commit.

3. **Los mocks eliminan las dependencias pesadas.** Con `vi.fn()` y Supertest pudimos probar middleware de autenticación y rutas Express **sin levantar PostgreSQL, MongoDB ni el servidor**, y con `vi.setSystemTime` hicimos deterministas las pruebas que dependen de la fecha actual (`isOverdue`). La prueba unitaria queda rápida y reproducible en cualquier máquina y en CI.

4. **Escribir tests reveló decisiones de diseño.** Al probar `validate.js` confirmamos que Zod **descarta campos extra** del body (protección contra mass-assignment) y que el middleware soporta tanto Zod v3 como v4 (`issues` vs `errors`). Documentar comportamiento con tests es también una forma de especificación.

5. **Un solo framework para el monorepo fue la decisión correcta.** El mismo comando, la misma sintaxis y el mismo reporte de cobertura en frontend y backend reducen la fricción del equipo y simplifican la futura integración en GitHub Actions (`npm test` en cada workspace como check obligatorio de PR).

6. **Limitaciones observadas.** Las pruebas de componentes corren en jsdom, no en un navegador real: los componentes con WebGL/animaciones (Three.js, OGL, GSAP) de Kontrol no son buenos candidatos a pruebas unitarias y se cubrirían mejor con pruebas E2E (Playwright) en una fase posterior.

---

## Anexo — Guion sugerido para el video de evidencia

1. Mostrar el stack del proyecto (README) y el `package.json` de cada workspace con los scripts `test`.
2. Abrir uno de los archivos de prueba del backend (p. ej. `requireAuth.test.js`) y explicar el patrón *arrange–act–assert* y los mocks.
3. Correr `npm test -w backend` y `npm test -w frontend` mostrando los resultados en verde y el tiempo de ejecución.
4. Demostrar el modo watch: romper intencionalmente `formatBudget` (cambiar el redondeo), ver el test fallar al instante, revertir y verlo pasar.
5. Correr `npm run test:coverage` y mostrar el reporte de cobertura.
