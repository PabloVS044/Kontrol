# Procedimiento de respuesta a incidentes y notificación de brechas

**Versión 1.0 · 27-10-2026 · SCRUM-91 (P-3).** Referencia de código: `develop` @ `325a2aa`.

Qué hace el equipo de Kontrol desde que detecta un incidente de seguridad o una caída grave hasta que lo cierra: quién decide, en qué orden se actúa, a quién se avisa y en qué plazo, y dónde queda registrado. Los plazos de este documento son los que comprometen la [Adenda de tratamiento de datos](legal/adenda-tratamiento-datos.md) (L-4, §8) y la [Política de Privacidad](legal/politica-privacidad.md) (L-2, §10). Este procedimiento es el que los hace cumplibles.

Fuentes de partida: [Marco legal](legal/marco-legal.md) (L-0), L-2, L-4, la [referencia para P-3](legal/referencia-p3-incidentes.md) con sus requisitos R1–R12, el [inventario de deuda técnica](deuda-tecnica.md), el [despliegue de producción](despliegue-produccion.md) y los informes de pruebas de [seguridad con ZAP](pruebas-seguridad-zap.md) y de [regresión de seguridad y volumen](pruebas-regresion-seguridad-volumen.md).

Como L-2 y L-4, este procedimiento requiere revisión profesional en Guatemala antes de aplicarse a un incidente con clientes reales.

---

## 1. Qué es un incidente

| Término | Definición | Fuente |
| --- | --- | --- |
| **Incidente** | Cualquier evento que interrumpe o degrada el servicio de producción, o que compromete o puede comprometer la seguridad de la plataforma o de sus datos. Incluye caídas, falta de espacio, fallas de proveedores, vulnerabilidades explotables en producción y accesos indebidos. | Este procedimiento |
| **Incidente de seguridad** | Toda violación de la seguridad que cause la destrucción, pérdida o alteración accidental o ilícita de datos, o su comunicación o acceso no autorizados. | L-4 §2 |
| **Brecha de datos personales** | Un incidente de seguridad que afecta datos personales: Datos del Cliente, Datos de cuenta y operación o ambos. Es lo que activa los avisos de la §6. | L-4 §2; L-2 §10 |
| **Datos del Cliente** | Datos personales de titulares que el negocio registra en su espacio de empresa: clientes finales, proveedores, trabajadores, contenido de tareas, evidencias, chat, asistente IA y archivos. El negocio es **responsable** y Kontrol, **encargado**. | L-4 §§2–3; L-0 l. 68 |
| **Datos de cuenta y operación** | Cuentas, autenticación, sesiones y registros técnicos que Kontrol trata para sus propios fines. Kontrol es **responsable**. | L-4 §§2–3; L-2 §1 |

Una caída sin pérdida ni acceso indebido a datos es un incidente, pero no un incidente de seguridad (L-4 §2; referencia P-3 §1). Se atiende y se registra igual, sin los avisos de brecha.

## 2. Niveles de severidad

La severidad se fija en la evaluación (§5.3) y puede subir o bajar conforme se conoce el alcance. Ante la duda se elige el nivel más alto.

| Nivel | Criterio | Ejemplos del propio proyecto | Avisos externos | Revisión posterior |
| --- | --- | --- | --- | --- |
| **Alta** | Brecha de datos personales confirmada o razonablemente probable; pérdida o corrupción de datos productivos, o riesgo inminente de ellas; producción inaccesible para todos los usuarios | Acceso entre empresas a tareas y evidencias (§10); disco de la VM lleno con Postgres de producción escribiendo en él (§11) | Sí, si hay brecha (§6) | Obligatoria (§9) |
| **Media** | Vulnerabilidad de severidad alta explotable en producción sin indicios de acceso a datos; un módulo de producción sin servicio | SSRF del probador de integraciones, DT-18, verificado en el ambiente desplegado el 26/09 y el 10/10/2026; MongoDB Atlas sin resolver DNS el 26/09/2026, con el chat y el asistente de producción sin servicio | No, salvo que la evaluación encuentre acceso a datos, y entonces pasa a Alta | Recomendada |
| **Baja** | Degradación sin pérdida de datos; fallas en ambientes que no son de producción; hallazgos de severidad media o baja | Base del ambiente de pruebas pausada por inactividad (26/09 y 11/10/2026) | No | No |

Un incidente que empieza en Media y en el que aparecen indicios de acceso a datos se reclasifica a Alta en ese momento, y el reloj de los avisos corre desde T0 (§6.1), no desde la reclasificación.

## 3. Roles

