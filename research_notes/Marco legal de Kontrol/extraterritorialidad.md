# Extraterritorialidad y estándares proporcionales para Kontrol

Fecha de consulta y corte: **2026-10-16, Guatemala**. Estado: investigación cerrada con evidencia suficiente para este alcance; comparación y propuestas documentadas. No equivale a auditoría ni a implementación.

Alcance: aplicación territorial de normas extranjeras y comparación de tres alternativas. No se reproduce la investigación de derecho guatemalteco ni se investigan proveedores. Los datos del producto son premisas del encargo, no resultados de una auditoría técnica.

Premisas: público guatemalteco; herramienta privada de proyectos, inventario y POS de registro, independiente de SAT; prestador constituido por un equipo sin entidad legal identificada, con identidad y contacto pendientes. IA Qwen operada por el equipo mediante vLLM y endpoint ClawStitch. Stripe exclusivamente TEST de demostración, sin cobros reales ni planes o precios reales; su implementación corresponde a otra tarea. P1 exportación/borrado, P2 respaldos y P3 respuesta a brechas están pendientes y sin fecha.

## ¿Cuándo podría alcanzar a Kontrol el RGPD europeo?

### Takeaway

El público guatemalteco y el uso de servicios extranjeros no bastan para afirmar aplicación o exclusión. Debe evaluarse cada tratamiento: establecimiento, oferta dirigida a personas en la Unión o seguimiento de su comportamiento allí. Adoptar principios voluntarios tampoco demuestra cumplimiento integral.

### Cited Findings

