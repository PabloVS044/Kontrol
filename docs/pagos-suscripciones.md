# PAY-1 · Suscripciones con pasarela de pago en modo de prueba

**Tarea:** SCRUM-82 (PAY-1), Sprint 10 · **Fecha:** 24 de octubre de 2026

Este documento explica cómo cobraría Kontrol una suscripción y qué desbloquea cada plan. Todo funciona en **modo de prueba**: no hay cobros reales y el backend no acepta credenciales de producción.

---

## 1. Limitación del proveedor

**Stripe no opera en Guatemala.** En América Latina solo da servicio a entidades de Brasil y México, así que una entidad guatemalteca no puede abrir una cuenta para recibir pagos con él. En consecuencia:

- El módulo se construye y se demuestra **solo en modo de prueba**. Ningún entorno del proyecto tiene, ni debe tener, una clave de producción.
- La operación comercial real queda condicionada a **sustituir el proveedor** por uno que opere en el país.
- La limitación consta en tres lugares:

| Dónde | Qué dice |
| --- | --- |
| Este informe | Esta sección. |
| Términos y Condiciones | §5 en [`docs/legal/terminos-condiciones.md`](legal/terminos-condiciones.md) y cláusula 5 de `/legal` (versión legal 1.1, que pide aceptar los términos de nuevo). |
| La interfaz | Aviso fijo «Modo de prueba — sin cobros reales» en `/billing` (`TestModeBanner.vue`), con la tarjeta de prueba que hay que usar. |

## 2. Decisión de arquitectura: un puerto independiente del proveedor

El producto no habla con Stripe. Habla con un **puerto**, `backend/src/billing/provider.js`, que reúne las operaciones que Kontrol necesita. Detrás hay un adaptador por proveedor.

```
 Navegador ──► /api/billing/* ──► billingController ──► billingService ──► puerto (provider.js)
                                                             │                     │
                                                             ▼                     ▼
                                                 empresa_suscripcion      stripeProvider.js ──► API de Stripe
                                                 evento_pago_procesado    (único import de 'stripe')

 Stripe ──► POST /api/billing/webhook (cuerpo crudo + firma) ──► puerto.parseEvent ──► billingService.handleBillingEvent
```

| Operación del puerto | Uso |
| --- | --- |
| `ensureCustomer` | Registrar a la empresa como cliente del proveedor. |
| `createCheckoutSession` | Abrir la página de pago hospedada. |
| `getSubscription` | Consultar el estado de una suscripción. |
| `changeSubscriptionPlan` | Pasar de un plan pagado a otro. |
| `createPortalSession` | Abrir el portal de gestión hospedado. |
| `cancelSubscription` | Cancelar una suscripción. |
| `parseEvent` | Verificar la firma de un evento entrante y normalizarlo. |

Todas devuelven estructuras propias (por ejemplo, una suscripción normalizada `{ id, customerId, companyId, plan, interval, status, currentPeriodEnd, cancelAtPeriodEnd }`) y nunca objetos del SDK.

**Por qué este diseño:**

- **Sustituir el proveedor sin reescribir el módulo.** Llevar Kontrol a producción en Guatemala exige otro proveedor. Basta con escribir un adaptador nuevo que cumpla el mismo contrato, registrarlo en `ADAPTERS` y elegirlo con `BILLING_PROVIDER`. No cambian las tablas, los endpoints, el control de acceso ni el frontend.
- **Las tablas no dependen de Stripe.** Las columnas se llaman `id_cliente_proveedor` e `id_suscripcion_proveedor`, y guardan el nombre del proveedor en `proveedor`.
- **Las pruebas no salen a la red.** El proveedor simulado (`tests/helpers/fakeBillingProvider.js`) cumple el mismo puerto. Las pruebas unitarias y las de integración lo inyectan con `setBillingProvider`.
- **El precio no viaja en el código.** Los precios se resuelven en el proveedor por `lookup_key` (`kontrol_pro_monthly`, etc.). La misma versión del código sirve con cualquier cuenta de prueba sin copiar IDs al `.env`.

### Checkout hospedado (alcance PCI DSS)

Kontrol **nunca muestra un formulario de tarjeta propio**:

- El alta se paga en **Stripe Checkout**.
- El cambio de tarjeta y la cancelación se hacen en el **portal de cliente** de Stripe.
- El backend solo recibe la URL a la que redirigir. Ningún número de tarjeta pasa por el navegador de Kontrol ni por su servidor.

Así el proyecto se queda en el alcance ligero de PCI DSS (SAQ A) y no entra en una auditoría que no corresponde a este producto.

## 3. Modelo de planes