| Rol | Persona | Qué hace | Accesos que necesita |
| --- | --- | --- | --- |
| **Detecta** y contiene en infraestructura | **Pablo Vásquez** | Recibe la alerta o el reporte, confirma que es real, abre el registro, preserva la evidencia y ejecuta la contención técnica en la VM | SSH a la VM; paneles de MongoDB Atlas y de UploadThing |
| **Decide** (responsable de incidentes, R1) | **Juan Montenegro** | Clasifica, fija la severidad, decide si hay brecha y a quién se avisa, aprueba cada comunicación y declara la contención y el cierre | Jira; buzón `support@kontrol.it.com`; lectura de la base de producción |
| **Comunica** | **Ivana Figueroa** | Obtiene la lista de destinatarios, adapta la plantilla (§7), envía avisos, actualizaciones e informe de cierre y guarda las constancias | Buzón `support@kontrol.it.com` |
| **Documenta** | **Jonathán Tubac** | Lleva el registro en Jira durante todo el incidente, anota cada hito con su hora y conduce la revisión posterior | Jira |
| **Suplente** | **Alejandra Avilés** | Sustituye a R1 si no está localizable. Apoya la evaluación del alcance sobre los datos y la recuperación desde respaldo | Los mismos que R1, más acceso a la base para evaluar el alcance |

Reglas:

- **Siempre hay una persona que decide.** Si R1 no responde en una hora desde que se le avisa, decide la suplente, y así se anota en el registro.
- **Quien detecta no espera a R1 para preservar evidencia.** Las acciones de §5.2 que no destruyen nada (copiar logs, revocar sesiones de una cuenta concreta) se ejecutan de inmediato.
- **Toda comunicación al exterior la aprueba R1** o, en su ausencia, la suplente.
- **Confidencialidad:** quien atiende un incidente puede ver Datos del Cliente. Solo accede a lo necesario para el incidente (L-4 §5.5).

## 4. Capacidades actuales de la infraestructura

Solo lo que existe en `develop` y en el servidor documentado al 14/10/2026. Lo que no existe hoy se indica como tal: el procedimiento no depende de ello.

| Elemento | Estado | Fuente |
| --- | --- | --- |
| Servidor | VM de Google Cloud, 2 vCPU, disco de 8.6 GB. Contenedores `caddy` (TLS), `frontend` (nginx + SPA, reenvía `/api` y `/socket.io`), `backend` (Express) y `postgres` (volumen `kontrol_postgres_data`). Checkout en `/app/Kontrol` | [Despliegue §§1–2](despliegue-produccion.md) |
| Datos fuera de la VM | MongoDB Atlas (chat e historial del asistente), UploadThing (archivos y evidencias) y servidor IA ClawStitch | Despliegue §2; [L-4 Anexo A.2](legal/adenda-tratamiento-datos.md) |
| Salud | `/api/health`, comprobado por `scripts/deploy.sh` solo al terminar cada despliegue | Despliegue §7 |
| **Monitoreo periódico y alertas** | No existe hoy: no hay comprobación periódica de salud, alerta de disco, `cron` ni timers propios | Despliegue §7 |
| Logs | `stdout` de los contenedores (`json-file`). El backend registra solo errores (`errorHandler.js`), con método y ruta. nginx, en su configuración por defecto, registra cada petición con IP, método y ruta; `nginx.conf.template` no lo desactiva. Caddy no tiene registro de acceso configurado | `backend/src/middleware/errorHandler.js:37`; `frontend/nginx.conf.template`; `Caddyfile` |
| **Rotación y conservación de logs** | No existe hoy: sin `max-size`; los logs se pierden al recrear los contenedores, lo que ocurre en cada despliegue (`--force-recreate`) | Despliegue §§5, 7; DT-21 |
| Revocación de sesiones | `requireAuth` y el handshake de Socket.IO rechazan un token si la cuenta está inactiva o si cambió su `token_version`. Así se invalidan las sesiones de cuentas concretas sin cerrar las demás | `backend/src/middleware/requireAuth.js:32-38`; `backend/src/socket/index.js:147-154` |
| **Revocación en UploadThing** | La revocación por cuenta no aplica a la subida de archivos. Para cortar ahí una sesión ya emitida se rota `JWT_SECRET`, lo que cierra todas las sesiones | Revisión del código en `develop` |
| **Rollback automático** | Se hace de forma manual: `git revert` en `main`, PR, merge y `./scripts/deploy.sh` | Despliegue §5 |
| **Respaldos de producción** | No existe hoy: no hay copias productivas acreditadas de PostgreSQL, MongoDB ni archivos. La política de P-2 y su restauración de laboratorio del 26/10/2026 no están en operación | Despliegue §3; [L-2 §10](legal/politica-privacidad.md) |
| **Aviso dentro de la plataforma** | No existe hoy un mecanismo para mostrar un aviso a los usuarios de empresas concretas al iniciar sesión (R7 de la referencia P-3) | Referencia P-3, R7 |
| Canal de entrada | `support@kontrol.it.com`, con el asunto «Incidente de seguridad». Publicado en `/legal#contact` | L-4 §14.4; [índice legal](legal/README.md), O01 |

## 5. Pasos de respuesta

