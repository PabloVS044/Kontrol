#!/usr/bin/env bash
# Watches PRODUCTION while a scan runs against the test environment on the
# same VM (2 vCPU, no CPU limits per container). In Sprint 7 a load test
# pushed a production health check from instant to 2.9 s
# (docs/pruebas-carga-estres.md, finding 4); this script turns that lesson
# into an explicit abort rule.
#
#   zap/monitor-prod.sh baseline 120     # 2 min of samples, prints p95
#   zap/monitor-prod.sh watch active     # runs until Ctrl-C or abort
#
# Abort (runs $ABORT_CMD, default `docker kill kontrol-zap`, and exits 2) when:
#   - production health answers anything but 200, or takes > HARD_LIMIT_S
#   - 3 consecutive samples above SOFT_LIMIT_S
#   - production backend CPU > CPU_LIMIT % in 2 consecutive stats (30 s)
#   - VM load average (1 min) > LOAD_LIMIT
#   - backend-test restart count increases
#   - free disk on the VM drops below DISK_MIN_MB (container logs have no
#     rotation and production Postgres writes to the same disk)
set -uo pipefail

MODE="${1:?usage: monitor-prod.sh baseline [seconds] | watch <label>}"
ARG="${2:-}"

PROD_HEALTH="${PROD_HEALTH:-https://34.121.51.151.nip.io/api/health}"
VM_SSH="${VM_SSH:-pvasquezs044@34.121.51.151}"
PROD_CONTAINER="${PROD_CONTAINER:-kontrol-backend-1}"
TEST_CONTAINER="${TEST_CONTAINER:-kontrol-backend-test-1}"
HEALTH_EVERY_S="${HEALTH_EVERY_S:-5}"
STATS_EVERY_S="${STATS_EVERY_S:-15}"
HARD_LIMIT_S="${HARD_LIMIT_S:-2.0}"
SOFT_LIMIT_S="${SOFT_LIMIT_S:-1.0}"
CPU_LIMIT="${CPU_LIMIT:-70}"
LOAD_LIMIT="${LOAD_LIMIT:-3.0}"
DISK_MIN_MB="${DISK_MIN_MB:-400}"
ABORT_CMD="${ABORT_CMD:-docker kill kontrol-zap}"

OUT_DIR="$(cd "$(dirname "$0")" && pwd)/out"
mkdir -p "$OUT_DIR"
SSH=(ssh -o BatchMode=yes -o ConnectTimeout=10
  -o ControlMaster=auto -o ControlPersist=120
  -o "ControlPath=${XDG_RUNTIME_DIR:-/tmp}/kontrol-monitor-%C" "$VM_SSH")

probe() {
  curl -sS -o /dev/null --max-time 10 -w '%{http_code} %{time_total}' "$PROD_HEALTH" 2>/dev/null || echo "000 10"
}

gt() { awk -v a="$1" -v b="$2" 'BEGIN { exit !(a > b) }'; }

if [ "$MODE" = baseline ]; then
  secs="${ARG:-120}"
  file="$OUT_DIR/baseline-$(date -u +%Y%m%dT%H%M%SZ).csv"
  echo "timestamp,http_code,seconds" > "$file"
  end=$(( $(date +%s) + secs ))
  while [ "$(date +%s)" -lt "$end" ]; do
    read -r code t <<<"$(probe)"
    echo "$(date -u +%FT%TZ),$code,$t" >> "$file"
    sleep "$HEALTH_EVERY_S"
  done
  tail -n +2 "$file" | cut -d, -f3 | sort -n | awk '
    { v[NR] = $1 } END {
      p95 = v[int(NR * 0.95 + 0.999)]
      printf "baseline: n=%d min=%.3f median=%.3f p95=%.3f max=%.3f\n", NR, v[1], v[int((NR+1)/2)], p95, v[NR]
    }'
  echo "samples: $file"
  exit 0
fi

