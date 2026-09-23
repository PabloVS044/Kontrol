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