**T0** es el momento en que Kontrol tiene conocimiento del incidente: lo detecta el equipo, lo reporta un cliente o un usuario al canal de entrada, o llega el aviso de un proveedor. Se anota con fecha y hora. Todos los plazos de la §6 corren desde T0 (L-4 §8.1; referencia P-3 §3).

### 5.1 Detección

| Qué | Quién |
| --- | --- |
| Fuentes posibles: reporte en `support@kontrol.it.com` (clientes y usuarios, L-4 §4.8); aviso de un proveedor (Atlas, Google Cloud, UploadThing, Vercel); hallazgo propio en pruebas, revisión de código o despliegue; fallo de `/api/health` al desplegar. Sin monitoreo automático (§4), la detección depende de estas vías | Cualquier integrante que lo vea |
| Avisar de inmediato a quien detecta y a R1 | Quien lo vea |
| Confirmar que es real (reproducir, revisar el estado de los contenedores, `df -h /`) y abrir el registro en Jira con T0 (§8) | Detecta (Pablo) |
| Anotar desde el primer momento cada acción con su hora | Documenta (Jonathán) |

### 5.2 Contención

Objetivo: detener el daño sin destruir la evidencia.

| # | Acción | Quién |
| --- | --- | --- |
| 1 | **Preservar la evidencia antes de redesplegar o reiniciar.** En la VM, copiar fuera de los contenedores los logs de `frontend` (accesos), `backend` (errores) y `postgres` con `docker compose -f docker-compose.prod.yml logs --timestamps <servicio> > <archivo>`. Pedir al proveedor afectado sus registros. Anotar en Jira dónde quedó cada copia, con acceso restringido | Detecta |
| 2 | **Cortar las sesiones de las cuentas implicadas:** `UPDATE public.usuario SET token_version = token_version + 1 WHERE id_usuario = ANY($1)`. Si hay que impedir también nuevos inicios de sesión, `activo = false`. Si la cuenta usó UploadThing o el secreto está en duda, rotar `JWT_SECRET`, lo que cierra todas las sesiones | Detecta, con aprobación de R1 si afecta a todos |
| 3 | **Rotar los secretos comprometidos o en duda.** Lista en la [referencia P-3 §7.2](legal/referencia-p3-incidentes.md): `JWT_SECRET`, `DATABASE_URL`/`POSTGRES_PASSWORD`, `MONGODB_URI`, `UPLOADTHING_TOKEN`, `AGENT_API_KEY`, `GOOGLE_CLIENT_SECRET` y la clave de cifrado de integraciones. Se actualizan en `.env.deploy` y se redespliega | Detecta |
| 4 | **Cerrar la vía de ataque.** Si es un endpoint, desplegar un cambio mínimo que lo bloquee o lo corrija; si es una integración o un proveedor, desconectarla. El despliegue preserva los datos de Postgres (despliegue §5), pero solo después del paso 1 | Detecta |
| 5 | Si el incidente viene de un proveedor o lo afecta, abrir caso con él y anotar el número | Detecta |
| 6 | Anotar en Jira la fecha y hora de la contención: de ella dependen el informe de cierre y la conservación del registro | R1 la declara; Documenta la anota |

### 5.3 Evaluación del alcance

| Qué | Quién |
| --- | --- |
| Determinar qué ocurrió, desde cuándo y por qué vía, con los logs preservados | Detecta, con la suplente |
| Decidir el tipo de datos afectados: Datos del Cliente, Datos de cuenta y operación o ambos (§1). Eso determina quién es responsable y qué avisos corren (§6) | R1 |
| Identificar las empresas afectadas (`id_empresa`) y, por categorías, el número aproximado de titulares y registros, sin copiar los datos al registro | Suplente (Alejandra) |
| Fijar la severidad (§2) y decidir si hay brecha. **Si no se puede descartar el acceso, se trata como brecha** | R1 |
| Obtener los destinatarios: propietario y administradores activos de cada empresa afectada, con la consulta de la [referencia P-3 §5](legal/referencia-p3-incidentes.md) | Comunica (Ivana) |

### 5.4 Erradicación

| Qué | Quién |
| --- | --- |
| Corregir la causa raíz en código o configuración, con prueba en Vitest si toca POS, presupuesto o autenticación. PR revisado y merge a `main` | Detecta, o la persona que R1 asigne |
| Comprobar que la vía quedó cerrada repitiendo el ataque o la condición en un entorno que no sea producción | Quien corrige |
| Si hubo credenciales de integraciones expuestas, pedir a los clientes que regeneren las suyas: son cuentas del cliente (referencia P-3 §7.4) | Comunica |

### 5.5 Recuperación

