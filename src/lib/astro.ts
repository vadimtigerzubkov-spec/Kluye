// Low-precision lunar calculations (adapted from the SunCalc algorithms).
// Accurate to a few minutes, which is plenty for solunar fishing periods.

const rad = Math.PI / 180
const dayMs = 86_400_000
const J1970 = 2440588
const J2000 = 2451545
const e = rad * 23.4397

const toDays = (ms: number) => ms / dayMs - 0.5 + J1970 - J2000

const rightAscension = (l: number, b: number) =>
  Math.atan2(Math.sin(l) * Math.cos(e) - Math.tan(b) * Math.sin(e), Math.cos(l))

const declination = (l: number, b: number) =>
  Math.asin(Math.sin(b) * Math.cos(e) + Math.cos(b) * Math.sin(e) * Math.sin(l))

function moonCoords(d: number) {
  const L = rad * (218.316 + 13.176396 * d)
  const M = rad * (134.963 + 13.064993 * d)
  const F = rad * (93.272 + 13.22935 * d)
  const l = L + rad * 6.289 * Math.sin(M)
  const b = rad * 5.128 * Math.sin(F)
  return {
    ra: rightAscension(l, b),
    dec: declination(l, b),
    dist: 385001 - 20905 * Math.cos(M),
  }
}

function sunCoords(d: number) {
  const M = rad * (357.5291 + 0.98560028 * d)
  const C =
    rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M))
  const L = M + C + rad * 102.9372 + Math.PI
  return { ra: rightAscension(L, 0), dec: declination(L, 0) }
}

/** Moon altitude above the horizon, in radians. */
export function moonAltitude(ms: number, lat: number, lng: number) {
  const d = toDays(ms)
  const c = moonCoords(d)
  const H = rad * (280.16 + 360.9856235 * d) - rad * -lng - c.ra
  const phi = rad * lat
  return Math.asin(
    Math.sin(phi) * Math.sin(c.dec) + Math.cos(phi) * Math.cos(c.dec) * Math.cos(H),
  )
}

export type MoonInfo = {
  /** 0 = new moon, 0.5 = full moon, 1 = next new moon. */
  phase: number
  /** Illuminated fraction, 0–1. */
  fraction: number
  name: string
}

export function moonIllumination(ms: number): MoonInfo {
  const d = toDays(ms)
  const s = sunCoords(d)
  const m = moonCoords(d)
  const sdist = 149598000
  const phi = Math.acos(
    Math.sin(s.dec) * Math.sin(m.dec) +
      Math.cos(s.dec) * Math.cos(m.dec) * Math.cos(s.ra - m.ra),
  )
  const inc = Math.atan2(sdist * Math.sin(phi), m.dist - sdist * Math.cos(phi))
  const angle = Math.atan2(
    Math.cos(s.dec) * Math.sin(s.ra - m.ra),
    Math.sin(s.dec) * Math.cos(m.dec) -
      Math.cos(s.dec) * Math.sin(m.dec) * Math.cos(s.ra - m.ra),
  )
  const phase = 0.5 + (0.5 * inc * (angle < 0 ? -1 : 1)) / Math.PI
  return { phase, fraction: (1 + Math.cos(inc)) / 2, name: moonPhaseName(phase) }
}

function moonPhaseName(p: number) {
  if (p < 0.03 || p > 0.97) return 'Молодик'
  if (p < 0.22) return 'Молодий місяць'
  if (p < 0.28) return 'Перша чверть'
  if (p < 0.47) return 'Місяць, що росте'
  if (p < 0.53) return 'Повня'
  if (p < 0.72) return 'Місяць, що спадає'
  if (p < 0.78) return 'Остання чверть'
  return 'Старий місяць'
}

export type SolunarPeriod = {
  kind: 'major' | 'minor'
  /** Local hours from midnight (may be fractional). */
  start: number
  end: number
  center: number
  label: string
}

/**
 * Solunar periods for one local day. Major periods are ±1 h around the moon's
 * upper and lower transit; minor periods are ±30 min around moonrise/moonset.
 */
export function solunarPeriods(
  dayStartMs: number,
  lat: number,
  lng: number,
): SolunarPeriod[] {
  const step = 5 / 60
  const samples: number[] = []
  for (let h = -step; h <= 24 + step; h += step) {
    samples.push(moonAltitude(dayStartMs + h * 3_600_000, lat, lng))
  }
  const periods: SolunarPeriod[] = []
  for (let i = 1; i < samples.length - 1; i++) {
    const h = (i - 1) * step
    if (h < 0 || h > 24) continue
    const [a, b, c] = [samples[i - 1], samples[i], samples[i + 1]]
    if (b > a && b >= c) {
      periods.push(period('major', h, 1, 'Місяць у зеніті'))
    } else if (b < a && b <= c) {
      periods.push(period('major', h, 1, 'Місяць у надирі'))
    }
    if (a < 0 && b >= 0) periods.push(period('minor', h, 0.5, 'Схід місяця'))
    if (a > 0 && b <= 0) periods.push(period('minor', h, 0.5, 'Захід місяця'))
  }
  return periods.sort((x, y) => x.center - y.center)
}

function period(
  kind: SolunarPeriod['kind'],
  center: number,
  half: number,
  label: string,
): SolunarPeriod {
  return { kind, center, start: center - half, end: center + half, label }
}
