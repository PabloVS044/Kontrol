# SCRUM-92 · DT-17 — Medición del bundle de entrada

Carga diferida del logo 3D y los fondos animados, y separación de chunks.

## 1. Herramienta y procedimiento

| Dato | Valor |
|---|---|
| Herramienta | Salida de `vite build` (Vite 6.4.3, Rollup) — tamaño minificado y gzip por chunk |
| Comando | `npm run build -w frontend` (el mismo paso que corre el job *Frontend* del CI) |
| Tamaño de `dist/assets` | `du -sb frontend/dist/assets` y `ls frontend/dist/assets \| wc -l` |
| Bundle de entrada | El `<script type="module">` que referencia `frontend/dist/index.html` |
| Desglose por librería | Build auxiliar con `manualChunks` solo para medir (no versionado): cada librería sale en un archivo propio y Vite reporta su peso minificado y gzip |
| Entorno | Node 24.13.1, Linux x64, commit base `d1321e8` |

El gzip que reporta Vite es una estimación del peso comprimido; el servidor puede
entregar el archivo con otra compresión o sin ella (ver §4).

Las cifras registradas en `docs/deuda-tecnica.md` para DT-17 (1 236 kB de entrada,
372 kB comprimidos, `dist/assets` de 8.3 MB en 72 archivos) se tomaron en una
medición anterior. La medición vigente, y la línea base de esta tarea, es la de
este documento.

## 2. Antes — build

### 2.1 Resumen

| Métrica | Antes |
|---|---|
| Bundle de entrada (`index-*.js`) | **1 328.83 kB** |
| Bundle de entrada, gzip | **402.45 kB** |
| CSS de entrada (`index-*.css`) | 67.94 kB (13.57 kB gzip) |
| `dist/assets` | 8.63 MB (8 630 302 B) en 83 archivos (43 JS, 35 CSS, 5 PNG) |
| Modelo `kontrol-logo.glb` (en `dist/`, fuera de `assets/`) | 1.35 MB (1.26 MB con gzip) |
| Aviso de Vite | Sí |

Aviso emitido:

```
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rollupOptions.output.manualChunks to improve chunking
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
```

### 2.2 Chunks de JavaScript más pesados

| Chunk | kB | gzip kB | Carga |
|---|---:|---:|---|
| `index-aK9TKZLt.js` (entrada) | 1 328.83 | 402.45 | Arranque |
| `index-Bco10w8o.js` (`@zxing/library`) | 459.11 | 120.13 | Diferida (escáner del POS) |
| `AgentView` | 83.60 | 27.76 | Diferida |
| `ProjectDetailView` | 59.76 | 15.30 | Diferida |
| `InventoryPage` | 54.66 | 13.77 | Diferida |
| `BudgetView` | 35.63 | 9.51 | Diferida |
| `ReportsView` | 30.71 | 8.99 | Diferida |
| `index-CczNX0y7.js` (`@zxing/browser`) | 27.18 | 7.04 | Diferida |
| `DashboardView` | 26.25 | 7.60 | Diferida |
| `ProjectsView` | 25.65 | 6.74 | Diferida |
| `RegisterView` | 5.92 | 2.06 | Diferida |
| `LoginView` | 4.51 | 1.84 | Diferida |

El resto de los 43 chunks JS pesa menos de 25 kB cada uno.

### 2.3 Composición del bundle de entrada

| Librería / módulo | kB | gzip kB | Quién lo trae al arranque |
|---|---:|---:|---|
| `three` | 589.57 | 150.34 | `LandingPage` → `KontrolLogo3D`, `MagicCircles` |
| `gsap` (+ `ScrollTrigger`) | 114.87 | 45.46 | `LandingPage`, `MagicBento`, `CardsSwap`, `AnimatedText` |
| `ogl` | 44.40 | 12.93 | `App.vue` → `Waves` (fondo global) |
| `lenis` | 19.86 | 5.74 | `LandingPage` → `ScrollStack` |
| **Subtotal animación** | **768.70** | **214.47** | |
| Diccionarios `es.json` + `en.json` | 153.46 | 50.52 | `locales/index.js` |
| `vue-i18n` + `@intlify` | 137.71 | 51.35 | `main.js` |
| `socket.io-client` + `engine.io-client` | 41.67 | 13.70 | `stores/chat.js` |
| `effect` | 20.45 | 7.36 | `uploadthing` |
| `lucide-vue-next` | 18.15 | 4.13 | Íconos de vistas en el bundle de entrada |
| Vue, router, Pinia y código de la app | 191.72 | 62.14 | `main.js`, `App.vue`, `LandingPage` |

