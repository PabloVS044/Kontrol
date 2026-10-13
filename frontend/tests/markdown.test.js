import { describe, it, expect } from 'vitest'
import { renderMarkdown } from '@/utils/markdown.js'

// La sanitización (DOMPurify y su hook de enlaces) no se verifica aquí:
// DOMPurify no se comporta de forma fiable sobre happy-dom —con el hook
// activo llega a eliminar enlaces válidos y deja pasar `onerror`—, así que
// una aserción de seguridad en este entorno no probaría nada sobre el
// navegador real. Verificarla requiere un entorno con DOM completo (jsdom
// o navegador).
describe('renderMarkdown', () => {
  it('devuelve cadena vacía para entradas vacías o que no son string', () => {
    expect(renderMarkdown('')).toBe('')
    expect(renderMarkdown(null)).toBe('')
    expect(renderMarkdown(42)).toBe('')
  })

  it('renderiza markdown con saltos de línea simples como <br>', () => {
    const html = renderMarkdown('**hola**\nmundo')
    expect(html).toContain('<strong>hola</strong>')
    expect(html).toContain('<br>')
  })
})
