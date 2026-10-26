import '../db/env.js'
import { assertSafeMongoTestUri, testMongoUri } from './testMongoDatabase.js'
const uri = testMongoUri()
assertSafeMongoTestUri(uri)
process.env.MONGODB_URI = uri
