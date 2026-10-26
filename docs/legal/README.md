# Documentación legal de Kontrol

**Corte: 16 de octubre de 2026 · referencia de código HEAD `3a004d9`.**

**CERRADA la investigación y decisión del marco legal, con reservas documentales. Los Términos y Condiciones y la Política de Privacidad son borradores internos versión 0.1: NO VIGENTES, pendientes de aprobación y publicación.** Este expediente no certifica cumplimiento integral, no verifica de forma exhaustiva la vigencia legislativa y no autoriza lanzamiento. Requiere revisión profesional en Guatemala antes de uso comercial.

## Actualización del 17 de octubre de 2026: publicación y aceptación

El equipo decidió publicar en la vista `/legal` una **versión 1.0 resumida** de los Términos y Condiciones, el Aviso de Privacidad y la política de cookies y almacenamiento. Los textos viven en `frontend/src/locales` (`legal.*`) y siguen los borradores 0.1 de esta carpeta, que se conservan como expediente interno.

| Bloqueo | Qué cambia | Qué sigue pendiente |
| --- | --- | --- |
| O01 · Contacto | Canal legal, de privacidad y reclamos: `support@kontrol.it.com`, publicado en `/legal#contact`. | El buzón debe configurarse y probarse antes de desplegar. Integrantes, NIT y domicilio siguen PENDIENTES. |
| O04 · Aceptación | Aviso bloqueante (`LegalConsentModal.vue`) la primera vez que un usuario entra con sesión: casilla con enlace a los Términos y botón Aceptar. Sin aceptar no se usa la plataforma. | **Decisión del equipo: la aceptación se guarda solo en el navegador** (versión y usuarios en `localStorage`), sin registro en el servidor. No hay prueba recuperable de quién aceptó ni cuándo; borrar los datos del navegador o cambiar de equipo vuelve a pedirla. |
| O13 · Cambios | Subir `LEGAL_VERSION` en `frontend/src/utils/legal.js` vuelve a pedir la aceptación a todos los usuarios. | Revisión profesional y resto de bloqueos de la matriz. |

## Índice y estado de los entregables

| Entregable | Documento local | Estado y límite |
| --- | --- | --- |
| Marco legal | [Marco legal de Kontrol en Guatemala](marco-legal.md) | 1.0, definitivo de investigación/decisión con reservas. Selección del estándar y límites, no habilitación operativa. |
| Términos y Condiciones | [Borrador de términos](terminos-condiciones.md) | 0.2 BORRADOR (26-10-2026: remisión a la adenda de tratamiento). Entrada en vigencia PENDIENTE DE APROBACIÓN Y PUBLICACIÓN. |
| Política de Privacidad | [Borrador de privacidad](politica-privacidad.md) | 0.1 BORRADOR. Entrada en vigencia PENDIENTE DE APROBACIÓN Y PUBLICACIÓN. |
| Anexo técnico de datos | [Inventario de datos](inventario-datos.md) | Cierre estático: nueve secciones, 38 tablas/278 columnas PostgreSQL, cuatro modelos/56 rutas de campo Mongo. No auditoría de producción. |
| Anexo de terceros | [Proveedores y destinatarios](anexo-proveedores.md) | Revisión documental, con cuentas/contratos/regiones pendientes. No todos los DPA fueron accesibles ni se verificaron las aceptaciones. |
| Licencia propia | [Decisión de licencia](licencia.md) | 17-10-2026. Software propietario, todos los derechos reservados por los integrantes del equipo (no la UVG). Pendientes: nombres de los titulares y acuerdo entre integrantes. |
| Licencias de terceros | [Auditoría](licencias/README.md) e [inventario](licencias/inventario.md) | 17-10-2026, generado con CycloneDX sobre el lockfile posterior a DT-08. Sin copyleft fuerte; atribuciones en `frontend/public/THIRD-PARTY-NOTICES.txt`. |
| Informe ejecutivo | [Resumen del expediente](../../reports/Marco%20legal%20de%20Kontrol.md) | Remite a los entregables; no duplica el marco legal ni la investigación. |
| Adenda de tratamiento de datos | [Adenda](adenda-tratamiento-datos.md) | 0.1 BORRADOR, 26-10-2026 (L-4). Incorporable por referencia a los Términos o firmable aparte. NO VIGENTE: condiciones previas A1–A11 en su nota interna N4. |
| Cookies | Cookies y almacenamiento | PENDIENTES. Sin enlace a archivos inexistentes. |
| Avisos específicos | Avisos específicos del asistente IA y del alcance fiscal del POS | PENDIENTES como entregables separados; Términos y Condiciones y Política de Privacidad describen sus limitaciones actuales. |

