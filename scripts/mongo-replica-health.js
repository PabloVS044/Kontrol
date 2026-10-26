/* global db, rs, quit, print */
// Executed by mongosh inside the local/test Mongo container, never in production.
try {
  const status = db.adminCommand({ hello: 1 })
  if (status.isWritablePrimary && status.setName) quit(0)
  try { rs.status() } catch (error) {
    if (error.code !== 94) throw error
    rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: process.env.MONGO_REPLICA_HOST || '127.0.0.1:27017' }] })
  }
  quit(1)
} catch (error) {
  print(error.message)
  quit(1)
}
