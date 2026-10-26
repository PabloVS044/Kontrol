export const testMongoUri = () => process.env.TEST_MONGODB_URI ||
  'mongodb://127.0.0.1:27018/kontrol_privacy_test?replicaSet=rs0&directConnection=true'

export function assertSafeMongoTestUri(uri) {
  let url
  try { url = new URL(uri) } catch { throw new Error('Invalid TEST_MONGODB_URI.') }
  if (url.protocol !== 'mongodb:' ||
      !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
      url.pathname !== '/kontrol_privacy_test' || url.searchParams.get('directConnection') !== 'true') {
    throw new Error('Refusing Mongo cleanup: use a local direct connection to kontrol_privacy_test only.')
  }
}
