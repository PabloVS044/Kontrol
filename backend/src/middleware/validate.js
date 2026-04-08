/**
 * Generic Zod validation middleware.
 *
 * @param {import('zod').ZodTypeAny} schema - Zod schema to validate against
 * @param {'body'|'query'|'params'} source   - Which part of req to validate (default: 'body')
 */
const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source])

  if (!result.success) {
    const errors = result.error.errors.map((e) => ({
      field:   e.path.join('.') || source,
      message: e.message,
    }))

    return res.status(400).json({
      success: false,
      message: 'Datos inválidos.',
      errors,
    })
  }

  // Replace with parsed/coerced data so controllers always receive clean values
  req[source] = result.data
  next()
}

export default validate