El equipo confirmó el modelo el 24-10-2026. La única fuente de verdad es `backend/src/billing/plans.js`; el frontend recibe el catálogo por `GET /api/billing/plans`.

|  | Gratis | Pro | Business |
| --- | --- | --- | --- |
| Precio mensual / anual (USD, prueba) | $0 | $19 / $190 | $49 / $490 |
| Miembros | 3 | 15 | ilimitados |
| Proyectos | 2 | 20 | ilimitados |
| Productos | 100 | 2 000 | ilimitados |
| Módulos | Base: proyectos, tareas, inventario, POS, proveedores, presupuesto, chat y reportes en pantalla | Base + exportar reportes, equipos, integraciones y marketing (sin IA) | Pro + Birdie (agente IA) y generación con IA en marketing |

**Reglas acordadas:**

- **La suscripción es de la empresa, no del usuario.**
  - Un usuario puede tener las empresas que quiera, y cada empresa nueva empieza en Gratis.
  - Todos los miembros heredan el plan de su empresa.
  - Solo el **owner** contrata, cambia o cancela (`requireCompanyRole('owner')`). El resto de los miembros solo ve el plan.
  - `super_user` no tiene restricciones.
- **Cómo se cambia de plan:**

| Cambio | Mecanismo |
| --- | --- |
| De Gratis a un plan pagado | Checkout hospedado. |
| Entre planes pagados (Pro ↔ Business, mensual ↔ anual) | Desde Kontrol, con `POST /api/billing/subscription/change`. Actualiza la suscripción con prorrateo. |
| De vuelta a Gratis (cancelar) | Portal hospedado. Se cancela al **final del período**. |

- **Pago fallido:** mientras el estado es `past_due` la empresa conserva el plan y ve un aviso. Cuando Stripe agota los reintentos y cancela, la empresa vuelve a Gratis.
- **Bajar de plan con exceso:** no se borra nada.
  - Si la empresa supera un tope, no puede crear ni invitar más hasta volver a estar por debajo.
  - Los módulos premium quedan bloqueados, pero sus datos se conservan.

## 4. Persistencia

Las tablas se definen en `backend/kontrol.sql` y se aplican de forma idempotente con `backend/src/db/bootstrap.js`.

- **`empresa_suscripcion`** tiene una fila por empresa (PK `id_empresa`, borrado en cascada) con estas columnas:
  - `proveedor`
  - `id_cliente_proveedor` (único)
  - `id_suscripcion_proveedor` (único)
  - `plan`
  - `intervalo`
  - `estado` (el del proveedor, o `none`)
  - `fin_periodo_actual`
  - `cancelar_al_final`
  - `actualizado_en`

  Una empresa sin fila está en Gratis, así que las empresas existentes no necesitan migración.
- **`evento_pago_procesado`** guarda `id_evento` (PK), `proveedor`, `tipo` y `procesado_en`. Es la base de la idempotencia.

El plan efectivo lo calcula `resolveEffectivePlan` (`billingService.js`): los estados `active`, `trialing` y `past_due` dan el plan pagado, y cualquier otro estado da `free`.

## 5. Recepción de eventos

Endpoint: `POST /api/billing/webhook`, en `backend/src/billing/webhook.js`.

- **Se monta antes de `express.json()`.** Lleva `express.raw` porque la firma se verifica sobre el cuerpo exacto que se firmó.
- **No requiere sesión.** Lo que autentica la petición es la firma.

**Eventos que se procesan:**

| Evento | Efecto |
| --- | --- |
| `checkout.session.completed` | Pago completado: alta del plan. |
| `customer.subscription.created` / `.updated` | Cambio de plan o de intervalo, cancelación programada, `past_due`. |
| `customer.subscription.deleted` | Fin de la suscripción: vuelta a Gratis. |
| `invoice.payment_failed` | Pago fallido: refleja `past_due`. |
| `invoice.paid` | Sale de `past_due`. |

**Garantías:**

1. **Firma verificada en cada evento.**
   - `stripe.webhooks.constructEvent` usa `STRIPE_WEBHOOK_SECRET`.
   - Sin firma, con una firma de otro secreto o con un cuerpo alterado, la respuesta es **400** y la base no se toca.
   - Los eventos con `livemode: true` también se rechazan.
   - Esto impide falsificar un evento de «suscripción activa» para obtener un plan de pago gratis.
2. **Idempotencia.**
   - El `id` del evento se inserta en `evento_pago_procesado` en la **misma transacción** que el cambio de la suscripción.
   - Si el evento ya estaba, la respuesta es `duplicate` y no se aplica nada.
   - Si algo falla, la transacción se revierte. El evento queda sin registrar y el reintento de Stripe lo procesa.