Fuentes de investigación: [Guatemala](../../research_notes/Marco%20legal%20de%20Kontrol/guatemala.md), [extraterritorialidad](../../research_notes/Marco%20legal%20de%20Kontrol/extraterritorialidad.md), [proveedores](../../research_notes/Marco%20legal%20de%20Kontrol/proveedores.md) y [notas técnicas](../../research_notes/Marco%20legal%20de%20Kontrol/inventario.md). El inventario cerrado prevalece sobre el avance resumido de sus notas para flujos/logs/storage. Las consultas jurídicas/contractuales citadas son las documentadas el 16-10-2026; no se amplió investigación web.

## Decisiones confirmadas y cambios de alcance

El prestador sigue siendo un equipo sin entidad jurídica constituida: integrantes, identificación/NIT, domicilio y contacto legal/privacidad **PENDIENTES**. No hay correo operativo acreditado. Kontrol es una herramienta privada de control y registro, independiente de SAT y de instituciones de reporte financiero/tributario; el POS y su IVA configurado no sustituyen declaraciones o FEL. Los textos preservan las responsabilidades propias del equipo y las del usuario, sin exoneración absoluta [Marco legal N3–N5 y N9, consultas 16-10-2026].

Frente al planteamiento original del ticket, la instrucción del usuario sustituye la pasarela prevista por **Stripe solo DEMOSTRACIÓN TEST, sin integración observada ni cobros reales**. Su implementación está en otra tarea. No se trasladaron planes/precios, renovación, cancelación de cargos o reembolsos comerciales ficticios. Se preservan derechos ante un eventual cobro indebido. Un cobro futuro exige condiciones, información y aceptación previas; no conversión automática del acceso gratuito [Términos y Condiciones §§5 y 14; Marco legal N3/N5].

P1 —exportación/supresión—, P2 —respaldos/restauración— y P3 —brechas— siguen **PENDIENTES SIN FECHA** por decisión expresa del usuario, no «completados» mediante los documentos. No se inventaron plazos, responsables personales, direcciones ni un procedimiento manual operativo. Una obligación legal aplicable no se suspende por esa anotación [Marco legal, cierre; Política de Privacidad §§6 y 10].

El equipo confirma Qwen/vLLM mediante ClawStitch como operación propia. **Servidor IA en Guatemala: declaración directa del equipo del 16-10-2026, sin verificación independiente.** Hosting (alojamiento), operadores, accesos, logs (registros técnicos), retención/copias siguen pendientes. No significa que todo tratamiento permanezca en Guatemala; los demás proveedores mantienen las reservas geográficas del anexo. No se atribuye intervención a OpenAI por compatibilidad API.

El marco legal se cerró como investigación y decisión antes de redactar Términos y Condiciones y Política de Privacidad sobre el inventario técnico. El expediente se conserva como documentación del repositorio; la publicación de los textos sigue pendiente.

## Checklist de aceptación documental trazable

**[x] significa criterio satisfecho en los documentos; no mecanismo implementado ni permiso de publicación.** Los pendientes operativos se mantienen en la matriz siguiente.