| Qué | Quién |
| --- | --- |
| Desplegar la corrección desde `main` con `./scripts/deploy.sh` y verificar `/api/health` y los flujos afectados | Detecta |
| Si hubo pérdida o corrupción de datos: restaurar desde respaldo **solo si existe uno verificado**. Hoy no existe (§4). Si se restaura, volver a aplicar las eliminaciones posteriores a la copia (L-4 §10.5) | Suplente, con aprobación de R1 |
| Vigilar durante 24 horas que la condición no se repite (logs, `df -h /`, `/api/health`) | Detecta |

### 5.6 Cierre

| Qué | Quién |
| --- | --- |
| Enviar el informe de cierre a cada destinatario de los avisos, dentro de 15 días naturales desde la contención (§6) | Comunica, con aprobación de R1 |
| Completar el registro y declarar el incidente cerrado | Documenta; R1 lo cierra |
| En severidad Alta, hacer la revisión posterior y llevar las acciones correctivas al backlog (§9) | Documenta |

## 6. Plazos de notificación

### 6.1 Plazos que adopta Kontrol

| Aviso | A quién | Plazo | Medio | Fuente |
| --- | --- | --- | --- | --- |
| **Aviso inicial por brecha de Datos del Cliente** | Cada empresa afectada: su propietario y sus administradores | **Sin dilación indebida y a más tardar en 48 h desde T0.** Si el aviso llega de un subencargado, desde que Kontrol lo recibe. Si a las 48 h no se sabe todo, se envía lo que se sepa y se completa por fases | Correo a las direcciones del propietario y los administradores registradas en Kontrol, con `support@kontrol.it.com` como contacto, y aviso dentro de la plataforma. Si el correo falla o el incidente lo afecta, teléfono del propietario si lo registró | L-4 §§8.1–8.3 |
| **Aviso inicial por brecha de Datos de cuenta y operación** | Cada usuario cuya cuenta o sesión se vio afectada | **Sin dilación indebida y a más tardar en 48 h desde T0**, con envío por fases | Correo a la dirección de la cuenta y aviso dentro de la plataforma | Decisión de este procedimiento (§6.2) |
| **Actualizaciones** | Los mismos destinatarios | Cada vez que haya información relevante y **al menos cada 72 h** hasta la contención | El mismo medio | L-4 §8.4 |
| **Informe de cierre** | Los mismos destinatarios | **Dentro de 15 días naturales desde la contención** | Correo | L-4 §8.4 |
| **Titulares de Datos del Cliente** | Clientes, proveedores y trabajadores del negocio | **No los avisa Kontrol.** Los decide y avisa el negocio, como responsable. Kontrol le entrega la información que necesite. Solo los contacta si el negocio lo pide por escrito o si la ley obliga directamente a Kontrol, y en ese caso informa antes al negocio si la ley lo permite | — | L-4 §§4.9, 8.6 |
| **Autoridad** | — | **No hay autoridad identificada ni obligación actual de notificar en Guatemala.** Las iniciativas de ley 6572 (art. 17, 72 h), 6103 y 6464 son contenido proyectado, no obligaciones vigentes | — | L-0 l. 43 |
| **Autoridad, condicional** | Autoridad de control competente | **Solo si se activa el RGPD** para un tratamiento concreto: el responsable notifica sin dilación indebida y, de ser posible, dentro de 72 h desde el conocimiento, salvo riesgo improbable. Para Datos del Cliente el responsable es el negocio; Kontrol, como encargado, cumple avisándole sin dilación, que es lo que hace el plazo de 48 h | — | L-0 l. 80; L-2 §10 |
| **Incidente originado en un proveedor sin acuerdo de tratamiento verificado** (UploadThing, Vercel) | Los mismos destinatarios | Los mismos plazos. Que el proveedor no avise no exime a Kontrol cuando lo detecte | Los mismos medios | Referencia P-3, R12; L-4 §7.7 |
| **Aviso de un cliente a Kontrol** de un acceso indebido o una credencial perdida | Kontrol, en `support@kontrol.it.com` | Tan pronto lo detecte y a más tardar en 48 h | Correo con el asunto «Incidente de seguridad» | L-4 §§4.8, 14.4 |

Las caídas sin brecha (severidad Media o Baja, o Alta solo por disponibilidad) no generan estos avisos. Se registran igual (§8).

### 6.2 Justificación

- **48 horas al cliente.** Es el plazo de L-4 §8.1. Su nota N3 lo justifica: deja margen al negocio si a él le aplica un plazo de 72 h ante la autoridad, como el del RGPD art. 33 que L-0 cita solo como referencia, y es compatible con los plazos de aviso de los subencargados (referencia P-3 §3).
- **48 horas a los usuarios por Datos de cuenta y operación.** Ningún documento fijaba un plazo para el caso en que Kontrol es responsable. Usar el mismo evita dos relojes distintos en un incidente que afecte a ambos tipos de datos, que es lo esperable: una cuenta comprometida suele exponer también los datos de su empresa.
- **Sin aviso a autoridad por defecto.** L-0 no identifica norma vigente ni autoridad. Inventar una obligación sería tan incoherente como omitir una que exista. Si cambia el marco, esta sección se revisa junto con L-0 (L-0 l. 82).
- **Por qué es cumplible.** Con T0 anotado en Jira, la consulta de contactos (§5.3) y la plantilla (§7), el aviso inicial depende de dos acciones: decidir que hay brecha y enviar. Lo que hoy impide cumplir completo el medio de L-4 §8.2 es el aviso dentro de la plataforma, que no existe (§4).

