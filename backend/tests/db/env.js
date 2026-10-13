// setupFile: corre en cada worker ANTES de importar la suite, y por tanto
// antes de que `src/db/pool.js` lea DATABASE_URL. `src/index.js` carga
// `dotenv/config`, que no pisa variables ya definidas: lo que se fija aquí
// gana sobre el `.env` de desarrollo, que apunta a Supabase.
import { assertSafeTestDatabase, testDatabaseUrl } from './testDatabase.js'

const url = testDatabaseUrl()
assertSafeTestDatabase(url)

process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = url
process.env.DATABASE_SSL = 'false'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'kontrol-integration-secret'
process.env.JWT_EXPIRES_IN = '1h'
// Todas las peticiones salen de la misma IP; los límites por IP de login
// cortarían la suite a la mitad.
process.env.RATE_LIMIT_ENABLED = 'false'
// bcrypt a costo 10 cuesta ~70 ms por hash; a 4 la suite no espera por él.
process.env.BCRYPT_SALT_ROUNDS = '4'
// Sin URL del agente ni MongoDB: esas integraciones no son parte de estas suites.
process.env.MONGODB_URI = ''
