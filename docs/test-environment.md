# Ambiente de pruebas — SCRUM-25

Ambiente aislado para las sesiones de UX (protocolo T1–T5) y para el material
que el Neurolab requiere antes del 15/09. Misma aplicación que producción;
base de datos separada (Supabase) y datos de ejemplo verosímiles.

## URL

**https://test.34.121.51.151.nip.io** (`TEST_PUBLIC_HOST` en `.env.deploy` —
cambia esto si se configuró un dominio distinto al desplegar).

## Cuentas de prueba

6 cuentas, 5 para participantes y 1 de reserva. Todas con rol de empresa
`manager` (necesario para poder crear proyectos en T2), miembros de los 3
proyectos sembrados.

| Cuenta | Email | Contraseña |
|---|---|---|
| Participante 1 | `participante1@kontrol-test.dev` | `Kontrol2026!` |
| Participante 2 | `participante2@kontrol-test.dev` | `Kontrol2026!` |
| Participante 3 | `participante3@kontrol-test.dev` | `Kontrol2026!` |
| Participante 4 | `participante4@kontrol-test.dev` | `Kontrol2026!` |
| Participante 5 | `participante5@kontrol-test.dev` | `Kontrol2026!` |
| Reserva | `reserva@kontrol-test.dev` | `Kontrol2026!` |

Todas ven la misma empresa ("Ferretería Los Pinos") y los mismos 3 proyectos
— no hay datos separados por participante. El punto de partida idéntico se
logra reseteando entre sesiones, no aislando cuentas.

## Restablecer el ambiente (correr entre cada sesión)

Desde la VM:

```bash
cd /app/Kontrol
docker compose -f docker-compose.prod.yml -f docker-compose.test.yml exec backend-test npm run reset:test
```

Tarda menos de un minuto. Borra todos los datos de negocio (usuarios,
empresa, proyectos, tareas, avances, evidencia, gastos, reportes), elimina
los archivos de evidencia subidos a UploadThing, y vuelve a sembrar el
estado inicial descrito abajo. El script se niega a correr si
`DATABASE_URL` no apunta a Supabase — no puede afectar producción por
accidente aunque se ejecute el comando equivocado.

## Qué contienen los datos sembrados

- **1 empresa**: Ferretería Los Pinos.
- **3 proyectos**: uno recién planificado, uno en progreso a mitad de
  camino, uno en progreso cerca de completarse (con el gasto acumulado
  cerca del límite del presupuesto, para que la alerta de sobrecosto se
  vea en T5).
- **Tareas** en distintos estados (pendiente, en progreso, completada) en
  cada proyecto, algunas ya asignadas a un participante.
- **Avances** de proyecto, incluido uno con una evidencia (imagen) ya
  adjunta, para verificar que la vista de detalle de tarea la muestra.
- **Gastos** cargados contra el presupuesto de cada proyecto.
- **1 reporte** consolidado de ejemplo.

Script fuente: `backend/src/db/seed.js`. Es idempotente — correrlo de nuevo
sin resetear antes no duplica datos.

## Si algo falla el día de la sesión

1. **La app no responde**: revisar que los contenedores estén arriba —
   `docker compose -f docker-compose.prod.yml -f docker-compose.test.yml ps`.
   Si `backend-test`/`frontend-test` están caídos:
   `docker compose -f docker-compose.prod.yml -f docker-compose.test.yml up -d backend-test frontend-test`.
2. **Los datos quedaron en un estado raro** (una sesión anterior no se
   reseteó): correr el comando de reset de arriba antes de la siguiente
   sesión.
3. **Una cuenta no puede iniciar sesión**: confirmar que se está usando el
   email exacto de la tabla de arriba — el reset no cambia contraseñas,
   pero si se corrió el seed manualmente contra una base ya poblada con
   otro estado, revisar los logs de `backend-test`
   (`docker compose ... logs --tail=200 backend-test`).
4. **El ambiente entero no arranca tras un deploy**: `scripts/deploy.sh`
   deja logs de salud al final; si el backend-test no pasó el healthcheck,
   el script lo reporta con el log del contenedor incluido.