## 7. Plantilla de comunicación al cliente

Lista para copiar. Los corchetes se reemplazan; ninguna frase entre corchetes debe quedar en el envío. La redacta Comunica, la aprueba R1 y se envía desde `support@kontrol.it.com`.

**Asunto:** Kontrol · Aviso de incidente de seguridad · [INC-AAAA-NNN]

> Estimado/a [nombre]:
>
> Le escribimos como [propietario/a | administrador/a] del espacio de empresa «[empresa]» en Kontrol para informarle de un incidente de seguridad que [afecta | puede afectar] los datos de su negocio.
>
> **Qué pasó.** [Descripción breve y sin tecnicismos: qué falla o acceso hubo y desde cuándo, si se sabe]. Lo detectamos el [fecha] a las [hora] (hora de Guatemala).
>
> **Qué datos se vieron afectados.** [Categorías: por ejemplo, nombres y descripciones de tareas, archivos de evidencia y sus enlaces]. Afecta aproximadamente a [número] personas y [número] registros de su empresa. [Si aún no se sabe: «Todavía estamos determinando el alcance; se lo confirmaremos en la próxima actualización».]
>
> **Consecuencias probables.** [Por ejemplo: que una persona ajena a su empresa haya podido ver esas tareas y archivos].
>
> **Qué hicimos.** [Medidas, con fecha: por ejemplo, cerramos el acceso, cerramos las sesiones de la cuenta que lo usó, corregimos la falla].
>
> **Qué le recomendamos hacer.** [Acciones concretas: revisar las tareas y archivos indicados; pedir a sus usuarios que cambien su contraseña; regenerar las claves de las integraciones conectadas; avisarnos si nota actividad extraña].
>
> **Sus decisiones como responsable.** Como responsable de los datos de sus clientes, proveedores y trabajadores, a usted le corresponde decidir si debe informar a esas personas o a una autoridad. Le daremos la información que necesite para hacerlo. Si quiere que lo hagamos por su cuenta, pídalo por escrito respondiendo a este correo.
>
> **Próximos pasos.** Le enviaremos actualizaciones cada vez que sepamos algo relevante y, como mínimo, cada 72 horas hasta contener el incidente. Recibirá un informe de cierre dentro de los 15 días siguientes a la contención.
>
> Contacto: [nombre de quien comunica], `support@kontrol.it.com`, asunto «Incidente de seguridad · [INC-AAAA-NNN]».
>
> Equipo de Kontrol

**Variantes:**

- **Actualización.** Asunto con «Actualización [n]». Empieza con «Desde nuestro aviso del [fecha], ...» y solo incluye lo que cambió en cada apartado.
- **Informe de cierre.** Asunto con «Informe de cierre». Añade la fecha de contención, la causa raíz, la corrección aplicada y las medidas para que no se repita.
- **Usuarios por Datos de cuenta y operación.** Se dirige al usuario («su cuenta en Kontrol») y omite el apartado «Sus decisiones como responsable», porque ahí el responsable es Kontrol.

Cada envío se guarda como constancia (copia del correo enviado con fecha, hora y destinatarios) y se anota en el registro (§8).

## 8. Registro de incidentes

**Dónde:** Jira, proyecto SCRUM. Un ticket por incidente, con la etiqueta `incidente` y el título `INC-AAAA-NNN · <resumen>`, con numeración correlativa por año. No se usan issues de GitHub ni archivos del repositorio para esto: el repositorio es público y el registro describe vulnerabilidades y empresas afectadas.

**Campos** (referencia P-3 §4):

| Campo | Contenido |
| --- | --- |
| Identificador | `INC-AAAA-NNN` |
| T0 | Fecha y hora del conocimiento y cómo se supo: detección propia, cliente o proveedor |
| Descripción | Qué ocurrió, cuándo empezó si se sabe y cómo se detectó |
| Sistemas | PostgreSQL, MongoDB, UploadThing, servidor de aplicación, servidor IA, frontend o proveedor |
| Tipo de datos | Datos del Cliente, Datos de cuenta y operación o ambos (§1) |
| Empresas afectadas | `id_empresa` de cada una, o «todas» |
| Categorías y volumen | Categorías de datos y número aproximado de titulares y de registros |
| Consecuencias probables | Para los titulares y para los clientes |
| Medidas | Contención, corrección y prevención, con fecha |
| Avisos enviados | Por empresa: fecha y hora, medio, destinatarios y constancia |
| Actualizaciones | Fecha y resumen de cada una |
| Contención | Fecha y hora |
| Informe de cierre | Fecha de entrega y enlace al documento |
| Decisiones de los clientes | Si el cliente informó que comunicará a titulares o autoridades, y cuándo |