Las cuatro librerías de animación son el 58 % del bundle de entrada (53 % del peso gzip).

## 3. Antes — tiempo hasta que el formulario de inicio de sesión es usable

### 3.1 Procedimiento

| Dato | Valor |
|---|---|
| Herramienta | Lighthouse 12.8.2 (CLI), Chromium sin interfaz `chrome-headless-shell` 156.0.8078.47 |
| Servidor | `vite preview` sobre el build de producción, puerto 4173, sin backend |
| URL | `http://localhost:4173/login` |
| Perfil | *Mobile*, throttling simulado por defecto: RTT 150 ms, 1.47 Mbps de bajada, CPU 4× más lenta |
| Corridas | 5, en incógnito; se reporta la mediana |

`vite preview` entrega el JavaScript comprimido, por eso el JS transferido es
cercano al peso gzip de la §2.

Comandos (el navegador y Lighthouse se instalan fuera del repo, sin tocar
`package-lock.json`):

```bash
npx @puppeteer/browsers install chrome-headless-shell@stable --path ~/.cache/kontrol-lh
export CHROME_PATH=$(find ~/.cache/kontrol-lh -name chrome-headless-shell -type f | head -1)

npm run build -w frontend
npm run preview -w frontend -- --port 4173 --strictPort   # en otra terminal

for i in 1 2 3 4 5; do
  npx lighthouse@12.8.2 http://localhost:4173/login --only-categories=performance \
    --form-factor=mobile --output=json --output-path=/tmp/lh-login-$i.json \
    --chrome-flags="--headless --no-sandbox --incognito" --quiet
done
```

Métricas:

| Métrica | Qué indica |
|---|---|
| **LCP** (Largest Contentful Paint) | Cuándo se pinta el contenido principal; en `/login` el elemento es el título del formulario (`h2.login-title`) |
| **TBT** (Total Blocking Time) | Cuánto tiempo el hilo principal está ocupado y no responde a la escritura |
| **JS transferido** | Bytes de JavaScript que descarga `/login` |

### 3.2 Resultados

| Corrida | LCP | FCP | TBT | JS transferido | Total transferido |
|---|---:|---:|---:|---:|---:|
| 1 | 11.99 s | 4.97 s | 948 ms | 399.5 KiB | 1 886.3 KiB |
| 2 | 11.79 s | 5.09 s | 1 037 ms | 399.5 KiB | 1 886.3 KiB |
| 3 | 11.81 s | 5.11 s | 962 ms | 399.5 KiB | 1 886.3 KiB |
| 4 | 11.84 s | 5.02 s | 1 163 ms | 399.5 KiB | 1 886.3 KiB |
| 5 | 11.87 s | 5.12 s | 1 056 ms | 399.5 KiB | 1 886.3 KiB |
| **Mediana** | **11.84 s** | **5.09 s** | **1 037 ms** | **399.5 KiB** | **1 886.3 KiB** |

Puntaje de rendimiento (mediana): 39/100.

Recursos más pesados que descarga `/login`:

| Recurso | Transferido |
|---|---:|
| `/kontrol-logo.glb` | 1 317.4 KiB |
| `/assets/index-*.js` (entrada) | 393.7 KiB |
| Fuentes de Google (DM Sans, Playfair Display) | 99.3 KiB |
| `/assets/kontrol-*.png` (marcador del logo) | 40.1 KiB |
| `/assets/index-*.css` | 13.6 KiB |

## 4. Hallazgo: el servidor de producción no comprime

`frontend/nginx.conf.template` no declara `gzip`, y la imagen `nginx:alpine` que
usa `frontend/Dockerfile` trae la compresión desactivada por defecto. En
producción el bundle de entrada viaja, por tanto, con su peso sin comprimir.

| Recurso | Sin compresión | Con gzip | Diferencia |
|---|---:|---:|---:|
| JS de entrada | 1 328.83 kB | 402.45 kB | 926.38 kB |
| CSS de entrada | 67.94 kB | 13.57 kB | 54.37 kB |

Impacto estimado: con el perfil de red de §3 (1.47 Mbps, unos 184 kB/s), esos
980 kB suponen unos 5.3 s adicionales de descarga antes de que `/login` pueda
pintar el formulario. Activar `gzip` (o servir los `.gz` precomprimidos) en
`nginx.conf.template` corresponde a DT-19, que ya modifica ese archivo.

