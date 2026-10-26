# Procedimiento de restauración

Estado: reproducible en código, pendiente de primera ejecución integral. No usar
esta guía como evidencia de una restauración ya realizada.

## 1. Preparar un destino separado

Usar un equipo propio independiente de la VM y del entorno compartido, o el runner
`ubuntu-24.04` del workflow. No usar `self-hosted`, un túnel SSH/TCP a Docker remoto,
ni `docker-compose.prod.yml`. El script no acepta endpoints existentes y no publica
puertos. Sus bases contienen solo datos ficticios y no arrancan la aplicación.

Requisitos: Python 3.11 o superior, Docker Engine/Desktop con contenedores Linux,
Internet para descargar imágenes/dependencias, 8 GiB libres tanto en el host como
en Docker, y 4 GiB de RAM asignada a Docker. El preflight comprueba esos mínimos.
En Docker Desktop también revisar el tamaño máximo de su disco virtual. El límite
de archivo del cifrado de laboratorio es 256 MiB por respaldo; no usarlo para
cifrar bases productivas grandes.

## 2. Instalar y comprobar las pruebas auxiliares

Desde la raíz del repositorio, en Linux/macOS:

```bash
python3 -m venv .venv-backups
. .venv-backups/bin/activate
python -m pip install -r scripts/backups/requirements.txt
python -m unittest discover -s tests/backups -v
```

En PowerShell, los primeros dos pasos se sustituyen por:

```powershell
py -3 -m venv .venv-backups
.\.venv-backups\Scripts\Activate.ps1
```

Los siguientes comandos usan `python` en ambos casos. No se necesita `npm ci` para
esta herramienta. Las pruebas auxiliares comprueban integridad y protecciones;
no restauran bases y no cuentan como evidencia de aceptación de P-2.

## 3. Ejecutar la restauración real de laboratorio

Con Docker encendido, ejecutar:

```bash
python scripts/backups/drill.py --output backup-drill-output
```

Anotar operador y commit de la rama. El programa realizará, en orden:

1. Comprobar espacio, memoria, motor local y versiones/IDs de imágenes.
2. Crear una red interna y contenedores/volúmenes con identificador aleatorio y
   etiqueta de propietario de esta ejecución. No usa los servicios del proyecto.
3. Cargar `backend/kontrol.sql`, fixtures de empresas/usuarios/proyectos/productos/
   ventas y cuatro colecciones Mongo de chat/IA. No ejecuta el bootstrap del backend.
4. Obtener inventario de origen (conteos, hashes, secuencias y estructura).
5. Ejecutar `pg_dump -Fc --no-owner --no-acl` y `mongodump --db ... --archive --gzip`.
6. Cifrar con Fernet, registrar SHA-256 y eliminar las copias temporales en claro.
   La clave local está junto a los respaldos **solo porque son datos sintéticos**;
   en una operación real se requiere custodia separada.
7. Añadir un usuario y un mensaje después de la captura; esos dos registros se
   perderán deliberadamente. Eliminar los contenedores **y volúmenes fuente**.
8. Crear destinos nuevos; verificar que no tengan tablas/colecciones de aplicación.
9. Validar hash y autenticación de cada respaldo, descifrar en memoria y ejecutar
   `pg_restore --single-transaction --exit-on-error` y `mongorestore --stopOnError`.
10. Comparar el inventario completo y verificar las relaciones/totales de dos
    ventas (102 unidades monetarias en total) y la ausencia de los registros tardíos.
11. Medir duración, escribir informes y eliminar solo los recursos con nombre y
    etiqueta de esta ejecución. No ejecuta `docker system prune` ni borra imágenes.

No se depende de que sobreviva un volumen fuente: se destruye antes de restaurar.
El destino se elimina al terminar la validación; se conserva el informe.

## 4. Interpretar el resultado

El comando imprime la ruta exacta de `evidence.json`. En esa misma carpeta están
`evidence.md` y `private/`. Los únicos archivos para el PR son los dos informes,
revisados, junto con la ficha del operador.

| Código/estado | Interpretación y acción |
| --- | --- |
| `0` / `restored_verified_lab` | Restauración sintética verificada y limpieza completa. Revisar el informe antes de registrar el resultado |
| `2` / `blocked` | Falta un requisito (Docker, espacio, memoria, dependencia o motor local). Corregirlo en el equipo aparte y repetir. No registrar éxito |
| `1` / `failed` | Falló una herramienta o la comparación. Revisar el paso y su código, las fuentes y las versiones. No ocultar la diferencia |
| `1` / `cleanup_failed` | Hay recursos de la prueba por revisar. El informe enumera cuáles; no se puede considerar la ejecución completamente limpia |

Comprobar conjuntamente: `restoration_started`, `restoration_verified`,
`source_removed_before_restore`, `destination_empty_verified` y `cleanup_complete`
en `true`; estado de éxito; inventarios de origen/destino iguales;
`restore_seconds` y `recovery_with_validation_seconds` presentes. Los campos
`rpo_production_verified` y `rto_production_verified` deben seguir en `false`.