3. **Orden.** El estado no se toma del cuerpo del evento: se vuelve a leer la suscripción del proveedor. Un evento atrasado no puede dejar un estado viejo. Tampoco se acepta que un evento de una suscripción anterior, ya cancelada, pise a la suscripción vigente.
4. **La empresa nunca la decide el cliente.**
   - Sale de la metadata `id_empresa` que el **servidor** pone al crear el cliente, la sesión y la suscripción, o del cliente ya registrado para esa empresa.
   - Si el cliente del evento no coincide con el de la empresa, el evento se ignora.

## 6. Control de acceso por plan

Se reutiliza la capa de autorización unificada de DT-05: no se crea una cuarta capa. Los middlewares nuevos van en la misma cadena, después de `requireCompany`:

- **`requirePlanFeature(feature)`** responde 403 con `code: 'PLAN_FEATURE_REQUIRED'` e indica `requiredPlan`.
- **`requirePlanLimit(resource)`** responde 403 con `code: 'PLAN_LIMIT_REACHED'` e indica `limit` y `current`.

**El plan siempre se lee de la base de datos**, que solo cambia con eventos verificados. Ningún dato del cliente (cuerpo, cabeceras ni `localStorage`) influye.

**Dónde se aplica:**

| Recurso | Control |
| --- | --- |
| `POST /api/reports/exports` | Pro |
| `/api/teams`, `/api/integrations`, `/api/marketing` | Pro |
| `/api/agent/*` (salvo `/status`) y `POST /api/marketing/generate` | Business |
| Envío automático de notificaciones por integraciones (`notificationService`) | Pro: al bajar de plan, la configuración se conserva pero deja de enviar. |
| Crear proyecto, crear producto, generar el enlace de invitación | Tope del plan |
| Aceptar una invitación de empresa o de proyecto | Tope de miembros (`plan_limit_reached`, 403) |

**En el frontend:**

- `access-context` expone `plan` (código, módulos, topes y uso) para ocultar o bloquear en la interfaz.
- El router lleva a `/billing` cuando el módulo no está en el plan, y la barra de navegación muestra un candado.
- Un 403 `PLAN_*` dispara el aviso global «Mejora tu plan».
- Nada de esto es la autorización: es experiencia de usuario. La regla la aplica el backend.

**Límites conocidos:**

- **Exportar reportes.** El archivo se arma en el navegador con datos que el usuario ya puede ver en pantalla. El corte se hace en la interfaz antes de generarlo, y el backend rechaza el registro de la exportación.
- **Topes con peticiones concurrentes.** Se comprueban antes de crear, no con un bloqueo. Dos peticiones simultáneas en el borde del tope podrían pasar ambas. Para el alcance de la demostración se acepta.

## 7. Reglas de seguridad del ticket

| Regla | Cómo se cumple |
| --- | --- |
| Verificar la firma de cada evento | `parseEvent` en `stripeProvider.js`. Pruebas: `stripeProvider.test.js` (firma real de Stripe), `billingWebhook.test.js` y `billing.int.test.js`. |
| El plan nunca se lee del cliente | `getCompanyPlan` lee la base. El checkout solo acepta `{plan, interval}` validado con Zod; precio, importe y empresa los decide el servidor. |
| Idempotencia | `evento_pago_procesado` en la misma transacción. Pruebas de reenvío unitarias y de integración. |
| Clave secreta solo en el servidor | El frontend no recibe ninguna clave. Con Checkout y portal hospedados no hace falta ni siquiera la publicable. |
| Nada de claves en commits | `.env.example` y `.env.deploy.example` con las variables vacías. |
| Solo claves de modo de prueba | `assertTestModeKey`: el backend **no arranca** con una clave que no empiece por `sk_test_` o `rk_test_`. El seed se niega igual. |
| Datos mínimos al proveedor | A Stripe solo se envía `id_empresa` y una descripción genérica, nunca el nombre o el correo de la empresa. |

Además:

- Las operaciones que llaman a la pasarela tienen su propio límite de peticiones por usuario: `billingLimiter`, configurable con `RATE_LIMIT_BILLING_MAX`.
- Sin credenciales, el módulo responde **503** «billing not configured» y todas las empresas quedan en Gratis.

## 8. Configuración local

1. **Crea una cuenta de Stripe y quédate en modo de prueba.** No hace falta activar la cuenta.
2. **Configura el portal de cliente:** Dashboard (modo prueba) → *Settings* → *Billing* → *Customer portal*. Activa la actualización del método de pago y la cancelación «at end of billing period».
3. **Rellena `backend/.env`:**
   ```env
   BILLING_PROVIDER=stripe
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...   # lo imprime el paso 5
   ```
