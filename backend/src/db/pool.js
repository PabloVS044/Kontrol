import pg from 'pg'
import { buildPoolConfig } from './poolConfig.js'

const { Pool } = pg

const pool = new Pool(buildPoolConfig())

export default pool
