/* global db, EJSON, print */
const data = db.getSiblingDB('kontrol_p2_drill')
const crypto = require('node:crypto')
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]))
  return value
}
const result = data.getCollectionInfos().filter((c) => !c.name.startsWith('system.')).sort((a, b) => a.name.localeCompare(b.name)).map((info) => {
  const collection = data.getCollection(info.name)
  const documents = collection.find().toArray().map((doc) => JSON.stringify(canonical(EJSON.serialize(doc, { relaxed: false })))).sort()
  // Preserve compound index field order explicitly.
  const indexes = collection.getIndexes().map((index) => ({ ...index, key: Object.entries(index.key) })).sort((a, b) => a.name.localeCompare(b.name))
  return {
    name: info.name, type: info.type, options: canonical(EJSON.serialize(info.options)),
    count: documents.length,
    sha256: crypto.createHash('sha256').update(documents.join('\n')).digest('hex'),
    indexes: canonical(EJSON.serialize(indexes, { relaxed: false })),
  }
})
print(JSON.stringify(result))