Este procedimiento añade dos campos: **severidad** (§2), con su historial de cambios, y **acciones correctivas**, con los tickets del backlog que salgan de la revisión posterior (§9).

**Reglas:**

- **Sin datos personales.** El registro no copia datos personales afectados: basta con categorías y volumen. La lista de destinatarios se usa para el aviso y no se adjunta; solo se anota quién la obtuvo y cuándo (referencia P-3 §5).
- **Conservación:** al menos 24 meses desde la contención (L-4 §8.5).
- **Filtrable por empresa.** Un cliente puede pedir el registro de los incidentes que afectaron a sus datos, y Kontrol lo entrega en 15 días hábiles (L-4 §11.1 e). Por eso cada ticket lleva los `id_empresa` afectados en un campo filtrable.
- **También las caídas.** Se registran aunque no sean incidentes de seguridad.

## 9. Análisis posterior sin culpables

**Compromiso:** después de cada incidente de severidad Alta, el equipo hace una revisión sin culpables. Se recomienda también en Media.

| Aspecto | Regla |
| --- | --- |
| Cuándo | Antes del informe de cierre, dentro de los 15 días naturales desde la contención, para que sus conclusiones entren en ese informe |
| Quién | Conduce Documenta (Jonathán); participan los cinco roles |
| Enfoque | Se analizan el sistema y el proceso, no a las personas. La pregunta es «qué permitió que pasara y qué lo habría detectado antes», nunca «quién se equivocó». Los nombres solo aparecen como roles |
| Contenido | Línea de tiempo desde T0 con cada hito; causa raíz y factores que contribuyeron; qué funcionó y qué no del procedimiento; plazos cumplidos o incumplidos, sin ajustar los tiempos para aparentar cumplimiento |
| Acciones correctivas | Cada una se crea como ticket en el backlog de Jira (SCRUM), enlazado al ticket del incidente, con prioridad según el inventario de deuda técnica (P1 si hay riesgo de pérdida de datos o caída). Si una acción corresponde a una deuda ya inventariada, se enlaza al `DT-NN` existente en lugar de duplicarla |
| Seguimiento | Las acciones abiertas se revisan en la siguiente planificación de sprint. La revisión también actualiza este procedimiento y las medidas de seguridad (L-4 §5.6) |

## 10. Escenario recorrido: acceso entre empresas a tareas y evidencias (simulacro)

> **Simulacro sobre un riesgo documentado.** No describe un incidente ocurrido: no hay registro de que este acceso se haya explotado. Los tiempos son relativos a T0 y sirven para comprobar que cada paso tiene responsable, insumos y plazo.

### Riesgo de partida

Las rutas de tareas y evidencias comprueban la sesión, pero no la empresa del recurso. Por eso el inventario de datos indica que no se puede afirmar el «aislamiento completo de tareas, asignaciones y adjuntos» ([inventario de datos §8](legal/inventario-datos.md)). L-4 lo recoge como condición previa A8, y el inventario de deuda técnica ya advertía de huecos de autorización equivalentes en módulos sin cobertura ([DT-05](deuda-tecnica.md)).

**Hipótesis del simulacro:** un cliente escribe a `support@kontrol.it.com` diciendo que, desde su cuenta, ve tareas y fotos de otra empresa.

### Recorrido

