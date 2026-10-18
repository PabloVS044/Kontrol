# Despliegue de producción

Estado del servidor de producción de Kontrol, decisión de topología y procedimiento de despliegue. Responde a PROD-1 (SCRUM-94).

Estado verificado el **14/10/2026** sobre la VM y desde una red externa.

---

## 1. Resumen

| Elemento | Valor |
|---|---|
| URL pública | <https://34.121.51.151.nip.io> |
| Comprobación de salud | <https://34.121.51.151.nip.io/api/health> |
| Certificado | Let's Encrypt, emitido por Caddy de forma automática. Válido del 26/09/2026 al 25/12/2026; Caddy lo renueva solo |
| VM | Google Cloud, 2 vCPU, disco de 8.6 GB, IP `34.121.51.151` |
| Versión desplegada | `c06b6bd` (merge del PR #149 en `develop`), contenedores levantados el 14/10/2026 20:56 UTC |
| Ambiente de pruebas | Retirado (ver §2) |

---

## 2. Topología

**Decisión:** la VM aloja **solo producción**. El ambiente de pruebas (SCRUM-25, `test.34.121.51.151.nip.io`) se retiró en el PR #149.

**Razones:**

- **Espacio.** El disco de 8.6 GB llegó al 98 % el 26/09/2026 y se llenó por completo el 01/10/2026, lo que rompió el build. Dos stacks completos (imágenes, contenedores y caché de build de cada uno) no caben con margen.
- **Base de pruebas sin servicio.** La base del ambiente de pruebas estaba en Supabase, en el plan gratuito, y excedió la cuota.
- **Sin uso.** Ninguna tarea abierta del sprint requiere el ambiente de pruebas. Las pruebas automatizadas corren en CI contra bases desechables.

Separar producción en otra VM no hace falta mientras no exista un ambiente de pruebas. Si se vuelve a necesitar, debe ir en otra VM o en un disco más grande, no en esta.

### Componentes

```
Internet ──443/80──► caddy (TLS, proxy) ──► frontend (nginx + SPA)
                                                │  /api, /socket.io
                                                ▼
                                             backend (Express) ──► postgres (local, volumen)
                                                │
                                                └──► MongoDB Atlas (chat y agente)
```

| Contenedor | Imagen | Persistencia |
|---|---|---|
| `kontrol-caddy-1` | `caddy:2-alpine` | `kontrol_caddy_data`, `kontrol_caddy_config` (certificados) |
| `kontrol-frontend-1` | build de `frontend/Dockerfile` | — |
| `kontrol-backend-1` | build de `backend/Dockerfile` | — |
| `kontrol-postgres-1` | `postgres:16-alpine` | `kontrol_postgres_data` |

Definición: `docker-compose.prod.yml` y `Caddyfile`. Proyecto de compose: `kontrol`. Checkout en `/app/Kontrol`.

---

## 3. Bases de datos

| Base | Producción | Antiguo ambiente de pruebas | ¿Separadas? |
|---|---|---|---|
| PostgreSQL | Contenedor `postgres` en la misma VM, volumen `kontrol_postgres_data` | Supabase (`aws-1-us-east-2.pooler.supabase.com`) | **Sí.** Verificado: el `DATABASE_URL` del backend apunta al host `postgres` del compose |
| MongoDB | Atlas, cluster `p6drz4j` | El mismo cluster | **No.** Pruebas no tenía su propio `MONGODB_URI`. Al retirarse pruebas lo usa solo producción, pero puede contener datos de chat generados en pruebas |

Contenido de la base de producción el 14/10/2026: 37 usuarios, 25 empresas, 43 proyectos.

Producción no carga `seed.js`: la base se inicializa con `backend/kontrol.sql` la primera vez que se crea el volumen. Hay 9 cuentas `*.neurolab@kontrol.test` creadas para las sesiones con usuarios; no vienen del sembrado de pruebas.

---

## 4. Espacio en disco

| Momento | Usado | Libre | Fuente |
|---|---|---|---|
| 26/09/2026 | 98 % | — | DT-21, `docs/deuda-tecnica.md` |
| 01/10/2026 | 100 % | 0 | Build fallido con `ENOSPC`. Se limpiaron caché de build, snaps viejos y journal, y se dieron de baja los contenedores e imágenes de pruebas |
| 14/10/2026 | 6.6 GB (77 %) | 2.0 GB | `df -h /` tras el despliegue del PR #149 |

Desglose de Docker el 14/10/2026 (`docker system df`):

| Tipo | Tamaño | Recuperable |
|---|---|---|
| Imágenes (4) | 1.67 GB | 0 |
| Volúmenes (4) | 68 MB | 0 |
| Caché de build | 812 MB | 23 MB |

Journal de systemd: 51 MB.

---

## 5. Procedimiento de despliegue

El despliegue es manual, desde la máquina de quien despliega, con `scripts/deploy.sh`.

### Requisitos (una sola vez)

1. Acceso SSH a la VM con tu clave: tu clave pública debe estar autorizada en la VM y debes conocer tu usuario.
2. Copiar `.env.deploy.example` a `.env.deploy` (está en `.gitignore`) y llenar los valores. Pídelos a quien administra la VM por un canal privado; **nunca** por el repositorio ni por chat de grupo.
   - `VM_USER` y `SSH_KEY`: tu usuario y tu clave.
   - `TEST_*`: vacíos. Si `TEST_DATABASE_URL` tiene valor, versiones anteriores del script reconstruían el ambiente de pruebas.

### Desplegar

```bash
git checkout main
git pull
./scripts/deploy.sh
```

El script se niega a seguir si hay cambios sin commit o si la rama local no coincide con `origin`. Despliega la rama actual; para desplegar otra sin cambiarte, usa `GIT_REF=main ./scripts/deploy.sh`.

> **Solo se despliega `main`.** El script hace `git reset --hard origin/<rama>` en el único checkout de la VM y reconstruye todo: desplegar `develop` u otra rama pone esa rama en producción.

Pasos que ejecuta:

1. **Código y configuración.** En la VM: `git fetch` y `git reset --hard origin/<rama>` en `/app/Kontrol`, y escribe `.env` a partir de `.env.deploy`.
2. **Build y arranque.** Construye `backend` y luego `frontend` (en secuencia, para no agotar RAM ni disco), recrea todos los contenedores con `--force-recreate` y borra las imágenes colgantes.
3. **Verificación.** Espera hasta 60 s a que `http://localhost:3000/api/health` responda. Si no responde, imprime el estado de los contenedores y las últimas 120 líneas del log del backend y termina con error.

### Después de desplegar

```bash
curl -fsS https://34.121.51.151.nip.io/api/health
```

Debe responder `{"status":"ok",...}`. Luego abre la URL en el navegador e inicia sesión.

### Volver a una versión anterior

No hay rollback automático. Revierte en `main` (`git revert <commit>`, PR, merge) y vuelve a desplegar. Los datos de Postgres viven en el volumen y no se tocan al redesplegar.

### Comandos útiles en la VM

```bash
cd /app/Kontrol
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=200 backend
df -h /
docker system df
docker builder prune -f      # libera la caché de build si el disco aprieta
```

---

## 6. Flujos verificados

### Comprobaciones automáticas (14/10/2026, desde red externa, sin modificar datos)

| Comprobación | Esperado | Resultado |
|---|---|---|
| `GET /` (SPA) | 200 | ✅ 200 |
| `GET /login` | 200 | ✅ 200 |
| `GET /api/health` | 200, `status: ok` | ✅ 200, `{"status":"ok"}` |
| `POST /api/auth/login` con credenciales inexistentes | 401 | ✅ 401 |
| `GET /api/projects` sin token | 401 | ✅ 401 |
| `GET /api/agent/status` sin token | 401 | ✅ 401 |
| Certificado TLS | Válido | ✅ Let's Encrypt, vence el 25/12/2026 |
| Puerto 3000 (backend) desde fuera | Cerrado | ✅ Filtrado |

### Flujos de usuario

Pendientes de verificar a mano en el navegador sobre producción, con una cuenta de producción (no una cuenta sembrada).

| Flujo | Resultado | Observaciones |
|---|---|---|
| Alta de cuenta | Pendiente | |
| Inicio de sesión (correo y Google) | Pendiente | |
| Dashboard | Pendiente | |
| Inventario | Pendiente | |
| Punto de venta | Pendiente | |
| Presupuesto | Pendiente | |
| Asistente (agente de IA) | Pendiente | |

---

## 7. Monitoreo

| Elemento | Estado |
|---|---|
| Endpoint de salud (`/api/health`) | ✅ Existe; `deploy.sh` lo comprueba al terminar cada despliegue |
| Comprobación periódica de salud con alerta | ❌ No configurada |
| Alerta de espacio en disco | ❌ No configurada. La VM no tiene `cron` instalado ni timers propios de systemd |
| Rotación de logs de contenedores | ❌ No configurada. No existe `/etc/docker/daemon.json` y los cuatro contenedores usan `json-file` sin `max-size`. Hoy los logs pesan KB porque los contenedores se recrearon, pero crecen sin límite (DT-21) |

---

## 8. Riesgos y pendientes

| # | Severidad | Hallazgo | Acción propuesta |
|---|---|---|---|
| 1 | Alta | Sin rotación de logs ni alerta de disco: el incidente del 01/10 puede repetirse | `logging` con `max-size` y `max-file` en el compose; timer de systemd o monitor externo para disco y salud |
| 2 | Media | `/app/Kontrol/.env` tiene permisos `664`: cualquier usuario de la VM lee los secretos | `chmod 600 .env` y aplicar el mismo permiso en `deploy.sh` |
| 3 | Media | `deploy.sh` pasa el `.env` codificado en base64 dentro del comando remoto: se ve en `ps` durante el despliegue (DT-27) | Enviar el `.env` por `scp` o por stdin |
| 4 | Media | El checkout de la VM está en la rama local `main`, pero contiene `develop` (`c06b6bd`); `origin/main` aún no incluye el PR #149 | Hacer el release `develop → main` y desplegar desde `main`, como indica §5 |
| 5 | Baja | MongoDB compartido históricamente con pruebas (§3) | Base de Mongo propia para producción, o limpiar los datos de pruebas |
| 6 | Baja | El HTML del SPA no emite cabeceras de seguridad y nginx expone su versión (DT-19) | Según DT-19 |
| 7 | Baja | 812 MB de caché de build en un disco con 2.0 GB libres | `docker builder prune` periódico o dentro de `deploy.sh` |
