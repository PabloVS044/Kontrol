#!/usr/bin/env bash
# Populates the SCRUM-25 test database up to a volume level. Cumulative: run
# 1, measure, run 2, measure, run 3, measure. See volume/README.md.
#
# Usage: VOLUME_DATABASE_URL=... volume/populate.sh <1|2|3|4>
set -euo pipefail
cd "$(dirname "$0")"
source lib/guard.sh

LEVEL="${1:-}"
HOT_SHARE="${VOLUME_HOT_SHARE:-0.2}"

# Total generated rows per table and level (whole database, all companies).
#          producto  movimiento  venta   tarea   avance  reporte actividad proyectos-empresa-prueba
case "$LEVEL" in
  1) set -- 10000     50000      10000   10000   10000    5000    2000      10 ;;
  2) set -- 50000    250000      50000   50000   50000   25000   10000      50 ;;
  3) set -- 100000   500000     100000  100000  100000   50000   20000     100 ;;
  # Optional: doubles N3. Adds roughly 250 MB; check the Supabase plan's disk first.
  4) set -- 200000  1000000     200000  200000  200000  100000   40000     200 ;;
  *) die "Nivel inválido: '$LEVEL'. Uso: volume/populate.sh <1|2|3|4>" ;;
esac

echo "==> Tamaño de la base antes: $("${PSQL[@]}" -tAc "SELECT pg_size_pretty(pg_database_size(current_database()))")"
echo "==> Poblando al nivel N$LEVEL (fracción del proyecto caliente: $HOT_SHARE)..."

start=$(date +%s)
"${PSQL[@]}" \
  -v n_prod="$1" -v n_mov="$2" -v n_venta="$3" -v n_tarea="$4" -v n_avance="$5" \
  -v n_reporte="$6" -v n_act="$7" -v n_proj_emp="$8" -v hot_share="$HOT_SHARE" \
  -f sql/populate.sql
end=$(date +%s)

echo "==> Nivel N$LEVEL listo en $((end - start)) s."
echo "==> Tamaño de la base después: $("${PSQL[@]}" -tAc "SELECT pg_size_pretty(pg_database_size(current_database()))")"
