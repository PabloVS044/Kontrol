import pool from './pool.js'

const TEST_COMPANY_EMAIL = 'contacto@lospinos-test.dev'
const REQUIRED_ACCOUNTS = [
  'participante1@kontrol-test.dev',
  'participante2@kontrol-test.dev',
  'participante3@kontrol-test.dev',
]

export async function verifyUxPhase2() {
  const { rows: companies } = await pool.query(
    'SELECT id_empresa, nombre FROM public.empresa WHERE email = $1',
    [TEST_COMPANY_EMAIL]
  )
  if (!companies.length) throw new Error('No existe la empresa de prueba de SCRUM-25.')

  const company = companies[0]
  const [{ rows: suppliers }, { rows: publications }, { rows: accounts }] = await Promise.all([
    pool.query(
      'SELECT COUNT(*)::int AS count FROM public.proveedor WHERE id_empresa = $1',
      [company.id_empresa]
    ),
    pool.query(
      'SELECT COUNT(*)::int AS count FROM public.marketing_publication WHERE id_empresa = $1',
      [company.id_empresa]
    ),
    pool.query(
      'SELECT email FROM public.usuario WHERE email = ANY($1::text[]) ORDER BY email',
      [REQUIRED_ACCOUNTS]
    ),
  ])

  const result = {
    company: company.nombre,
    suppliers: suppliers[0].count,
    publications: publications[0].count,
    participantAccounts: accounts.length,
  }

  console.log('Verificación de datos para UX Fase 2')
  console.table(result)

  const failures = []
  if (result.suppliers < 1) failures.push('falta al menos un proveedor para F2')
  if (result.publications < 1) failures.push('falta al menos una publicación para F5')
  if (result.participantAccounts !== REQUIRED_ACCOUNTS.length) failures.push('faltan cuentas P01-P03')

  if (failures.length) {
    throw new Error(`Ambiente no listo: ${failures.join('; ')}.`)
  }

  console.log('AMBIENTE LISTO: se cumplen los prerrequisitos de F2 y F5.')
  return result
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`
if (isMain) {
  verifyUxPhase2()
    .then(() => pool.end())
    .catch((error) => {
      console.error(error.message)
      process.exitCode = 1
    })
}