| ID | Criterio | Estado documental y evidencia |
| --- | --- | --- |
| C01 | Marco legal guardado antes de los borradores, cierre limitado | [x] [Marco legal, encabezado/cierre](marco-legal.md); reservas y bloqueos conservados. |
| C02 | Norma/artículos/ámbito/consecuencia/fuente-fecha | [x] Marco legal N1–N9; diferencia Constitución/LAIP condicionada de base civil privada y consumo condicionado. |
| C03 | Consumo: información, copia, reclamos, reparación y límites irrenunciables | [x] Marco legal N5 y párrafo de precisión; [Términos y Condiciones §15](terminos-condiciones.md). No se presume inaplicabilidad por gratis/TEST. |
| C04 | Estado legislativo e iniciativas | PARCIAL: Marco legal I1–I5 documenta hitos y contenido recuperado; quedan pendientes la verificación exhaustiva de vigencia y la lectura íntegra de algunos proyectos. DCA 403 y textos parciales no prueban inexistencia de ley. |
| C05 | Estándar razonado, costes y origen de secciones | [x] Marco legal opciones A/B/C y matriz obligatoria/condicional/voluntaria. Opción B decidida, ejecución pendiente; sin certificación RGPD. |
| C06 | Extraterritorialidad y obligaciones contractuales | PARCIAL: Marco legal E1–E4 y anexo separan alcance legal y contratos; cuentas, acuerdos/DPA no accesibles y regiones requieren comprobación. No basta el servidor, ni un DPA es legislación. |
| C07 | Identidad auténtica, versión, vigencia y revisión profesional | PARCIAL: encabezados y §1 de Términos y Condiciones y Política de Privacidad identifican versión 0.1 BORRADOR, elaboración 16-10-2026 y revisión requerida. Identidad/contacto y fecha de vigencia siguen PENDIENTES. |
| C08 | Alcance del servicio, POS, responsabilidad y capacidad | [x] Términos y Condiciones §§2–4, 6–7, 11–15: independencia SAT; tributos del usuario; permisos/invitaciones; mantenimientos sin SLA/preaviso operativo; sin límite cero o exoneración propia. |
| C09 | Cobros reales inexistentes y Stripe solo previsto TEST | [x] Términos y Condiciones §5; Política de Privacidad §4; anexo. Datos sintéticos, no tarjetas/identidades reales; futuro cobro nunca automático. |
| C10 | IA: flujo y país con fuente/límite correctos | [x] Marco legal cierre; Términos y Condiciones §8; Política de Privacidad §§4–5: correo/contexto, historial/muestras y excepciones locales; Guatemala declarado; logs/copias/hosting sin verificar; sin garantía de no entrenamiento. |
| C11 | Licencia limitada y reparto de roles por tratamiento | [x] Términos y Condiciones §§9–10; Política de Privacidad §§1 y 3: sin venta/perpetuidad/entrenamiento en la licencia; datos ajenos requieren fundamento, BYOK no presume subencargo. Roles por tratamiento concretados en la [adenda de tratamiento](adenda-tratamiento-datos.md), borrador 0.1 no vigente. |
| C12 | Privacidad basada en inventario completo | [x] Política de Privacidad §§2–5: categorías, origen/usos y destinatarios; coordenadas solo como declaración de esquema, sin captura/carga o geolocalización automática acreditadas. |
| C13 | Retención actual y derechos sin procesos ficticios | [x] Política de Privacidad §§6–7: implementado/parcial/pendiente SIN FECHA; sin TTL/plazos definidos donde faltan; CSV/bajas/borrados parciales diferenciados de P1. |
| C14 | Seguridad, cookies y brechas con límites | [x] Política de Privacidad §§8–10: hash frente a cifrado, configuración frente a producción, hallazgos internos sin secretos, cookies no auditadas, P3 pendiente; RGPD 72 h/riesgo/rol condicionado. |
| C15 | Versiones, cambios de marco y aceptación no presumida | [x] Marco legal cierre; Términos y Condiciones §§3 y 14; Política de Privacidad §11/historial: aviso, versión y reaceptación pendientes; uso continuado no prueba incondicional. |
| C16 | Anexos, pendientes sin enlaces rotos e informe breve | [x] Índice e informe ejecutivo; entregables pendientes no se presentan como documentos terminados. |

## Matriz de bloqueos de publicación y evidencia de cierre

**Todos los renglones siguientes siguen pendientes, sin fecha comprometida.** Los responsables son perfiles sugeridos para que el equipo los designe, no personas ya asignadas. Son criterios operativos de este expediente; no una lista exhaustiva de obligaciones legales. El marco legal explica sus fuentes y condiciones.

