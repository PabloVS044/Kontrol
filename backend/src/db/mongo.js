import mongoose from 'mongoose'
import { logger } from '../utils/logger.js'

mongoose.set('bufferCommands', false)

export function isMongoReady() {
  return mongoose.connection.readyState === 1
}

export async function connectMongo() {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI is not defined in environment variables')

  mongoose.connection.on('connected', () => logger.info('MongoDB connected'))
  mongoose.connection.on('error', err => logger.error('MongoDB error:', err))
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'))

  await mongoose.connect(uri)
}
