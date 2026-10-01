#!/usr/bin/env bash
# Runs one ZAP Automation Framework plan against the SCRUM-25 test environment.
#
#   ZAP_USER=reserva@kontrol-test.dev ZAP_PASSWORD=... zap/run-zap.sh passive
#   ZAP_USER=reserva@kontrol-test.dev ZAP_PASSWORD=... zap/run-zap.sh active
#
# The bearer token is obtained here, right before the run, and handed to ZAP
# through its native ZAP_AUTH_HEADER* variables, restricted to the test host.
# It never touches a file, and ZAP's traditional report templates do not
# record request headers, so it does not end up in out/ either.
set -euo pipefail

PLAN="${1:?usage: run-zap.sh passive|active}"
source "$(dirname "$0")/lib/common.sh"

PLAN_FILE="$ZAP_DIR/plans/$PLAN.yaml"
[ -f "$PLAN_FILE" ] || { echo "Unknown plan: $PLAN" >&2; exit 1; }

ZAP_IMAGE="${ZAP_IMAGE:-zaproxy/zap-stable}"
CONTAINER="${ZAP_CONTAINER:-kontrol-zap}"

login
discover_ids

# ZAP's Automation Framework expands ${VAR} in URLs but not in every field
# (replacer rules keep the literal text), so the plan is rendered here with
# only the id variables. The rendered copy lands in out/ and holds no token.
RENDERED="$OUT_DIR/$PLAN.rendered.yaml"
envsubst '$COMPANY_ID $PROJECT_ID $TASK_ID $PRODUCT_ID $SUPPLIER_ID $REPORT_ID $USER_ID' \
  < "$PLAN_FILE" > "$RENDERED"

echo "==> $PLAN scan against $BASE_URL (container $CONTAINER, abort with: docker kill $CONTAINER)"
started="$(date -u +%FT%TZ)"

set +e
docker run --rm --name "$CONTAINER" \
  -v "$ZAP_DIR:/zap/wrk:rw" \
  -e ZAP_AUTH_HEADER=Authorization \
  -e ZAP_AUTH_HEADER_VALUE="Bearer $TOKEN" \
  -e ZAP_AUTH_HEADER_SITE="$TEST_HOST_MARKER" \
  "$ZAP_IMAGE" zap.sh -cmd -autorun "/zap/wrk/out/$PLAN.rendered.yaml"
status=$?
set -e

finished="$(date -u +%FT%TZ)"
printf '%s,%s,%s,%s\n' "$PLAN" "$started" "$finished" "$status" >> "$OUT_DIR/runs.csv"
echo "==> $PLAN finished with exit $status ($started -> $finished). Reports in zap/out/."
exit "$status"
