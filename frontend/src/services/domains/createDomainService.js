import { apiFetch as request } from '../http.js'

export function createDomainService(domain) {
  const prefix = `/api/${domain}`

  return (path, options) => {
    if (typeof path !== 'string') {
      throw new TypeError(`The ${domain} service requires a URL string`)
    }

    const pathname = path.startsWith('http')
      ? new URL(path).pathname
      : path.split(/[?#]/, 1)[0]
    if (pathname !== prefix && !pathname.startsWith(`${prefix}/`)) {
      throw new TypeError(`The ${domain} service cannot request ${pathname}`)
    }

    return request(path, options)
  }
}