## 5. Propuestas fuera de alcance

| Propuesta | Motivo | Ganancia estimada |
|---|---|---|
| Eliminar `lenis` | Solo lo usa `ScrollStack` para el scroll suave; `gsap` ya está en la Landing y cubre el mismo caso con `ScrollTrigger` (y `ScrollSmoother`) | 19.86 kB (5.74 kB gzip) y una librería menos |
| Pasar `MagicCircles` a `ogl` | Usa `three` solo para un *shader* de pantalla completa, lo mismo que `Waves` hace con `ogl`; `three` quedaría solo para los modelos GLTF | La Landing deja de necesitar `three` para su fondo |
| Reducir `kontrol-logo.glb` | 1.35 MB que `/login` descarga para el logo; comprimir la geometría (Draco o Meshopt) y las texturas. Tras DT-17 es lo que más pesa en el LCP de `/login` (§6.3) | Mayor que todo el JS de entrada |
| Diccionarios e i18n en el arranque | `es.json` y `en.json` se cargan juntos (153.46 kB), y `vue-i18n` incluye el compilador de mensajes (137.71 kB con `@intlify`) | Cargar solo el idioma activo y precompilar los mensajes |
| Separar del arranque los módulos de sesión | `socket.io-client`, el store del chat, `FloatingChat`, `BirdieAssistant`, `VideoCallOverlay` y `uploadthing`/`effect` se importan de forma estática en `App.vue` aunque solo se montan con sesión iniciada | Con los diccionarios, la mayor parte de los 483.38 kB que quedan en la entrada (§6.1) |
| Retirar `GridWave.vue` y `Split.vue` | Importan `gsap` pero ningún componente los usa | No cambia el bundle; reduce código a mantener |

## 6. Después

Cambios aplicados:

- `KontrolLogo3D` muestra el marcador estático (`kontrol.png`) y carga el motor 3D
  (`KontrolLogo3DScene`, `three` y el `.glb`) en diferido, solo cuando el logo está
  a 200 px de ser visible. Con `prefers-reduced-motion` activo se queda en el
  marcador y no descarga el motor (UX-R4).
- `MagicCircles` se carga en diferido cuando su sección es visible, mediante
  `LazyMagicCircles`, que ocupa su lugar y pinta su mismo degradado mientras tanto.
- La Landing se carga en diferido desde el router, como el resto de las vistas.
- `Waves`, el fondo global de `App.vue`, se carga en diferido. Con reducir
  movimiento sigue dibujando su cuadro estático (UX-R4), y el token del fondo no
  cambia (UX-R3).
- `manualChunks` en `vite.config.js` separa `three`, `ogl`, `gsap` y `lenis` en
  chunks propios.

### 6.1 Build

Misma herramienta y comando que en §1.

| Métrica | Antes | Después | Cambio |
|---|---:|---:|---:|
| Bundle de entrada | 1 328.83 kB | **483.38 kB** | −63.6 % |
| Bundle de entrada, gzip | 402.45 kB | **163.27 kB** | −59.4 % |
| CSS de entrada | 67.94 kB (13.57 kB gzip) | 41.06 kB (8.73 kB gzip) | −39.6 % |
| `dist/assets` | 8.63 MB en 83 archivos | 8.64 MB en 109 archivos | +0.1 % |
| Aviso de Vite | Sí | **No** | |

`dist/assets` no baja porque la carga diferida cambia cuándo se descarga cada
librería, no su peso total; el número de archivos sube por los chunks nuevos.

Chunks de las librerías de animación:

| Chunk | kB | gzip kB | Cuándo se descarga |
|---|---:|---:|---|
| `vendor-three-core` | 205.79 | 55.54 | Con el logo 3D visible (sin reducir movimiento), con `MagicCircles` visible o en Integraciones |
| `vendor-three` | 388.15 | 97.68 | Siempre junto con `vendor-three-core` |
| `vendor-gsap` | 114.87 | 45.46 | Con la Landing o Integraciones |
| `vendor-ogl` | 44.40 | 12.93 | Al montar el fondo global, después del bundle de entrada |
| `vendor-lenis` | 19.86 | 5.74 | Con la Landing |
| `LandingPage` | 49.74 | 15.31 | Al entrar a `/` |