| Hito | Paso | Quién | Qué se hace | Resultado del recorrido |
| --- | --- | --- | --- | --- |
| **T0** | Detección | Comunica → Detecta y R1 | Llega el correo con asunto «Incidente de seguridad». Se avisa a Pablo y a Juan. T0 es la hora de recepción del correo | La detección depende de que el buzón se revise a diario (R2) |
| T0 + 15 min | Detección | Detecta | Reproduce el caso con dos cuentas de prueba de empresas distintas: la cuenta A consulta evidencias de una tarea de la empresa B y recibe datos. Abre `INC-2026-NNN` en Jira con T0 | Se reproduce en un entorno de pruebas con dos cuentas de empresas distintas |
| T0 + 30 min | Contención 1 | Detecta | Antes de tocar nada, copia los logs de `frontend` (accesos de nginx), `backend` y `postgres` fuera de los contenedores | **Paso crítico.** El siguiente despliegue recrea los contenedores y borraría los logs (§4) |
| T0 + 45 min | Contención 2 | Detecta, con aprobación de R1 | Si el reporte o los logs señalan una cuenta que accedió a datos ajenos: `token_version + 1` y `activo = false` en esa cuenta. Si se usó UploadThing, se valora rotar `JWT_SECRET` | Funciona para HTTP y Socket.IO (`requireAuth.js:32-38`, `socket/index.js:147-154`); no para UploadThing (§4) |
| T0 + 1 h | Evaluación | R1 | **Clasificación:** afecta Datos del Cliente (tareas y evidencias de negocios), así que Kontrol es encargado; no se puede descartar el acceso, así que se trata como brecha, **severidad Alta**. Corre el plazo de 48 h al cliente (§6) | La decisión se puede tomar con la §1 y la §2 sin información adicional |
| T0 + 2 h | Contención 3 | Detecta | Cambio mínimo: añadir a las rutas de tareas el control de empresa y de permiso de proyecto que ya usan otros módulos (`requireCompany`, `requireProjectPermission`), con la prueba de acceso cruzado (403). PR, merge a `main` y `./scripts/deploy.sh`. R1 declara la contención; Documenta anota la hora | El despliegue toma minutos (despliegue §5) y requiere acceso SSH a la VM |
| T0 + 2–8 h | Evaluación del alcance | Detecta y suplente | Se buscan en los accesos de nginx las peticiones a las rutas de tareas y evidencias cuyo proyecto no pertenezca a la empresa de quien las hizo. Se obtienen los `id_proyecto` y, de ahí, los `id_empresa` y el número de tareas y evidencias expuestas | **Límite real:** nginx registra IP y ruta, pero no la cuenta. Además, los logs solo cubren desde el último despliegue, porque se pierden al recrear (§4). Lo anterior no se puede reconstruir: R1 tiene que decidir si se avisa solo a las empresas con accesos comprobados o a todas las que tenían tareas antes de esa fecha |
| T0 + 8 h | Evaluación del alcance | Comunica | Ejecuta la consulta de contactos de la referencia P-3 §5 con los `id_empresa` afectados. Obtiene el propietario y los administradores activos | Insumo disponible y probado contra el esquema actual |
| **≤ T0 + 48 h** | Notificación | Comunica, con aprobación de R1 | Envía la plantilla de la §7 a cada empresa afectada. Si el alcance no está cerrado, lo dice («Todavía estamos determinando el alcance»). Guarda las constancias en el registro | El correo es cumplible. **El aviso dentro de la plataforma no**, porque no existe (§4) |
| Cada ≤ 72 h | Seguimiento | Comunica | Actualización con lo que cambió hasta el cierre del alcance | — |
| T0 + días | Erradicación | Persona asignada por R1 | Revisión del resto de rutas que reciben identificadores de otro recurso, con pruebas de acceso cruzado por endpoint | Coincide con la condición A8 de L-4 |
| T0 + días | Recuperación | Detecta | Verificación en producción: la cuenta A recibe 403 sobre los proyectos de B. No hay datos que restaurar: hubo exposición, no pérdida | — |
| ≤ contención + 15 días | Cierre | Documenta y Comunica | Revisión sin culpables (§9) e informe de cierre a las mismas empresas | — |

### Lo que el recorrido comprobó

**Los pasos son ejecutables con lo que existe:** la clasificación, la reproducción, la revocación por cuenta, la corrección y el despliegue, la consulta de destinatarios, la plantilla y el registro en Jira.

**Puntos que el recorrido deja al descubierto.** Se llevan al backlog como acciones correctivas del simulacro:

1. **Sin registro de accesos por cuenta ni conservación de logs**, el alcance de una brecha solo se puede reconstruir desde el último despliegue y sin identificar al usuario. Es la limitación que más afecta a la calidad del aviso. Relacionado con DT-21 (rotación y conservación de logs).
2. **No existe aviso dentro de la plataforma** (R7), que L-4 §8.2 exige junto con el correo.
3. **Revocación incompleta en UploadThing:** cortar una sesión ahí obliga a rotar `JWT_SECRET` para todos.

## 11. Escenario corto: VM sin espacio (disponibilidad)

Hechos documentados:

- **26/09/2026:** durante la preparación de las pruebas con ZAP, el build falló por `ENOSPC` con 198 MB libres de 8.6 GB. Se liberaron 2.2 GB de caché de build y el disco quedó en 89 % tras el despliegue ([ZAP §2.1 y §6](pruebas-seguridad-zap.md)).
- **01/10/2026:** el disco llegó al 100 % y el build volvió a fallar. Se limpiaron la caché de build, los snaps viejos y el journal, y se dieron de baja los contenedores e imágenes de pruebas ([despliegue §4](despliegue-produccion.md)).
- **14/10/2026:** 77 % de uso, 2.0 GB libres.

El Postgres de producción escribe en ese mismo disco (DT-21).

Cómo lo trata este procedimiento:

