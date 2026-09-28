# Structural safety guard for every volume script, same idea as
# backend/src/db/reset.js and k6/lib/config.js: refuse to touch a database
# unless it is provably the isolated SCRUM-25 test database.
#
# Three independent checks, all required:
#   1. The URL comes from VOLUME_DATABASE_URL, never from DATABASE_URL — so
#      backend/.env (which points at the VM's database) can never leak in.
#   2. The host is Supabase and is not the VM that serves prod and dev.
#   3. The database already holds the seeded test company (seed.js), which
#      production and development never contain.
#
# VOLUME_ALLOW_LOCAL=1 additionally accepts localhost, only so the scripts
# can be dry-run against a throwaway local cluster. Check 3 still applies.

VM_HOST='34.121.51.151'
SUPABASE_MARKER="${TEST_DB_HOST_MARKER:-supabase.co}"
SEED_COMPANY_EMAIL='contacto@lospinos-test.dev'

die() { echo "ERROR: $*" >&2; exit 1; }

[ -n "${VOLUME_DATABASE_URL:-}" ] || die "VOLUME_DATABASE_URL no está definida. Debe ser la cadena del Session pooler de la base Supabase de pruebas (TEST_DATABASE_URL en .env.deploy)."

case "$VOLUME_DATABASE_URL" in
  *"$VM_HOST"*) die "VOLUME_DATABASE_URL apunta a la VM ($VM_HOST), que sirve producción y desarrollo. Abortado." ;;
esac

if [ "${VOLUME_ALLOW_LOCAL:-}" = "1" ]; then
  case "$VOLUME_DATABASE_URL" in
    *@localhost[:/]*|*@127.0.0.1[:/]*|*"$SUPABASE_MARKER"*) ;;
    *) die "Con VOLUME_ALLOW_LOCAL=1 solo se acepta localhost o Supabase." ;;
  esac
else
  case "$VOLUME_DATABASE_URL" in
    *"$SUPABASE_MARKER"*) ;;
    *) die "VOLUME_DATABASE_URL no contiene \"$SUPABASE_MARKER\": no parece la base de pruebas. Abortado." ;;
  esac
fi

export PGCONNECT_TIMEOUT=15
PSQL=(psql "$VOLUME_DATABASE_URL" -X -q -v ON_ERROR_STOP=1)

seed_ok=$("${PSQL[@]}" -tAc "SELECT count(*) FROM public.empresa WHERE email = '$SEED_COMPANY_EMAIL'") \
  || die "No se pudo consultar la base: sin conexión, o no tiene el esquema de Kontrol."
[ "$seed_ok" = "1" ] || die "La base no contiene la empresa sembrada del ambiente de pruebas ($SEED_COMPANY_EMAIL). Solo se ejecuta contra la base de SCRUM-25."