4. **Crea productos y precios:** `npm run stripe:seed -w backend`. Es idempotente.
5. **Reenvía los eventos al backend local:**
   ```bash
   stripe listen --forward-to localhost:3000/api/billing/webhook
   ```
6. **Despliegue.** En Render, define las dos variables y crea en el Dashboard un endpoint de webhook hacia `https://<backend>/api/billing/webhook` con los eventos de la sección 5.

## 9. Guion de demostración (criterio de aceptación)

1. **Empresa nueva:** `/billing` muestra el plan Gratis, el aviso de modo de prueba y el uso. *Equipos* aparece con candado. Crear un tercer proyecto da «Llegaste al tope de tu plan».
2. **Alta:** con el owner, pulsa *Suscribirse a Pro* y paga en Checkout con `4242 4242 4242 4242`, cualquier fecha futura y cualquier CVC. Al volver, el plan pasa a Pro y *Equipos* se desbloquea.
3. **Cambio:** pulsa *Cambiar a Business*. El agente Birdie se desbloquea.
4. **Idempotencia:** ejecuta `stripe events resend <evt_id>`. La respuesta es `duplicate` y no hay doble registro.
5. **Firma:** envía un evento sin firma. La respuesta es 400:
   ```bash
   curl -X POST localhost:3000/api/billing/webhook -H 'Content-Type: application/json' -d '{"id":"evt_x"}'
   ```
6. **Cancelación:** en *Gestionar pago o cancelar*, cancela. El plan sigue activo con «termina el …».
7. **Fin del período:** avanza un *test clock*, o cancela de inmediato desde el Dashboard. Llega `customer.subscription.deleted`, la empresa vuelve a Gratis, *Equipos* queda bloqueado y los datos siguen intactos.
8. **Pago fallido (opcional):** con la tarjeta `4000 0000 0000 0341` la renovación falla. La empresa queda en `past_due`, conserva el plan y ve un aviso.

## 10. Pruebas

**Backend, unitarias** (`npm test -w backend`):

| Archivo | Qué cubre |
| --- | --- |
| `billingPlans.test.js` | Catálogo y plan efectivo. |
| `stripeProvider.test.js` | Firma real, rechazo de claves y eventos productivos, normalización, seed. |
| `billingWebhook.test.js` | Firma, idempotencia y cada tipo de evento. |
| `billingRoutes.test.js` | Autorización por rol, validación, conflictos y 503. |
| `billingPlanAccess.test.js` | Control de acceso por plan y topes, sobre las rutas reales. |

**Backend, integración** con Postgres real (`npm run test:integration -w backend`):

- `billing.int.test.js` recorre el flujo completo: Gratis → alta → acceso → reenvío → cancelación → pérdida de acceso, más el tope de miembros al aceptar una invitación.

**Frontend** (`npm test -w frontend`):

- `billingView.test.js`
- `billingService.test.js`
- `billingRouter.test.js`
- `planRequiredNotice.test.js`
- Las pruebas de `AppNavbar` y de `SettingsView`

## 11. Baja de cuenta (integración con P-1)

Cuando la baja de cuenta de un owner deja su empresa sin sucesor, la empresa se desactiva y su suscripción no debe seguir renovándose. Se sigue el mismo patrón que la limpieza de Mongo de P-1:

1. Dentro de la transacción de la baja, `markSubscriptionsForCancellation` marca `cancelacion_pendiente = true`.
2. Tras el COMMIT, `cancelPendingSubscriptions` cancela la suscripción en la pasarela y quita la marca. La respuesta de la baja lo informa en `subscriptionCancellation`.
3. Si la pasarela falla, la marca queda puesta. `startSubscriptionCancellationWorker` lo reintenta cada 5 minutos.
4. El estado final (`canceled`) llega, como siempre, por el evento verificado `customer.subscription.deleted`.

**Datos de prueba.** `npm run seed:test` deja la empresa de pruebas en Business con proveedor `seed`, sin identificadores de pasarela. Así las pruebas de UX y de carga (k6) siguen ejerciendo los módulos y topes que el plan Gratis bloquearía.

## 11. Pendientes

- **Cuenta de prueba del equipo.** Faltan el titular, el país y la aceptación de los términos de Stripe (SSA/DPA). Ver el [anexo de proveedores](legal/anexo-proveedores.md).
- **Proveedor para operar en Guatemala.** Hay que elegirlo y escribir su adaptador antes de cualquier cobro real. Los Términos exigen informar las condiciones y obtener aceptación expresa antes de cobrar.