`restore_seconds` mide descifrado/restauración; `recovery_with_validation_seconds`
empieza al simular el incidente e incluye recreación de destinos y comprobaciones.
Ninguno incluye recuperación del sitio web, DNS, secretos o proveedores. El RPO
real del servicio no se deduce del tiempo entre dos pasos de este laboratorio.

## 5. Registrar evidencia sin secretos

Crear `docs/respaldos/evidencias/AAAA-MM-DD-RUN_ID/` en la rama, copiar solo
`evidence.json` y `evidence.md`, y completar `ficha-operador.md` con la plantilla
de [evidencias](evidencias/README.md). Incluir commit, operador, máquina/runner,
URL del run, fecha, tiempos, filas/documentos, exclusiones, errores y pasos manuales.

No versionar ni subir `private/`, `restore.key`, dumps, tokens, `.env` o URLs con
credenciales. El workflow solo carga los dos informes; retiene el artifact 30 días.
La clave y las copias locales son descartables porque los datos son ficticios;
retirarlas tras revisar la evidencia siguiendo la política local del equipo.

## 6. Alternativa en GitHub Actions

Crear la rama P-2 desde `develop`, aplicar el parche, hacer push y abrir un PR hacia
`develop`. Los cambios en scripts/tests/workflow disparan `P2 - isolated backup
restore drill` en un runner nuevo de GitHub. Revisar sus logs y descargar el
artifact `p2-restore-evidence-...`. No requiere secretos de producción.

También existe `workflow_dispatch`; la opción manual solo estará disponible cuando
GitHub reconozca el workflow en la rama predeterminada del repositorio. Si todavía
no aparece en Actions, usar el disparador del PR o ejecutar localmente; no hace
falta modificar la rama predeterminada para simular una prueba.

Un PR/run verde sin informe de restauración válido no basta. Incorporar los dos
informes revisados y la ficha al PR para dejar evidencia versionada.

## 7. Fallos y limpieza después de una interrupción

Un error ordinario invoca la limpieza automática. Un corte del host o `SIGKILL`
puede impedirla. Tomar el `run_id` del informe/directorio y listar únicamente sus
recursos, por ejemplo en Git Bash/Linux, sustituyendo el identificador:

```bash
docker ps -a --filter label=kontrol.p2.run=RUN_ID
docker volume ls --filter label=kontrol.p2.run=RUN_ID
docker network ls --filter label=kontrol.p2.run=RUN_ID
```

Inspeccionar nombres y etiquetas antes de cualquier borrado. Retirar individualmente
los contenedores de ese run, después sus volúmenes y finalmente su red. No usar
comodines, `down -v` contra Compose productivo ni limpiezas globales. Las imágenes
pueden seguir ocupando espacio: Docker/Desktop debe mostrarlo, no se promete que
la limpieza libere las capas de imagen.

Si aparece un error SQL, verificar el esquema/fixtures y la versión 16; si hay
diferencias Mongo, revisar índices, tipos BSON y versión 7. Si falta una imagen o
paquete, resolver conectividad en el runner aparte. No sustituir la restauración
por mocks ni cambiar el informe a mano.

## 8. Recuperación de una copia operativa: límites y siguiente ensayo

La herramienta anterior no acepta dumps productivos y no automatiza un cutover.
Para demostrar recuperación del servicio real, el operador debe:

1. Identificar el juego PG+Mongo, fecha/hora de captura, versión del esquema y
   compatibilidad de motores; registrar qué dato se perdería desde ese punto.
2. Recuperar desde el almacenamiento externo y la custodia de claves por separado;
   comprobar checksums/autenticación. Ensayar también la descarga, no solo una copia
   que quedó en el equipo que la creó.
3. Provisionar un proyecto/host nuevo, aislado, sin red hacia producción, sin puertos
   públicos ni salida a correo/pagos/IA/uploads. Medir espacio con el tamaño real,
   índices, temporales y margen. No usar la VM ni el entorno de pruebas compartido.
4. Crear bases vacías con motores compatibles, roles y permisos mínimos; restaurar
   PostgreSQL con `pg_restore` y Mongo con `mongorestore`, usando parámetros de ese
   destino recién verificado. No ejecutar `reset`, `seed` ni migraciones antes de
   revisar qué contiene la copia; nunca reutilizar variables de conexión productivas.
5. Comparar inventarios contra el manifiesto de captura; comprobar relaciones entre
   usuarios/empresas/ventas y chat/IA. Verificar esquema de bootstrap, permisos y
   autenticación; este último paso no está cubierto por el fixture de laboratorio.
6. Reaplicar supresiones posteriores, revocar sesiones si procede y probar los flujos
   de aplicación con servicios externos deshabilitados. Documentar los archivos
   adjuntos no recuperados: una URL en la base no restaura su contenido.
7. Medir todo el tiempo desde declaración de incidente y confrontarlo con RPO/RTO;
   registrar pasos manuales, límites y resultado. Conservar evidencia sin datos y
   eliminar el destino al terminar el ensayo.

Los endpoints, identidades, bucket y clave reales no están disponibles en este ZIP.
Por eso este apartado no declara ejecutada ni automatizada una recuperación
productiva. Una vuelta real al servicio requiere su procedimiento de habilitación
controlada y no forma parte del simulacro autorizado.
