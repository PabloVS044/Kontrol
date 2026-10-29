// Reparto y tiempos tope del guion (en segundos). `who` aparece en la vista de presentador.
export const SECTIONS = {
  0: { n: '00', title: 'Kontrol', who: '—', tope: 0 },
  1: { n: '01', title: 'Problema y contexto', who: 'Pablo', tope: 75 },
  2: { n: '02', title: 'Solución y propuesta de valor', who: 'Ivana', tope: 45 },
  '3a': { n: '03', title: 'Producto · panorama y ejecución', who: 'Pablo', tope: 150 },
  '3b': { n: '03', title: 'Producto · recursos, decisiones e IA', who: 'Pablo', tope: 220 },
  4: { n: '04', title: 'Arquitectura y stack', who: 'Jonathan', tope: 120 },
  5: { n: '05', title: 'Datos y estructura', who: 'Juan', tope: 120 },
  '6a': { n: '06', title: 'Calidad · volumen y usabilidad', who: 'Juan', tope: 35 },
  '6b': { n: '06', title: 'Calidad · CI, seguridad y carga', who: 'Jonathan', tope: 40 },
  7: { n: '07', title: 'Proceso y evolución', who: 'Saraí', tope: 135 },
  8: { n: '08', title: 'Lanzamiento · legal y negocio', who: 'Ivana', tope: 90 },
  9: { n: '09', title: 'Cierre', who: 'Jonathan', tope: 30 },
}

export const TOTAL_TOPE = 17 * 60 + 40