- **Establecimiento y orientación.** El art. 3.1 comprende tratamientos vinculados a un establecimiento en la Unión; el art. 3.2 contempla oferta, aun gratuita, y observación del comportamiento en la Unión. Los considerandos 23 y 24 desarrollan estos criterios. Fuente: [RGPD, arts. 3.1–3.3 y considerandos 23–24, publicación oficial BOE/DOUE](https://www.boe.es/buscar/doc.php?id=DOUE-L-2016-80807). Consulta: 2026-10-16.
- **Accesibilidad no equivale a orientación.** El EDPB distingue mera disponibilidad del sitio de indicios de oferta dirigida; también distingue recogida de datos de seguimiento con finalidad conductual. La nacionalidad europea no es el criterio territorial del art. 3.2. Fuente: [EDPB, Directrices 3/2018, versión 2.1, apartados 2.a–2.c, pp. 14–20](https://www.edpb.europa.eu/sites/default/files/files/file1/edpb_guidelines_3_2018_territorial_scope_after_public_consultation_en_1.pdf). Consulta: 2026-10-16.
- **Proveedor europeo.** Un responsable externo no queda sometido automáticamente por contratar a un encargado establecido en la Unión. Deben evaluarse por separado sus tratamientos y roles. Fuente: [EDPB, Directrices 3/2018, apartado 1.d.ii, ejemplo 7, pp. 11–13](https://www.edpb.europa.eu/sites/default/files/files/file1/edpb_guidelines_3_2018_territorial_scope_after_public_consultation_en_1.pdf). Consulta: 2026-10-16.
- **Responsable y encargado.** Responsable es quien determina fines y medios; encargado trata por cuenta de aquel. El contrato debe concretar instrucciones, confidencialidad, seguridad, asistencia y subencargos. Fuente: [Comisión Europea, «Application of the GDPR», apartados sobre roles y contratación; RGPD arts. 4.7–4.8 y 28](https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/application-gdpr_en). Consulta: 2026-10-16.
- **Representante.** Si se activa el art. 3.2, el art. 27 exige representante escrito, salvo sus excepciones: el tratamiento ocasional de bajo riesgo y sin tratamiento a gran escala de las categorías indicadas requiere cumplir conjuntamente las condiciones; ser pequeño no es una excepción autónoma. Fuente: [RGPD, art. 27.1–27.2](https://www.boe.es/buscar/doc.php?id=DOUE-L-2016-80807). Consulta: 2026-10-16.
- **Seguridad.** El art. 32 exige medidas proporcionadas al riesgo y considera costes, restauración y comprobación de eficacia; no prescribe seguridad absoluta. Fuente: [RGPD, art. 32.1–32.2](https://www.boe.es/buscar/doc.php?id=DOUE-L-2016-80807). Consulta: 2026-10-16.
- **Transferencias.** El art. 44 pertenece al régimen de transferencias, no sustituye al art. 3. El EDPB exige distinguir exportador sujeto, comunicación a otro actor e importador en tercer país. Fuente: [EDPB, Directrices 05/2021, versión 2.0 de 14-02-2023, resumen y apartados 2.1–2.3; RGPD art. 44](https://www.edpb.europa.eu/system/files/2023-02/edpb_guidelines_05-2021_interplay_between_the_application_of_art3-chapter_v_of_the_gdpr_v2_en_0.pdf). Consulta: 2026-10-16.

### Inferences

- Con las premisas disponibles no está acreditado un supuesto de aplicación directa del RGPD a Kontrol; tampoco se certifica su exclusión. Cambiarían la evaluación campañas dirigidas a España, actividad estable en la Unión o perfiles de comportamiento de personas allí. El español usado para Guatemala, por sí solo, no demuestra orientación europea. Fundamento: [EDPB, Directrices 3/2018, apartados 1 y 2](https://www.edpb.europa.eu/sites/default/files/files/file1/edpb_guidelines_3_2018_territorial_scope_after_public_consultation_en_1.pdf), consulta 2026-10-16.
- Mapa de roles propuesto, pendiente de confirmar: equipo responsable de cuentas y seguridad que decide; comercio responsable de sus datos de clientes y trabajadores; equipo posiblemente encargado cuando solo sigue instrucciones de aquel. No asignar un único rol a toda la plataforma. Fundamento: [Comisión Europea, roles; arts. 4.7–4.8 y 28](https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/application-gdpr_en), consulta 2026-10-16.
- La ubicación del proveedor y la compatibilidad de una API no identifican por sí mismas el régimen de Kontrol. Qwen/vLLM/ClawStitch es la arquitectura comunicada por el usuario; compatibilidad con una API de OpenAI no acredita intervención de OpenAI. No se ha investigado la cadena de proveedores.

### Gaps

- No se han auditado establecimientos, orientación comercial, analítica, ubicación de usuarios, flujos de datos, contratos ni finalidades efectivas. No afirmar «no aplica nunca» ni «cumple RGPD».
- Debe analizarse también el servicio prestado a un cliente cuyo tratamiento esté sujeto: el EDPB distingue las obligaciones contractuales del encargado externo y los tratamientos de este relacionados con orientación o seguimiento del responsable. No basta mirar el país del cliente ni el del servidor. Fuente: [Directrices 3/2018, apartados 1.d.i y 2.d, pp. 11 y 20–22; arts. 3 y 28](https://www.edpb.europa.eu/sites/default/files/files/file1/edpb_guidelines_3_2018_territorial_scope_after_public_consultation_en_1.pdf), consulta 2026-10-16.
- EUR-Lex devolvió una comprobación de JavaScript. El articulado europeo se contrastó con la publicación oficial BOE/DOUE; las interpretaciones se apoyan en guías definitivas del EDPB, no en sus borradores.

## ¿Se aplican automáticamente UK GDPR, LGPD o CCPA?

### Takeaway

Son pruebas distintas. No hay una regla general según la cual usar tecnología extranjera active todas estas leyes.

### Cited Findings

- **Reino Unido.** UK GDPR art. 3 contempla establecimiento británico y, para actores externos, oferta a personas en Reino Unido o seguimiento de comportamiento allí; el pago no es requisito. Fuente: [UK GDPR, art. 3, texto oficial con modificaciones](https://www.legislation.gov.uk/eur/2016/679/article/3/data.html). Consulta: 2026-10-16. La guía del regulador advierte que está en revisión por el Data (Use and Access) Act; no debe tratarse como una consolidación definitiva de esas reformas: [aviso y apartado «Who does the UK GDPR apply to?»](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/personal-information-what-is-it/who-does-the-uk-gdpr-apply-to/), consulta 2026-10-16.
- **Brasil.** LGPD art. 3.I–III incluye tratamiento realizado en Brasil; actividad con objetivo de ofrecer/proveer bienes o servicios o tratar datos de individuos allí; o datos recogidos en Brasil. El §1 atiende a la ubicación de la persona al recogerlos, independientemente de sede o ubicación de los datos. Fuente: [Lei 13.709, art. 3 y §1, texto compilado oficial](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm). Consulta: 2026-10-16.
- **California.** La definición ordinaria de business exige actividad con finalidad de lucro/beneficio, determinación de fines y medios y negocios en California, además de uno de estos umbrales: ingresos brutos anuales superiores al monto ajustado; comprar, vender o compartir anualmente información de al menos 100,000 consumidores u hogares; o al menos 50 % de ingresos por vender o compartir esa información. Fuente: [CCPA, Civil Code §1798.140(d)(1)(A)–(C), pp. 20–21 del PDF](https://cppa.ca.gov/pdf/20260101_ccpa_statute.pdf). Consulta: 2026-10-16.
- **Monto vigente consultado.** El umbral de ingresos ajustado es **USD 26,625,000**, efectivo desde 01-01-2025; la agencia explica el ajuste cada año impar. No usar únicamente el monto base de USD 25 millones. Fuente: [CPPA, tabla §1798.140(d)(1)(A) y mecanismo §1798.199.95(d)](https://cppa.ca.gov/regulations/cpi_adjustment.html). Consulta: 2026-10-16.
- **Otros supuestos CCPA.** Existen inclusión por determinadas relaciones empresariales y adhesión voluntaria formal; para proveedores/contratistas de un business deben revisarse reglas y contrato específicos. Fuente: [CCPA, §§1798.140(d)(2)–(4), 1798.140(ag) y 1798.100(d)](https://cppa.ca.gov/pdf/20260101_ccpa_statute.pdf). Consulta: 2026-10-16.

### Inferences

- No se acredita con el encargo un supuesto UK GDPR, LGPD o CCPA. Brasil requiere especial cautela: su art. 3 no debe reducirse a la prueba europea de publicidad dirigida. CCPA tampoco equivale a «100,000 visitas» o «100,000 registros almacenados». Referencias: [LGPD art. 3](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm) y [CCPA §1798.140(d)](https://cppa.ca.gov/pdf/20260101_ccpa_statute.pdf), consulta 2026-10-16.

### Gaps

- Faltan datos comprobados de mercados, ubicación al recoger datos, ingresos, operaciones de venta/compartición y relaciones con clientes sujetos. Stripe TEST no demuestra por sí solo ausencia de finalidad económica ni exención territorial.

## ¿Qué alternativa conviene y qué trabajo cuesta?

### Takeaway

Recomendación provisional: base guatemalteca aplicable más principios seleccionados del RGPD como mejoras voluntarias verificables. La comparación no permite elegir qué obligaciones legales cumplir cuando una norma resulte aplicable.

### Cited Findings

- El RGPD contempla costes y riesgo al dimensionar seguridad y exige poder demostrar las medidas; adoptar un documento no sustituye su ejecución. Referencias: [art. 32](https://www.boe.es/buscar/doc.php?id=DOUE-L-2016-80807) y [Comisión Europea, seguridad y protección por diseño, arts. 24–25 y 32](https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/obligations_en), consulta 2026-10-16.
- Una certificación requiere su mecanismo formal; una declaración propia de principios no la acredita. Fuente: [RGPD, arts. 42–43](https://www.boe.es/buscar/doc.php?id=DOUE-L-2016-80807), consulta 2026-10-16.

### Inferences

**Comparación pragmática.** Las tareas siguientes son una propuesta de trabajo, no hechos implementados ni una enumeración de obligaciones guatemaltecas. No se estiman dinero u horas sin inventario y cotizaciones. «Mínimo local» significa el resultado de la investigación guatemalteca separada, no ausencia de deberes. Los estándares internacionales **no son ley supletoria** por decisión del equipo.

| Alternativa | Trabajo inicial concreto | Carga que se repite | Beneficio y límite práctico |
| --- | --- | --- | --- |
| **A. Base local aplicable** | Convertir la revisión guatemalteca en una lista de obligaciones; identificar a las personas que prestan el servicio; describir datos, usos y capacidades reales; aprobar textos coherentes con esa lista; comprobar alcance extranjero antes de admitir nuevos mercados. | Revisar cambios del producto y de ley; conservar versiones y evidencias exigibles; resolver reclamos y solicitudes conforme al régimen que corresponda. | Menor trabajo adicional de diseño. No aporta por sí sola los mecanismos P1–P3 ni prepara automáticamente para clientes extranjeros. No es una declaración de que el estado actual ya cumple el mínimo local. |
| **B. Base local + principios RGPD seleccionados, voluntarios** | Todo A; inventariar datos y finalidades; reducir campos y accesos; preparar evidencia del clic y acuerdos de instrucciones; ejecutar y probar P1, P2 y P3; redactar avisos que distingan lo disponible de lo pendiente. | Atender solicitudes y comprobar identidad; mantener registro de decisiones; probar recuperación de copias; revisar permisos, conservación y cambios de finalidad; ensayar incidentes; conservar pruebas de cada revisión. | Carga intermedia y concentrada en problemas cotidianos del comercio. Mejora control de datos y capacidad de respuesta. No acredita cumplimiento integral, certificación ni aplicación automática de derechos europeos a todos. **Recomendada para el alcance comunicado**, condicionada a ejecutar sus tareas. |
| **C. Programa de cumplimiento integral RGPD para los tratamientos pertinentes** | Todo B; análisis jurídico documentado de alcance y roles; bases jurídicas por finalidad; avisos completos; proceso de derechos con requisitos legales; contratos art. 28; examen de representante art. 27 y transferencias art. 44; comprobar requisitos de registros, evaluación de impacto y delegado cuando correspondan. | Mantener expedientes, contratos y cambios de subencargados; gestionar derechos e incidentes dentro de sus condiciones legales; actualizar análisis de riesgo y transferencias; atender revisiones y, cuando proceda, autoridades y representante. | Mayor dedicación técnica, jurídica y de seguimiento. Tiene sentido si se activa el régimen o se decide asumir compromisos amplios tras evaluar capacidad. «Integral» describe el objetivo del programa, no el estado de Kontrol ni obligación de contratar todos los cargos o mecanismos sin comprobar sus supuestos. |

Las menciones de representante, contratos y transferencias de C remiten a [RGPD, arts. 27, 28 y 44](https://www.boe.es/buscar/doc.php?id=DOUE-L-2016-80807); los requisitos de evaluación de impacto y delegado dependen de sus supuestos, no de adoptar la opción C por nombre: [Comisión Europea, obligaciones; arts. 35 y 37](https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/obligations_en). Consulta de ambas fuentes: 2026-10-16. El detalle de derechos e incidentes se documenta en la siguiente pregunta.

**Costes concretos de la alternativa B que deben presupuestarse por tarea:**

| Entregable propuesto | Trabajo que consume recursos | Evidencia mínima para poder describirlo como disponible |
| --- | --- | --- |
| Identidad, mapa de datos y decisiones | Asignar una persona del equipo; completar identidad y contacto real; revisar campos de cuentas, comercios, POS e IA; decidir finalidades, acceso y conservación. | Mapa revisado, responsable de cada tarea y registro de decisiones; contacto probado. No inventar una sociedad o un buzón. |
| **P1: exportación y borrado** | Desarrollo y revisión para separar comercios; verificar identidad y autoridad del solicitante; extraer información sin mezclar terceros; decidir retenciones justificadas; tratar copias y datos derivados; entregar y documentar la respuesta. | Pruebas con dos comercios y datos ficticios; registro de solicitud y resultado; límites explicados, incluidos respaldos. No prometer borrado instantáneo de todas las copias. |
| **P2: respaldos** | Capacidad de almacenamiento; automatización; protección y control de acceso; definición de retención; tiempo de restauración; prueba de recuperación y comprobación de coherencia con borrados. | Restauración comprobada con datos de prueba y resultado registrado. Tener un archivo de copia sin probarlo no acredita recuperación. |
| **P3: brechas** | Asignar quién detecta, contiene, evalúa y comunica; preparar registro y plantillas; establecer escalamiento; ensayar un caso; revisar plazos aplicables al incidente concreto. | Procedimiento aprobado y ensayo registrado; contactos comprobados. Sin estas pruebas no presentarlo como un protocolo operativo. |
| Evidencia de aceptación y consentimiento | Desarrollo del registro versionado descrito abajo; acceso restringido; consulta y conservación proporcionada; revisión del texto y prueba de retirada cuando se use consentimiento. | Reconstrucción de qué se mostró y qué acción realizó una cuenta en un momento concreto. |
| Operación de IA | Determinar qué campos llegan a Qwen, quién accede a entradas/salidas y qué se conserva; limitar datos; separar comercios; revisar resultados antes de usarlos en decisiones del negocio. | Diagrama de flujo y pruebas de aislamiento, conservación y borrado. No atribuir al modelo confidencialidad, anonimización o ausencia de entrenamiento sin comprobarlo. |

Las tareas y pruebas anteriores son criterios de aceptación propuestos por esta investigación, no exigencias numéricas impuestas por una norma ni resultados de pruebas realizadas. Para obtener un coste monetario real, desglosar desarrollo, revisión jurídica, almacenamiento y tiempo recurrente, y cotizar sobre esa lista.

**Regla de decisión:** elegir B como plan proporcional para Guatemala; mantener A como base jurídica que debe verificarse por separado. Si un tratamiento entra en una ley extranjera, incorporar las obligaciones que correspondan a ese tratamiento aunque el equipo prefiera A o B. No anunciar C sin completar su evaluación y sus mecanismos.

### Gaps

- P1, P2 y P3 carecen de implementación efectiva acreditada y de fecha comprometida. No publicar promesas operativas a partir de estas notas.
- No hay cotización de almacenamiento, inventario de solicitudes ni estimación de desarrollo revisada. «Menor/intermedia/mayor» describe amplitud de tareas, no una cifra ni un plazo garantizado.

## ¿Qué prueba necesita un clic y cuándo existen derechos o plazos de incidentes?

### Takeaway

Guardar que alguien pulsó un botón no demuestra por sí solo un consentimiento válido. Los derechos legales y los plazos de incidentes dependen de la ley aplicable, del rol y del supuesto concreto; P1–P3 pendientes no suspenden una obligación legal que ya exista.

### Cited Findings

- **Consentimiento, si es la base elegida.** Debe ser libre, específico, informado e inequívoco; la petición debe distinguirse de otros asuntos y permitir retirada. El responsable debe poder demostrarlo. Fuentes: [Comisión Europea, «Legal grounds for processing data», consentimiento; arts. 4.11 y 7, considerandos 32 y 42–43](https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/legal-grounds-processing-data_en) y [RGPD, art. 7.1–7.4](https://www.boe.es/buscar/doc.php?id=DOUE-L-2016-80807). Consulta: 2026-10-16.
- **No todo tratamiento requiere esa base.** El art. 6 contempla varias bases jurídicas; aceptar términos o recibir un aviso no equivale a consentir todos los usos de datos. Fuente: [Comisión Europea, «Legal grounds for processing data», bases jurídicas y consentimiento; RGPD arts. 6–7](https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/legal-grounds-processing-data_en). Consulta: 2026-10-16.
- **Derechos cuando el RGPD resulte aplicable.** Acceso, rectificación y supresión tienen su régimen; portabilidad tiene condiciones propias. El plazo general de respuesta es un mes y puede ampliarse dos meses cuando lo justifiquen complejidad o número de solicitudes, informando y motivando dentro del primer mes. No son promesas universales para todo cliente guatemalteco por adoptar principios. Fuente: [EDPB, «Respect individuals’ rights», plazos y derechos; RGPD arts. 12.3, 15–17 y 20](https://www.edpb.europa.eu/sme/be-compliant/respect-individuals-rights_en). Consulta: 2026-10-16.
- **Incidentes bajo RGPD, responsable.** Se notifican a la autoridad sin dilación indebida y, de ser posible, dentro de 72 horas desde tener constancia de la violación, salvo improbabilidad de riesgo para derechos y libertades. No se espera a una investigación completa; se admite información por etapas y debe motivarse la demora. Deben documentarse las violaciones. Fuentes: [RGPD, art. 33.1 y 33.3–33.5](https://www.boe.es/buscar/doc.php?id=DOUE-L-2016-80807) y [EDPB, guía para pequeñas empresas, «Data breaches»](https://www.edpb.europa.eu/sme/assess-the-risks/data-breaches_en). Consulta: 2026-10-16.
- **Encargado y afectados bajo RGPD.** El encargado avisa al responsable sin dilación indebida; no tiene una franquicia general de 72 horas. La comunicación a personas afectadas se vincula a alto riesgo y se realiza sin dilación indebida, con las excepciones del art. 34.3; su plazo no es «72 horas para todos». Fuente: [EDPB, «Data breaches», obligaciones por rol y comunicación; RGPD arts. 33.2 y 34.1–34.3](https://www.edpb.europa.eu/sme/assess-the-risks/data-breaches_en). Consulta: 2026-10-16.
- **Reino Unido es un análisis separado.** Si aplica UK GDPR, su art. 33 establece el régimen de 72 horas para el responsable, condicionado a constancia y riesgo, y aviso sin dilación indebida del encargado al responsable. Debe usarse el texto británico vigente y la autoridad competente, no trasladar una obligación europea por nombre. Fuente: [UK GDPR, art. 33.1–33.5, texto oficial con modificaciones](https://www.legislation.gov.uk/eur/2016/679/article/33/data.html). Consulta: 2026-10-16.

### Inferences

**Diseño propuesto del registro del clic; no implementado por esta investigación:**

1. Separar la aceptación de condiciones del servicio, la constancia de entrega del aviso y cada consentimiento opcional que realmente se utilice. No convertir el aviso entero en una autorización genérica.
2. Conservar identificador de cuenta/comercio y evento; fecha/hora UTC y presentación en Guatemala; finalidad concreta; versión y copia del texto mostrado; versión de la interfaz y acción afirmativa realizada. Un hash puede ayudar a detectar cambios, pero no sustituye la copia legible del texto.
3. Registrar concesión, retirada y sustitución de versión con historial protegido y acceso limitado. No pedir contraseña, token, datos completos del POS o contenido de conversaciones como prueba del consentimiento. No agregar IP ni huella de dispositivo por defecto: justificar cualquier dato adicional y su conservación.
4. Probar con datos ficticios que puede reconstruirse la pantalla y la elección asociadas al evento, y que la retirada afecta al tratamiento correspondiente. Un evento en una base de datos no demuestra que la opción fuera libre o que la información fuera clara.
5. Aprobar conservación y personas autorizadas antes de publicarlo. No inventar un periodo legal único para conservar todos estos registros.

Estos campos son una propuesta de evidencia, no una lista de campos obligatorios del RGPD. Su fundamento es la demostrabilidad y la calidad del consentimiento: [EDPB, Directrices 05/2020, apartado 5.1; art. 7.1](https://www.dpa.gr/sites/default/files/2020-07/edpb_guidelines_202005_consent_en.pdf), consulta 2026-10-16. La validez de contratación electrónica guatemalteca corresponde a la investigación local separada.

**Regla para el futuro procedimiento P3:** abrir registro del incidente; precisar tratamiento y rol; determinar normas y contratos aplicables; registrar cuándo se tuvo constancia, riesgo y decisiones; contener y conservar evidencia; comunicar según las condiciones comprobadas. Esta secuencia es una recomendación de operación, no un plazo nuevo. Si concurren varios regímenes, evaluar cada obligación en paralelo; no suponer que cumplir uno cumple los demás.

Para el escenario guatemalteco descrito, estas notas **no establecen un plazo universal de 72 horas**, ni certifican ausencia de deberes locales o contractuales. Tampoco aprueban un plazo voluntario propio: sigue pendiente decidirlo y poder ejecutarlo. Los plazos legales, cuando procedan, no quedan a elección del equipo ni se aplazan hasta terminar P3. Fundamento del contraste con RGPD: [EDPB, obligaciones ante brechas, arts. 33–34](https://www.edpb.europa.eu/sme/assess-the-risks/data-breaches_en), consulta 2026-10-16.

### Gaps

- No se revisó un flujo real de clic, registro de solicitudes, prueba de exportación/borrado, recuperación o incidente. No afirmar que esos mecanismos ya existen.
- No se fijan plazos de incidentes brasileños, californianos o guatemaltecos sin evaluar sus reglas y hechos propios; excedería este contraste territorial. No extrapolar las 72 horas europeas a esas jurisdicciones.
- Si se activa el RGPD, el estado pendiente de P1–P3 es una brecha que debe resolverse frente a la obligación correspondiente; una etiqueta de «pendiente» informa del estado, pero no exime. Fundamento: [EDPB, derechos y respuesta, arts. 12 y 15–20](https://www.edpb.europa.eu/sme/be-compliant/respect-individuals-rights_en) y [brechas, arts. 33–34](https://www.edpb.europa.eu/sme/assess-the-risks/data-breaches_en), consulta 2026-10-16.

## ¿Qué cambia ante una nueva ley guatemalteca y qué puede decirse al público?

### Takeaway

Una futura ley requiere una revisión de su texto publicado, vigencia y transitorios. La adopción voluntaria de principios no garantiza satisfacerla ni puede presentarse como cumplimiento actual; estas notas no determinan el estado legislativo guatemalteco.

### Cited Findings

- El RGPD separa su ámbito territorial de los mecanismos formales de certificación. La responsabilidad propia tampoco desaparece por designar representante. Fuente: [RGPD, arts. 3, 27.5 y 42–43](https://www.boe.es/buscar/doc.php?id=DOUE-L-2016-80807). Consulta: 2026-10-16.
- El marco de roles exige atribuir responsabilidades según decisiones e instrucciones reales; contratar a un encargado no permite trasladar indiscriminadamente toda la responsabilidad. Fuente: [Comisión Europea, roles de responsable/encargado; RGPD arts. 4.7–4.8, 24 y 28](https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/application-gdpr_en). Consulta: 2026-10-16.

### Inferences

**Procedimiento propuesto si Guatemala aprueba una nueva ley:**

1. Encargar a una persona la comprobación de publicación oficial, texto final, entrada en vigor, transitorios, autoridad y reglamentación. Una iniciativa, dictamen o noticia no acredita por sí sola vigencia. Este es un criterio de verificación; no se afirma aquí que exista o no exista una ley nueva.
2. Comparar sus requisitos con el mapa real de datos y con A/B/C. Identificar sujetos y roles, bases de tratamiento, información al usuario, derechos, conservación, seguridad, transferencias e incidentes según el texto nuevo, sin copiar automáticamente requisitos europeos.
3. Registrar diferencias, responsables y fechas resultantes de la ley y de la capacidad operativa. No inventar una transición, un buzón ni un plazo de atención.
4. Implementar y probar cambios, revisar contratos y avisos; cuando el cambio requiera una nueva manifestación de voluntad, diseñarla con evidencia y explicación de la finalidad. No obtener de nuevo todos los consentimientos indiscriminadamente.
5. Volver a evaluar el alcance extranjero si cambia mercado, presencia, finalidad o seguimiento. La revisión local no reemplaza las pruebas territoriales distintas de [RGPD art. 3 y EDPB, Directrices 3/2018](https://www.edpb.europa.eu/sites/default/files/files/file1/edpb_guidelines_3_2018_territorial_scope_after_public_consultation_en_1.pdf), [UK GDPR art. 3](https://www.legislation.gov.uk/eur/2016/679/article/3/data.html), [LGPD art. 3](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm) y [CCPA §1798.140(d)](https://cppa.ca.gov/pdf/20260101_ccpa_statute.pdf). Consulta de estas fuentes: 2026-10-16.

**Redacción de trabajo para explicar la decisión, sujeta a revisión antes de publicación:**

> Proponemos para Kontrol cumplir las obligaciones que resulten aplicables en Guatemala y desarrollar mejoras de privacidad inspiradas en principios del RGPD, como recoger menos datos y explicar su uso. Esto describe un plan de mejora; no acredita cumplimiento integral del RGPD ni certificación. La exportación y el borrado, los respaldos y el procedimiento de brechas siguen pendientes y sin fecha comprometida. Las funciones disponibles deben describirse según pruebas reales. Cuando una ley resulte aplicable a un tratamiento, sus obligaciones y derechos se atenderán conforme a sus condiciones.

**Controles de exactitud del texto final, derivados del encargo:**

- Mantener `[PERSONAS PRESTADORAS PENDIENTES]` y `[CONTACTO REAL PENDIENTE]` como pendientes internos hasta completarlos; no publicar una identidad o canal inventados. Carecer de una entidad legal identificada no es fundamento de la recomendación ni de una exención.
- Describir Qwen como operado por el equipo, con vLLM y endpoint ClawStitch según las premisas recibidas; no llamarlo servicio de OpenAI por compatibilidad de API ni afirmar que los datos nunca salen de Guatemala sin comprobar su flujo.
- Conservar el carácter privado de la herramienta y el POS solo de registro; no afirmar homologación, vinculación o sustitución de SAT.
- Mantener Stripe exclusivamente TEST de demostración, sin cobros reales. No crear suscripciones, precios, planes o promesas de cobro para justificar una hipótesis legal.
- Explicar riesgos y responsabilidades del usuario con relación a sus acciones; no incluir una exención absoluta por fallos propios del equipo. La cláusula de responsabilidad deberá revisarse en el análisis contractual local, fuera de esta investigación.

### Gaps

- El estado de iniciativas y leyes guatemaltecas se deja a la investigación local; aquí no se da una iniciativa por vigente ni se afirma ausencia de ley a la fecha de corte.
- Identidad del prestador, canal de atención, aprobación e implementación de P1–P3 y condiciones contractuales siguen pendientes. La recomendación B no subsana esos pendientes mediante su sola redacción.
- No se modificó ni se auditó la aplicación, no se investigaron proveedores y no se operó git. Esta entrega contiene únicamente notas de investigación y propuestas.
