import helmet from 'helmet';

/**
 * Única configuración de helmet de la API (DT-19, RTF 2). Antes `index.js`
 * aplicaba una segunda instancia con sus valores por defecto, que reemplazaba
 * esta CSP por la genérica (`frame-ancestors 'self'` en lugar de `'none'`).
 * El HSTS que se conserva es el de aquella segunda instancia, porque era el
 * que de verdad salía en las respuestas.
 */
export function securityMiddleware(app) {
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          baseUri: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          formAction: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          fontSrc: ["'self'", 'https:', 'data:'],
          connectSrc: ["'self'"],
        },
      },

      frameguard: {
        action: 'deny',
      },

      referrerPolicy: {
        policy: 'no-referrer',
      },

      // Un navegador ignora HSTS sobre http, así que no hace falta limitarlo
      // a producción.
      strictTransportSecurity: {
        maxAge: 15552000, // 180 días en segundos
        includeSubDomains: true,
        preload: true,
      },
    }),
  );

  app.use((req, res, next) => {
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=()',
    );
    // Las respuestas de la API llevan datos de la sesión: ni el navegador ni
    // un proxy intermedio deben guardarlas. Una ruta que necesite caché puede
    // sobrescribir la cabecera.
    res.setHeader('Cache-Control', 'no-store');

    next();
  });
}
