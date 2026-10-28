// coverage-thresholds.mjs — Control de los umbrales de cobertura por módulo.
//
// RTF 2 (TEST-01): Vitest aprueba en silencio un umbral cuyo glob no casa con
// ningún archivo. Pasó con los tres umbrales de reportes del frontend durante
// un mes (DT-06), y un renombre lo puede volver a provocar sin que nadie lo
// note. Los dos `vitest.config.js` pasan sus umbrales por aquí y la
// configuración falla al cargar si algún glob se queda vacío.
import { globSync } from 'node:fs'

// Claves de `coverage.thresholds` que no son globs.
const OPCIONES = new Set(['statements', 'branches', 'functions', 'lines', 'perFile', 'autoUpdate', '100'])

/** Devuelve los globs de `thresholds` que no casan con ningún archivo bajo `cwd`. */
export function emptyThresholdGlobs(thresholds, cwd) {
  return Object.entries(thresholds)
    .filter(([clave, valor]) => !OPCIONES.has(clave) && valor && typeof valor === 'object')
    .map(([glob]) => glob)
    .filter((glob) => globSync(glob, { cwd }).length === 0)
}

/** Lanza si algún glob de umbral no casa con nada; si no, devuelve `thresholds` tal cual. */
export function assertThresholdGlobsMatch(thresholds, cwd) {
  const vacios = emptyThresholdGlobs(thresholds, cwd)
  if (vacios.length) {
    throw new Error(
      `Umbrales de cobertura que no casan con ningún archivo: ${vacios.join(', ')}. ` +
        'Un umbral así aprueba siempre; corrige la ruta o quítalo.'
    )
  }
  return thresholds
}