`three` se reparte en dos chunks, uno con el módulo `three.core.js` y otro con el
resto, porque en uno solo superaba los 500 kB del aviso. Los dos se descargan
siempre juntos: la separación elimina el aviso, pero no reduce lo que se descarga.

Ninguno de estos chunks es una importación estática del bundle de entrada, e
`index.html` no los precarga. Composición de la entrada después (proporción del
código antes de minificar):

| Módulo | % |
|---|---:|
| Vue (`runtime-core`, `reactivity`, `runtime-dom`, `shared`) | 23.7 |
| Diccionarios `es.json` + `en.json` | 15.9 |
| `vue-i18n` + `@intlify` | 13.7 |
| `socket.io-client` + `engine.io` + store del chat | 14.7 |
| `effect` + `uploadthing` | 8.8 |
| `vue-router` | 5.9 |
| `FloatingChat`, `BirdieAssistant`, `VideoCallOverlay` | 9.8 |

### 6.2 Tiempo hasta que el formulario de inicio de sesión es usable

Mismo procedimiento que en §3.1, sobre el build de §6.1. Para la columna de
reducir movimiento se añadió `--force-prefers-reduced-motion` a `--chrome-flags`.

| Métrica (mediana de 5, mobile) | Antes | Después | Después, reducir movimiento |
|---|---:|---:|---:|
| LCP | 11.84 s | 11.64 s | **3.97 s** |
| FCP | 5.09 s | 3.96 s | 3.42 s |
| TBT | 1 037 ms | **679 ms** | **33 ms** |
| JS transferido | 399.5 KiB | 337.4 KiB | **184.8 KiB** |
| Total transferido | 1 886.3 KiB | 1 821.3 KiB | 350.8 KiB |
| Puntaje de rendimiento | 39 | 46 | 77 |

Corridas individuales:

| Corrida | LCP | FCP | TBT | LCP (red. mov.) | FCP (red. mov.) | TBT (red. mov.) |
|---|---:|---:|---:|---:|---:|---:|
| 1 | 11.95 s | 4.52 s | 828 ms | 3.93 s | 3.42 s | 33 ms |
| 2 | 11.66 s | 3.96 s | 687 ms | 3.97 s | 3.41 s | 44 ms |
| 3 | 11.53 s | 3.91 s | 679 ms | 4.22 s | 3.75 s | 0 ms |
| 4 | 11.51 s | 3.98 s | 636 ms | 4.50 s | 3.94 s | 0 ms |
| 5 | 11.64 s | 3.90 s | 653 ms | 3.12 s | 2.61 s | 38 ms |

El formulario aparece antes (FCP −1.1 s) y responde antes (TBT −35 %). `/login` ya
no descarga `gsap` ni `lenis`, y el motor 3D empieza a descargarse cuando el
formulario ya está pintado.

### 6.3 Qué determina el LCP de `/login`

En las corridas sin reducir movimiento, el 96 % del LCP es retraso de render del
título del formulario, no su descarga. Con el throttling simulado de Lighthouse,
la descarga del modelo `kontrol-logo.glb` (1 317 KiB) compite por el ancho de
banda con la pintura del título. Con reducir movimiento, donde el modelo no se
descarga, el LCP baja a 3.97 s y el elemento LCP pasa a ser el marcador del logo.
El siguiente paso para el LCP es reducir el peso del `.glb` (§5).

### 6.4 Landing

Lighthouse mobile, una corrida por build, como referencia:

| Métrica | Antes | Después |
|---|---:|---:|
| FCP | 5.28 s | 4.76 s |
| LCP | 11.83 s | 11.78 s |

En la tira de capturas de Lighthouse, el primer cuadro pintado ya muestra la
Landing completa (navegación, título, texto y botones sobre el fondo). No aparece
un cuadro intermedio con solo el fondo mientras llega el chunk de la Landing.

### 6.5 Verificación del build de producción

Con el build de §6.1 en `vite preview` y Chromium sin interfaz
(`--dump-dom --virtual-time-budget=8000`), cada ruta pública renderiza el
elemento raíz de su vista y no registra errores de carga de chunks:

| Ruta | Elemento raíz | Errores de carga |
|---|---|---:|
| `/` | `.landing-nav` | 0 |
| `/login` | `.login-page` | 0 |
| `/register` | `.register-page` | 0 |
| `/legal` | `.legal-page` | 0 |
| `/invite/abc` | `.invite-page` | 0 |
| Ruta inexistente | `.nf-root` (404) | 0 |

Las rutas con sesión se verifican a mano con el backend levantado.