| Paso | Qué se hace | Quién |
| --- | --- | --- |
| Detección | En los dos casos se detectó porque falló un build, no por una alerta: no la hay (§4). T0 es la hora del fallo | Detecta |
| Clasificación | **Alta** por riesgo inminente de pérdida o corrupción de datos productivos (§2): Postgres sin espacio para escribir. No es incidente de seguridad, así que no hay avisos de brecha (§6.1) | R1 |
| Contención | Antes de borrar nada, `df -h /` y `docker system df` anotados en el registro; después, `docker builder prune -f`, limpiar el journal y retirar las imágenes que no usa producción (despliegue §5). No se tocan volúmenes | Detecta |
| Evaluación | Verificar que Postgres sigue aceptando escrituras y que `/api/health` responde | Detecta |
| Erradicación | Rotación de logs (`max-size`), disco más grande y alerta de espacio (DT-21, riesgo 1 del despliegue) | Persona asignada por R1 |
| Cierre | Registro en Jira y revisión sin culpables por ser Alta. Acción correctiva principal: la alerta de disco, porque sin ella la detección vuelve a depender de un build fallido | Documenta |

## 12. Ensayos y mantenimiento

- **Ensayo completo:** se realiza antes de que L-4 entre en vigencia y luego cada 12 meses, con acta de los tiempos reales desde T0 a cada hito (referencia P-3, R11). El escenario de la §10 sirve de guion.
- **Revisión** de este documento después de cada incidente de severidad Alta, cuando cambie un rol o un acceso de la §3, cuando cambie lo que existe hoy según la §4 o cuando cambie el marco legal (L-0 l. 82).
- **Plazos:** cualquier cambio a los plazos de la §6 se hace a la vez en L-2 y L-4.

## 13. Coherencia con L-2 y L-4

**Plazo que adopta este procedimiento:** aviso sin dilación indebida y a más tardar en 48 h desde el conocimiento, con envío por fases, actualizaciones al menos cada 72 h, informe de cierre en 15 días naturales desde la contención y registro conservado 24 meses. Se aplica a los Datos del Cliente (aviso al negocio) y a los Datos de cuenta y operación (aviso al usuario).

**Coincide con L-4** en el plazo, el medio, el contenido y el seguimiento (§§8.1–8.5); en que el negocio decide las comunicaciones a titulares y autoridades (§8.6); en el canal de entrada (§14.4); y en el registro y sus campos (referencia P-3 §4).

**Diferencias con otros documentos:**

| Documento | Situación | Qué debería decir para quedar alineado |
| --- | --- | --- |
| L-2, §10 | Indica que no hay plazo voluntario comprometido ni canal operativo, y no fija plazo de aviso al titular para los Datos de cuenta y operación | Recoger el plazo de 48 h, el envío por fases y el canal `support@kontrol.it.com` de este procedimiento, y el estado de P-3 |
| L-4, Anexo A.2 | Lista a Supabase como subencargado de la base PostgreSQL. Según el despliegue verificado el 14/10/2026, el PostgreSQL de producción es un contenedor en la VM de Google Cloud, y Supabase alojaba solo la base del ambiente de pruebas, ya retirado | Confirmar el proveedor dentro de la condición A4 y ajustar el anexo y la tabla de plazos de proveedores de la referencia P-3 §3 |
| Referencia P-3, §7.3, y adenda, nota N2 | Indican que la revocación por `token_version` de P-1 no está integrada en `develop`. Ya lo está: `requireAuth` y Socket.IO la verifican | Que la revocación por `token_version` ya está en `develop` para HTTP y Socket.IO, y no aplica a la subida de archivos (§4) |
| Índice de `docs/legal/README.md`, matriz de bloqueos | En la versión que acompaña a L-4 falta la fila O11 y la fila O12 aparece dos veces, una con el texto anterior y otra con el nuevo | Restaurar O11 y dejar una sola O12 |
| Índice legal, fila O07, y referencia P-3 §9 | P-3 figura como no iniciado | Enlazar este procedimiento y registrar la evidencia del ensayo cuando se haga |

## 14. Correspondencia con los requisitos de la referencia P-3

| Req. | Dónde se atiende | Estado |
| --- | --- | --- |
| R1 · responsable y suplente | §3 | Definido |
| R2 · canal de entrada | §§4, 6.1 | Definido |
| R3 · avisos de proveedores | §5.1 | No disponible hoy |
| R4 · registro | §8 | Definido en Jira |
| R5 · contactos de empresas | §5.3 | Consulta disponible |
| R6 · aviso en 48 h | §§6, 7 | Definido |
| R7 · aviso en la plataforma | §4 | No disponible hoy |
| R8 · actualizaciones y cierre | §§6, 5.6 | Definido |
| R9 · contención y evidencia | §5.2 | Definido |
| R10 · no comunicar por el cliente | §6.1 | Definido |
| R11 · ensayo | §12 | Definido |
| R12 · proveedores sin acuerdo | §6.1 | Definido |

| Historial | Cambio |
| --- | --- |
| 27-10-2026 · 1.0 | Primera versión (SCRUM-91, P-3) |