| ID | Bloqueo / estado | Evidencia necesaria para resolverlo | Responsable sugerido |
| --- | --- | --- | --- |
| O01 | Identidad y contacto: PENDIENTE | Integrantes que contratan, facultades, identificación/NIT, domicilio; canal real de legal/privacidad/reclamos habilitado y probado; textos completos. | Coordinación del equipo y asesoría jurídica Guatemala |
| O02 | Vigencia y alcance jurídico: CON RESERVAS | Comprobar publicación oficial, reformas, entrada en vigor/transitorios; evaluar consumo/DIACO y, según hechos, LAIP/leyes extranjeras. DCA inaccesible no prueba ausencia de ley. | Asesoría jurídica Guatemala |
| O03 | Cuentas, países y contratos: PENDIENTE | Titular/contraparte, servicio/proyecto/tenant, versiones aceptadas, DPA/acuerdos aplicables, regiones de datos/copias/soporte y cadena real. Resolver UploadThing §5, DPA inaccesibles/no localizados, Teams, Meta y formalización Slack según anexo. | Administración de proveedores, infraestructura y asesoría |
| O04 | Prueba de aceptación y consentimiento: PENDIENTE | Texto íntegro recuperable, acción afirmativa, cuenta/versión/momento, integridad y prueba; separar contrato, entrega del aviso y consentimientos; probar retirada y reaceptación cuando proceda. No recoger IP/DPI por defecto sin justificación. | Producto, backend/frontend y asesoría |
| O05 | P1: PARCIAL, circuito integral PENDIENTE | Canal real; verificar identidad/facultades; acceso/corrección/exportación/supresión por PostgreSQL, Mongo, objetos, IA, logs y copias/destinatarios; excepciones justificadas y pruebas sin mezclar negocios. | Backend/datos y función de privacidad por designar |
| O06 | P2: PENDIENTE | Plan de copias con alcance, almacenamiento, acceso, retención/purga y restauración probada; relación con bajas y solicitudes. Sin RPO/RTO prometidos mientras no se definan y prueben. | Infraestructura y backend/datos |
| O07 | P3: PENDIENTE | Responsables/contactos, detección, contención, evaluación por rol/riesgo, registro de conocimiento/decisión, preservación y comunicación; recepción de avisos de proveedores y ensayo. Plazos según ley/contrato realmente aplicable. | Seguridad, infraestructura y asesoría |
| O08 | Aislamiento y revocación: DEFECTOS DOCUMENTADOS, corrección pendiente | Corregir/verificar pertenencia de tareas/evidencias/subidas, ámbito de accesos IA, controles globales y revocación de tokens/sockets según inventario §8; pruebas por empresa/proyecto/rol y contraste del despliegue. | Backend y revisión de seguridad |
| O09 | Conservación, logs y entorno: PENDIENTE | Fines/plazos por categoría; purgas, objetos huérfanos, redacción de logs y evidencias; esquema/índices/constraints reales, separación test/producción y TLS/cifrado efectivos. | Datos, infraestructura y seguridad |
| O10 | Infraestructura IA: DECLARACIÓN DE PAÍS RECIBIDA, resto pendiente | Conservar declaración Guatemala y verificar alcance del servidor; proveedor/contrato de hosting, operadores, accesos, retención/logs/copias; modelo/pesos/licencia y límites de uso/instrucciones. No generalizar a residencia de todos los datos. | Operación IA, infraestructura y asesoría |
| O11 | Almacenamiento del navegador y cookies: PENDIENTE | Inspeccionar cookies/tráfico/storage real y terceros; definir información, controles y consentimientos que procedan; revisar preferencias que sobreviven logout y cargas externas. | Frontend, privacidad y asesoría |
| O12 | Acuerdo de tratamiento: BORRADOR 0.1 (L-4); avisos específicos: PENDIENTES | Cumplir las condiciones previas A1–A11 de la [adenda](adenda-tratamiento-datos.md#n4-condiciones-previas-a-la-vigencia), confirmar sus plazos (nota N3), revisión profesional y remisión en los Términos publicados; determinar/revisar los avisos específicos sin presumirlos terminados. | Coordinación y asesoría |
| O13 | Aprobación/publicación y cambios: PENDIENTE | Revisión profesional, resolución de bloqueos, aprobación de versión y mecanismos de aviso/aceptación; publicación efectiva y fecha real entonces documentada. Lanzamiento requiere decisión posterior separada. | Coordinación del equipo y asesoría |

Una nueva norma o cambio de mercado/producto exige volver a contrastar inventario, bases, derechos, retención, contratos/DPA, transferencias, incidentes y consentimiento. Las medidas adoptadas y los compromisos publicados deberán poder ejecutarse: la redacción de una política no completa P1/P2/P3 ni corrige defectos [Marco legal, decisión y cierre].

**Resultado de esta entrega: expediente documental integrado, investigación/decisión cerradas con reservas; operación, publicación y vigencia de Términos y Condiciones y Política de Privacidad continúan pendientes.**
