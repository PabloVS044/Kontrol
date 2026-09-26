#!/usr/bin/env bash
# Directed checks for the three security controls closed this sprint.
#
#   zap/verify-controls.sh headers     # SCRUM-45 / DT-14, master test plan SEC2
#   zap/verify-controls.sh ratelimit   # SCRUM-44 / DT-13
#   zap/verify-controls.sh ssrf        # SCRUM-43 / DT-12
#   zap/verify-controls.sh ssrf-redirect  # needs an external redirector (httpbin.org)
#
# headers and ssrf need ZAP_USER / ZAP_PASSWORD. ssrf creates a company owned
# by that account (the DT-12 vector) and leaves it for `reset:test` to remove.
set -euo pipefail
source "$(dirname "$0")/lib/common.sh"

CHECK="${1:?usage: verify-controls.sh headers|ratelimit|ssrf|ssrf-redirect}"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
log="$OUT_DIR/verify-$CHECK-$stamp.txt"
exec > >(tee "$log") 2>&1
echo "# $CHECK — $BASE_URL — $(date -u +%FT%TZ)"

# The five headers required by docs/plan-maestro-pruebas.md §9.2.
REQUIRED_HEADERS=(content-security-policy x-content-type-options x-frame-options strict-transport-security referrer-policy)

check_headers() {
  local label="$1"; shift
  local headers
  headers="$(curl -sS -D - -o /dev/null --max-time 15 "$@" | tr -d '\r')"
  echo "## $label"
  echo "$headers" | head -1
  local missing=0
  for h in "${REQUIRED_HEADERS[@]}"; do
    local line
    line="$(grep -i "^$h:" <<<"$headers" || true)"
    if [ -n "$line" ]; then echo "  OK      $line"; else echo "  MISSING $h"; missing=$((missing + 1)); fi
  done
  local powered
  powered="$(grep -i '^x-powered-by:' <<<"$headers" || true)"
  echo "  ${powered:+PRESENT }${powered:-OK      x-powered-by absent}"
  echo "  result: $((${#REQUIRED_HEADERS[@]} - missing))/${#REQUIRED_HEADERS[@]}"
  echo
}

case "$CHECK" in
  headers)
    login
    check_headers "public: GET /api/health" "$BASE_URL/api/health"
    check_headers "authenticated: GET /api/auth/me" -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/auth/me"
    check_headers "SPA document (nginx, outside the SEC2 criterion): GET /" "$BASE_URL/"
    ;;

  ratelimit)
    # Unknown account on purpose: no seeded account is touched and there is
    # nothing to lock out. Sequential, one request at a time.
    attempts="${ATTEMPTS:-20}"
    declare -A codes=()
    for i in $(seq 1 "$attempts"); do
      api POST /auth/login '{"email":"zap-probe@kontrol-test.dev","password":"wrong-password"}'
      codes[$LAST_STATUS]=$(( ${codes[$LAST_STATUS]:-0} + 1 ))
      printf '%2d -> %s\n' "$i" "$LAST_STATUS"
    done
    echo "summary:"; for c in "${!codes[@]}"; do echo "  HTTP $c x ${codes[$c]}"; done
    echo "rate limit triggered: $([ -n "${codes[429]:-}" ] && echo yes || echo no)"
    ;;

  ssrf|ssrf-redirect)
    login
    api POST /companies '{"nombre":"ZAP SSRF probe","industria":"security test"}'
    [ "$LAST_STATUS" = 201 ] || { echo "could not create the probe company (HTTP $LAST_STATUS): $RESPONSE"; exit 1; }
    COMPANY_ID="$(json '.data.id_empresa')"
    echo "probe company id_empresa=$COMPANY_ID (owner: $ZAP_USER)"
    echo

    if [ "$CHECK" = ssrf ]; then
      # Every internal target points at the test backend's own harmless
      # health route; never at production service names (backend, postgres).
      targets=(
        "must-block|http://127.0.0.1:3000/api/health"
        "must-block|http://localhost:3000/api/health"
        "must-block|http://10.0.0.1/"
        "must-block|http://172.17.0.1/"
        "must-block|http://192.168.1.1/"
        "must-block|http://169.254.169.254/computeMetadata/v1/"
        "must-block|http://metadata.google.internal/computeMetadata/v1/"
        "must-block|http://[::1]:3000/api/health"
        "must-block|http://[fe80::1]/"
        "must-block|http://[fd00::1]/"
        "must-block|http://127.0.0.1.nip.io:3000/api/health"
        "must-block|file:///etc/passwd"
        "bypass-hypothesis|http://0.0.0.0:3000/api/health"
        "bypass-hypothesis|http://[::ffff:127.0.0.1]:3000/api/health"
        "bypass-hypothesis|http://127.1:3000/api/health"
        "bypass-hypothesis|http://2130706433:3000/api/health"
        "control-public|https://example.com/"
      )
    else
      targets=(
        "bypass-hypothesis|https://httpbin.org/redirect-to?url=http%3A%2F%2F127.0.0.1%3A3000%2Fapi%2Fhealth&status_code=307"
      )
    fi

    guard_msg='La URL debe apuntar a un host público.'
    printf '%-18s | %-6s | %-6s | %-8s | %s\n' kind save test verdict "url -> message"
    for entry in "${targets[@]}"; do
      kind="${entry%%|*}"; url="${entry#*|}"
      body="$(jq -nc --arg u "$url" '{credentials:{url:$u},config:{}}')"
      api PUT /integrations/webhook "$body"
      save_status="$LAST_STATUS"; save_msg="$(json '.message // empty')"
      test_status="-"; test_msg=""
      if [ "$save_status" = 200 ] || [ "$save_status" = 201 ]; then
        api POST /integrations/webhook/test
        test_status="$LAST_STATUS"; test_msg="$(json '.message // empty')"
      fi
      if [ "$save_status" != 200 ] && [ "$save_status" != 201 ]; then verdict="SCHEMA"
      elif [ "$test_msg" = "$guard_msg" ]; then verdict="GUARD"
      else verdict="REACHED"; fi
      printf '%-18s | %-6s | %-6s | %-8s | %s -> %s\n' "$kind" "$save_status" "$test_status" "$verdict" "$url" "${test_msg:-$save_msg}"
    done
    api DELETE /integrations/webhook || true
    echo
    echo "SCHEMA/GUARD = rejected before any outbound request; REACHED = the backend sent the request."
    echo "A must-block or bypass-hypothesis row marked REACHED is an open SSRF path."
    ;;

  *) echo "unknown check: $CHECK" >&2; exit 1 ;;
esac
echo "log: $log"
