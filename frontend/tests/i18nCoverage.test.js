import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Guardia contra textos fijos (pruebas 9 y 10).
 *
 * Los cinco participantes encontraron pantallas enteras en el idioma anterior.
 * La causa nunca fue el diccionario: era texto escrito directamente en la
 * plantilla, que ningún cambio de idioma puede tocar. Este test recorre las
 * pantallas que estaban afectadas y falla si vuelve a aparecer texto suelto.
 *
 * Solo mira plantillas: el `<script>` y el `<style>` quedan fuera.
 */

const RAIZ = resolve(__dirname, '..', 'src')

/** Pantallas y componentes que las pruebas señalaron, ya conectados. */
const ARCHIVOS = [
  'components/AppNavbar.vue',
  'components/billing/PlanRequiredNotice.vue',
  'components/billing/TestModeBanner.vue',
  'components/Footer.vue',
  'components/LegalConsentModal.vue',
  'components/StorageConsentBanner.vue',
  'components/StorageConsentControls.vue',
  'components/Navbar.vue',
  'components/admin/AdminNavbar.vue',
  'components/common/LanguageSelector.vue',
  'components/chat/FloatingChat.vue',
  'components/chat/VideoCallOverlay.vue',
  'views/AgentView.vue',
  'views/BillingView.vue',
  'views/ChatView.vue',
  'views/LandingPage.vue',
  'views/LegalView.vue',
  'views/NotFoundView.vue',
  'views/IntegrationsView.vue',
  'views/InviteView.vue',
  'views/OnboardingView.vue',
  'views/ProductDetailView.vue',
  'views/SalesView.vue',
  'views/SettingsView.vue',
  'views/SuppliersView.vue',
]

/**
 * Lo que sí puede estar escrito en la plantilla: la marca, los identificadores
 * del backend y los nombres de los idiomas, que no se traducen nunca.
 */
const PERMITIDO = new Set([
  'Kontrol',
  'AGENT_API_KEY',
  'AGENT_API_URL',
  'English',
  'Español',
  // Nombres propios de redes sociales: no se traducen en ningún idioma.
  'Twitter',
  'LinkedIn',
  'Instagram',
  'GitHub',
])

/** Devuelve el `<template>` sin comentarios. */
function plantilla(ruta) {
  const src = readFileSync(resolve(RAIZ, ruta), 'utf8')
  const bloque = src.match(/<template>([\s\S]*?)\n<\/template>/)
  return (bloque?.[1] ?? '').replace(/<!--[\s\S]*?-->/g, '')
}

/** Texto suelto entre etiquetas y atributos visibles sin enlazar. */
function textosFijos(tpl) {
  const encontrados = []

  for (const [, texto] of tpl.matchAll(/>([^<>{}]+)</g)) {
    const limpio = texto.trim()
    if (limpio.length < 3) continue
    if (!/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{3}/.test(limpio)) continue
    if (PERMITIDO.has(limpio)) continue
    encontrados.push(limpio)
  }

  // `placeholder="…"` en vez de `:placeholder="t(…)"` es el mismo problema:
  // el texto se ve y no cambia de idioma.
  for (const [, atributo] of tpl.matchAll(/\s(?:placeholder|title|aria-label|alt)="([^"{}]+)"/g)) {
    const limpio = atributo.trim()
    if (!/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{3}/.test(limpio)) continue
    if (PERMITIDO.has(limpio)) continue
    encontrados.push(`[atributo] ${limpio}`)
  }

  return encontrados
}

describe('pantallas sin texto fijo', () => {
  it.each(ARCHIVOS)('%s pide todo su texto al diccionario', (ruta) => {
    expect(textosFijos(plantilla(ruta))).toEqual([])
  })
})
