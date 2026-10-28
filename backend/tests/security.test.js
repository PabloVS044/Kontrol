import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';

describe('DT-14 · Cabeceras de seguridad HTTP (SEC2)', () => {
  it('debe responder con las 5 cabeceras de seguridad requeridas', async () => {
    const response = await request(app).get('/api');

    // 1. Content Security Policy
    expect(response.headers).toHaveProperty('content-security-policy');

    // 2. X-Content-Type-Options
    expect(response.headers['x-content-type-options']).toBe('nosniff');

    // 3. X-Frame-Options (Protección Clickjacking)
    expect(response.headers['x-frame-options']).toBe('DENY');

    // 4. Referrer Policy
    expect(response.headers['referrer-policy']).toBe('no-referrer');

    // 5. HSTS (en entorno de producción / configurado)
    expect(response.headers).toHaveProperty('strict-transport-security');
  });
});
describe('DT-19 · Una sola configuración de helmet (RTF 2, SEC-01)', () => {
  // Una ruta de la API: el 404 por defecto de Express pone su propia CSP.
  it('la CSP que sale es la propia, no la genérica de una segunda instancia', async () => {
    const response = await request(app).get('/api/auth/me');
    const csp = response.headers['content-security-policy'];

    // La genérica de helmet trae frame-ancestors 'self' y no declara connect-src.
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("connect-src 'self'");
    expect(response.headers['x-frame-options']).toBe('DENY');
  });

  it('mantiene el HSTS que estaba en vigor', async () => {
    const response = await request(app).get('/api/auth/me');

    expect(response.headers['strict-transport-security']).toBe(
      'max-age=15552000; includeSubDomains; preload',
    );
  });

  it('las respuestas de la API no se guardan en caché', async () => {
    const response = await request(app).get('/api/auth/me');

    expect(response.headers['cache-control']).toBe('no-store');
  });
});