[ "$MODE" = watch ] || { echo "unknown mode: $MODE" >&2; exit 1; }
label="${ARG:-run}"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
hfile="$OUT_DIR/monitor-$label-$stamp-health.csv"
sfile="$OUT_DIR/monitor-$label-$stamp-stats.csv"
echo "timestamp,http_code,seconds" > "$hfile"
echo "timestamp,prod_cpu_pct,test_cpu_pct,load1,test_restarts,disk_free_mb" > "$sfile"

abort() {
  echo "!!! ABORT $(date -u +%FT%TZ): $1" | tee -a "$hfile.abort"
  sh -c "$ABORT_CMD" >/dev/null 2>&1 || true
  exit 2
}

stats() {
  "${SSH[@]}" "docker stats --no-stream --format '{{.Name}} {{.CPUPerc}}' $PROD_CONTAINER $TEST_CONTAINER;
    cut -d' ' -f1 /proc/loadavg;
    docker inspect -f '{{.RestartCount}}' $TEST_CONTAINER;
    df --output=avail -m / | tail -1 | tr -d ' '" 2>/dev/null
}

slow_streak=0
cpu_streak=0
restarts0=""
last_stats=0
echo "==> watching $PROD_HEALTH ($label). Logs: $hfile / $sfile"
while true; do
  read -r code t <<<"$(probe)"
  echo "$(date -u +%FT%TZ),$code,$t" >> "$hfile"
  [ "$code" = 200 ] || abort "production health returned HTTP $code"
  gt "$t" "$HARD_LIMIT_S" && abort "production health took ${t}s (> ${HARD_LIMIT_S}s)"
  if gt "$t" "$SOFT_LIMIT_S"; then slow_streak=$((slow_streak + 1)); else slow_streak=0; fi
  [ "$slow_streak" -ge 3 ] && abort "3 consecutive production health samples > ${SOFT_LIMIT_S}s"

  now=$(date +%s)
  if [ $((now - last_stats)) -ge "$STATS_EVERY_S" ]; then
    last_stats=$now
    out="$(stats)"
    if [ -n "$out" ]; then
      prod_cpu=$(awk -v c="$PROD_CONTAINER" '$1 == c { gsub("%", "", $2); print $2 }' <<<"$out")
      test_cpu=$(awk -v c="$TEST_CONTAINER" '$1 == c { gsub("%", "", $2); print $2 }' <<<"$out")
      load1=$(sed -n 3p <<<"$out")
      restarts=$(sed -n 4p <<<"$out")
      disk_mb=$(sed -n 5p <<<"$out")
      echo "$(date -u +%FT%TZ),${prod_cpu:-},${test_cpu:-},${load1:-},${restarts:-},${disk_mb:-}" >> "$sfile"
      printf '%s prod=%ss cpu prod=%s%% test=%s%% load=%s disk=%sMB\n' "$(date +%T)" "$t" "${prod_cpu:-?}" "${test_cpu:-?}" "${load1:-?}" "${disk_mb:-?}"
      [ -n "${disk_mb:-}" ] && [ "$disk_mb" -lt "$DISK_MIN_MB" ] && abort "VM free disk ${disk_mb} MB < ${DISK_MIN_MB} MB"
      if [ -n "${prod_cpu:-}" ] && gt "$prod_cpu" "$CPU_LIMIT"; then cpu_streak=$((cpu_streak + 1)); else cpu_streak=0; fi
      [ "$cpu_streak" -ge 2 ] && abort "production backend CPU > ${CPU_LIMIT}% for 30 s"
      [ -n "${load1:-}" ] && gt "$load1" "$LOAD_LIMIT" && abort "VM load average $load1 > $LOAD_LIMIT"
      [ -z "$restarts0" ] && restarts0="${restarts:-}"
      [ -n "${restarts:-}" ] && [ -n "$restarts0" ] && [ "$restarts" -gt "$restarts0" ] && abort "backend-test restarted ($restarts0 -> $restarts)"
    else
      echo "$(date -u +%FT%TZ),,,,," >> "$sfile"
      echo "$(date +%T) warning: could not read docker stats over SSH"
    fi
  fi
  sleep "$HEALTH_EVERY_S"
done
