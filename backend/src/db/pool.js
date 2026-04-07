import pg from 'pg'

const { Pool } = pg

// Supabase provides a full connection string — use it directly.
// Found in: Supabase dashboard → Project Settings → Database → Connection string (URI mode)
// Use port 6543 (pgBouncer / Transaction mode) for serverless/edge; 5432 for persistent servers.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // required by Supabase
})

export default pool
