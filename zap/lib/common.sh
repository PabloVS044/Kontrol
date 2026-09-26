# Shared helpers for every script in zap/. Sourced, never executed directly.
#
# Credentials are never stored in this repository: the seed account used to
# authenticate is read from ZAP_USER / ZAP_PASSWORD at run time
# (docs/test-environment.md lists the SCRUM-25 test accounts).

BASE_URL="${BASE_URL:-https://test.34.121.51.151.nip.io}"
TEST_HOST_MARKER="${TEST_HOST_MARKER:-test.34.121.51.151.nip.io}"
ZAP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$ZAP_DIR/out"
mkdir -p "$OUT_DIR"

# Same structural guard as k6/lib/config.js and backend/src/db/reset.js:
# refuse to run unless BASE_URL is the SCRUM-25 test environment.
# Production is served from a different host, so a typo cannot reach it.
case "$BASE_URL" in
  *"$TEST_HOST_MARKER"*) ;;
  *)
    echo "Refusing to run: BASE_URL ($BASE_URL) does not look like the SCRUM-25 test environment." >&2
    exit 1
    ;;
esac

# api METHOD PATH [BODY] — leaves the body in RESPONSE and the HTTP status in
# LAST_STATUS (globals, so it must not run in a subshell). Adds the bearer
# token and company header when set.
api() {
  local method="$1" path="$2" body="${3:-}"
  local args=(-sS -X "$method" -H 'Content-Type: application/json' --max-time 30
    -w '\n%{http_code}')
  [ -n "${TOKEN:-}" ] && args+=(-H "Authorization: Bearer $TOKEN")
  [ -n "${COMPANY_ID:-}" ] && args+=(-H "X-Company-ID: $COMPANY_ID")
  [ -n "$body" ] && args+=(--data "$body")
  local raw
  raw="$(curl "${args[@]}" "$BASE_URL/api$path")"
  LAST_STATUS="${raw##*$'\n'}"
  RESPONSE="${raw%$'\n'*}"
}

# json JQ_FILTER — applies a jq filter to the last RESPONSE.
json() { jq -r "$1" <<<"$RESPONSE" 2>/dev/null || true; }

login() {
  : "${ZAP_USER:?Set ZAP_USER to one of the SCRUM-25 seed accounts}"
  : "${ZAP_PASSWORD:?Set ZAP_PASSWORD (see docs/test-environment.md)}"
  local body
  body="$(jq -nc --arg e "$ZAP_USER" --arg p "$ZAP_PASSWORD" '{email:$e,password:$p}')"
  api POST /auth/login "$body"
  TOKEN="$(json '.token // .data.token // empty')"
  if [ "$LAST_STATUS" != 200 ] || [ -z "$TOKEN" ]; then
    echo "Login failed for $ZAP_USER (HTTP $LAST_STATUS)." >&2
    exit 1
  fi
  export TOKEN
}

# Resolves the seeded ids the scan plans need, so nothing is hardcoded to a
# particular seed run. Every value can be overridden from the environment.
discover_ids() {
  # first_id PATH FILTER — runs in the current shell (api sets globals).
  first_id() { api GET "$1"; json "$2"; }
  : "${COMPANY_ID:=$(first_id /companies/my-companies '.data[0].id_empresa // empty')}"
  [ -n "$COMPANY_ID" ] || { echo "Could not resolve the company id." >&2; exit 1; }
  export COMPANY_ID
  : "${PROJECT_ID:=$(first_id /projects '.data[0].id_proyecto // empty')}"
  : "${TASK_ID:=$(first_id "/projects/$PROJECT_ID/tasks" '(.data // [])[0].id_tarea // empty')}"
  : "${PRODUCT_ID:=$(first_id /products '(.data // [])[0].id_producto // empty')}"
  : "${SUPPLIER_ID:=$(first_id /suppliers '(.data // [])[0].id_proveedor // empty')}"
  : "${REPORT_ID:=$(first_id /reports '(.data // [])[0].id_reporte // empty')}"
  : "${USER_ID:=$(first_id /auth/me '.data.id_usuario // empty')}"
  export PROJECT_ID TASK_ID PRODUCT_ID SUPPLIER_ID REPORT_ID USER_ID
  # Fallback to 1 keeps the plan valid; a 404 on that request is harmless.
  for v in PROJECT_ID TASK_ID PRODUCT_ID SUPPLIER_ID REPORT_ID USER_ID; do
    [ -n "${!v}" ] || export "$v=1"
  done
  echo "ids: company=$COMPANY_ID project=$PROJECT_ID task=$TASK_ID product=$PRODUCT_ID supplier=$SUPPLIER_ID report=$REPORT_ID user=$USER_ID"
}
