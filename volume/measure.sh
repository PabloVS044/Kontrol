#!/usr/bin/env bash
# Measures the queries SCRUM-28 flagged as expensive at the current volume of
# the SCRUM-25 test database. Run once per level, after populate.sh.
#
# Usage: VOLUME_DATABASE_URL=... volume/measure.sh <label>   (e.g. N0, N1, N2, N3)
#
# Output in volume/results/<label>/:
#   inventario.txt   rows, sizes and existing indexes
#   explain.txt      EXPLAIN (ANALYZE, BUFFERS) of every statement, warm cache
#   pgbench/         raw per-transaction latency logs
# and one row per query and concurrency level appended to volume/results/tiempos.csv.
set -euo pipefail
cd "$(dirname "$0")"
source lib/guard.sh

LABEL="${1:-}"
[ -n "$LABEL" ] || die "Uso: volume/measure.sh <etiqueta>, por ejemplo N1"
DURATION="${VOLUME_BENCH_SECONDS:-30}"
CLIENTS="${VOLUME_BENCH_CLIENTS:-1 5}"
OUT="results/$LABEL"
CSV="results/tiempos.csv"
mkdir -p "$OUT/pgbench"

# The measured scope: the seeded test company and its hot project. Before any
# population (N0) there is no VOL project yet, so the seeded in-progress
# project stands in for it.
read -r EMP PROJ < <("${PSQL[@]}" -tA -F ' ' -c "
  SELECT e.id_empresa,
         COALESCE(
           (SELECT id_proyecto FROM public.proyecto WHERE id_empresa = e.id_empresa AND nombre = 'VOL Proyecto 1'),
           (SELECT id_proyecto FROM public.proyecto WHERE id_empresa = e.id_empresa
             ORDER BY (estado = 'EN_PROGRESO') DESC, id_proyecto LIMIT 1))
  FROM public.empresa e WHERE e.email = '$SEED_COMPANY_EMAIL'")
# A barcode that exists in the hot project, to time a hit rather than a miss.
CODE=$("${PSQL[@]}" -tAc "
  SELECT COALESCE(max(substring(codigo_barras FROM 5)::bigint), 0) FROM public.producto
  WHERE id_proyecto = $PROJ AND codigo_barras LIKE 'VOL-%'")
echo "==> $LABEL — empresa $EMP, proyecto medido $PROJ, código VOL-$CODE"

"${PSQL[@]}" -v emp="$EMP" -v proj="$PROJ" -f sql/inventory.sql > "$OUT/inventario.txt"
echo "    inventario -> $OUT/inventario.txt"

[ -f "$CSV" ] || echo "nivel,consulta,clientes,transacciones,media_ms,p50_ms,p95_ms,p99_ms,max_ms" > "$CSV"

for script in sql/bench/*.sql; do
  name=$(basename "$script" .sql)
  for c in $CLIENTS; do
    prefix="$OUT/pgbench/${name}_c${c}"
    rm -f "$prefix".*
    pgbench "$VOLUME_DATABASE_URL" -n -f "$script" -c "$c" -j "$c" -T "$DURATION" \
      -D emp="$EMP" -D proj="$PROJ" -D code="$CODE" \
      -l --log-prefix="$prefix" > "$prefix.summary.txt" 2>&1 \
      || { echo "    ! pgbench falló en $name (c=$c), ver $prefix.summary.txt"; continue; }
    # Column 3 of a pgbench log line is the transaction latency in microseconds.
    cat "$prefix".[0-9]* | awk '{print $3}' | sort -n | awk -v lvl="$LABEL" -v q="$name" -v c="$c" '
      { v[NR] = $1; sum += $1 }
      function pct(p,  i) { i = int(NR * p + 0.999999); if (i < 1) i = 1; return v[i] / 1000 }
      END {
        if (NR == 0) { printf "%s,%s,%s,0,,,,,\n", lvl, q, c; exit }
        printf "%s,%s,%s,%d,%.1f,%.1f,%.1f,%.1f,%.1f\n", lvl, q, c, NR, sum / NR / 1000,
               pct(0.50), pct(0.95), pct(0.99), v[NR] / 1000
      }' | tee -a "$CSV" | sed 's/^/    /'
  done
done

# EXPLAIN after pgbench, so it reads a warm cache like the steady state does.
# Built from the same scripts, so plan and timing always describe one query.
{
  for script in sql/bench/*.sql; do
    echo "\\echo '################ $(basename "$script")'"
    sed -e "s/:emp\b/$EMP/g" -e "s/:proj\b/$PROJ/g" -e "s/:code\b/$CODE/g" "$script" \
      | grep -v '^\s*--' \
      | awk 'BEGIN { RS = ";" } NF { gsub(/^[ \n]+/, ""); print "EXPLAIN (ANALYZE, BUFFERS) " $0 ";" }'
  done
} > "$OUT/explain.sql"
"${PSQL[@]}" -f "$OUT/explain.sql" > "$OUT/explain.txt"
echo "    planes -> $OUT/explain.txt"
echo "    lecturas secuenciales en tablas medidas:"
grep -oE "Seq Scan on (producto|movimiento_inventario|tarea|presupuesto_actividad|reporte|project_progress_entry)\b" "$OUT/explain.txt" \
  | sort | uniq -c | sed 's/^/    /' || echo "      (ninguna)"
