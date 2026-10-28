// Weather and geocoding via Open-Meteo (free, no API key, CORS-enabled).

export type Place = {
  name: string
  /** "село", "місто", "водосховище"… */
  kind?: string
  /** Район. */
  district?: string
  region?: string
  country?: string
  lat: number
  lng: number
}

export type HourWeather = {
  /** Local ISO time, e.g. "2026-10-26T06:00". */
  time: string
  date: string
  hour: number
  temp: number
  humidity: number
  pressure: number
  cloud: number
  precip: number
  precipProb: number
  wind: number
  gust: number
  windDir: number
  code: number
}

export type WeatherData = {
  hours: HourWeather[]
  /** Sunrise/sunset per local date, as fractional local hours. */
  sun: Record<string, { sunrise: number; sunset: number }>
  utcOffsetSeconds: number
  timezone: string
}

// Place search uses Photon (OpenStreetMap data): unlike Open-Meteo's GeoNames-based
// geocoder it knows small Ukrainian villages, matches prefixes while typing and
// returns the district, which tells same-named villages apart.
const PLACE_KINDS: Record<string, string> = {
  city: 'місто',
  town: 'місто',
  village: 'село',
  hamlet: 'село',
  suburb: 'район міста',
  quarter: 'район міста',
  neighbourhood: 'район міста',
  locality: 'урочище',
  isolated_dwelling: 'хутір',
  water: 'водойма',
  reservoir: 'водосховище',
  lake: 'озеро',
  pond: 'ставок',
  river: 'річка',
  oxbow: 'стариця',
}

export async function searchPlaces(
  query: string,
  near?: Place,
): Promise<Place[]> {
  try {
    return await searchPhoton(query, near)
  } catch {
    return searchOpenMeteo(query)
  }
}

async function searchPhoton(query: string, near?: Place): Promise<Place[]> {
  const url = new URL('https://photon.komoot.io/api/')
  url.searchParams.set('q', query)
  url.searchParams.set('limit', '15')
  url.searchParams.append('osm_tag', 'place')
  url.searchParams.append('osm_tag', 'water')
  url.searchParams.append('osm_tag', 'natural:water')
  url.searchParams.append('osm_tag', 'landuse:reservoir')
  // Prefer results near the current place (Kyiv by default).
  url.searchParams.set('lat', String(near?.lat ?? 50.45))
  url.searchParams.set('lon', String(near?.lng ?? 30.52))
  url.searchParams.set('location_bias_scale', '0.3')
  const res = await fetch(url)
  if (!res.ok) throw new Error('Не вдалося знайти місце')
  const data = (await res.json()) as {
    features: Array<{
      geometry: { coordinates: [number, number] }
      properties: {
        name?: string
        osm_key: string
        osm_value: string
        water?: string
        city?: string
        county?: string
        state?: string
        country?: string
        countrycode?: string
      }
    }>
  }
  const seen = new Set<string>()
  const ukraine: Place[] = []
  const abroad: Place[] = []
  for (const f of data.features) {
    const p = f.properties
    const kind =
      p.osm_key === 'place'
        ? PLACE_KINDS[p.osm_value]
        : PLACE_KINDS[p.water ?? p.osm_value]
    if (!p.name || (p.osm_key === 'place' && !kind)) continue
    const [lng, lat] = f.geometry.coordinates
    const key = `${p.name}|${p.county}|${lat.toFixed(2)},${lng.toFixed(2)}`
    if (seen.has(key)) continue
    seen.add(key)
    const list = p.countrycode === 'UA' ? ukraine : abroad
    list.push({
      name: p.name,
      kind: kind ?? 'водойма',
      // Kyiv neighbourhoods have no district, only the city.
      district: p.county ?? p.city,
      region: p.state,
      country: p.country,
      lat,
      lng,
    })
  }
  // Ukrainian results first, keeping Photon's relevance order otherwise.
  return [...ukraine, ...abroad].slice(0, 8)
}

async function searchOpenMeteo(query: string): Promise<Place[]> {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search')
  url.searchParams.set('name', query)
  url.searchParams.set('count', '8')
  url.searchParams.set('language', 'uk')
  url.searchParams.set('format', 'json')
  const res = await fetch(url)
  if (!res.ok) throw new Error('Не вдалося знайти місце')
  const data = (await res.json()) as {
    results?: Array<{
      name: string
      admin1?: string
      admin2?: string
      country?: string
      latitude: number
      longitude: number
    }>
  }
  return (data.results ?? []).map((r) => ({
    name: r.name,
    district: r.admin2,
    region: r.admin1,
    country: r.country,
    lat: r.latitude,
    lng: r.longitude,
  }))
}

const HOURLY = [
  'temperature_2m',
  'relative_humidity_2m',
  'pressure_msl',
  'cloud_cover',
  'precipitation',
  'precipitation_probability',
  'wind_speed_10m',
  'wind_gusts_10m',
  'wind_direction_10m',
  'weather_code',
] as const

export async function fetchWeather(
  lat: number,
  lng: number,
): Promise<WeatherData> {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', lat.toFixed(4))
  url.searchParams.set('longitude', lng.toFixed(4))
  url.searchParams.set('hourly', HOURLY.join(','))
  url.searchParams.set('daily', 'sunrise,sunset')
  url.searchParams.set('timezone', 'auto')
  url.searchParams.set('wind_speed_unit', 'ms')
  url.searchParams.set('past_days', '3')
  url.searchParams.set('forecast_days', '14')
  const res = await fetch(url)
  if (!res.ok) throw new Error('Не вдалося отримати прогноз погоди')
  const d = (await res.json()) as {
    utc_offset_seconds: number
    timezone: string
    hourly: Record<(typeof HOURLY)[number], Array<number | null>> & {
      time: string[]
    }
    daily: { time: string[]; sunrise: string[]; sunset: string[] }
  }
  const h = d.hourly
  const num = (v: number | null | undefined, fallback = 0) => v ?? fallback
  const hours: HourWeather[] = h.time.map((time, i) => ({
    time,
    date: time.slice(0, 10),
    hour: Number(time.slice(11, 13)),
    temp: num(h.temperature_2m[i]),
    humidity: num(h.relative_humidity_2m[i]),
    pressure: num(h.pressure_msl[i], 1013),
    cloud: num(h.cloud_cover[i]),
    precip: num(h.precipitation[i]),
    precipProb: num(h.precipitation_probability[i]),
    wind: num(h.wind_speed_10m[i]),
    gust: num(h.wind_gusts_10m[i]),
    windDir: num(h.wind_direction_10m[i]),
    code: num(h.weather_code[i]),
  }))
  const sun: WeatherData['sun'] = {}
  d.daily.time.forEach((date, i) => {
    sun[date] = {
      sunrise: localHours(d.daily.sunrise[i]),
      sunset: localHours(d.daily.sunset[i]),
    }
  })
  return {
    hours,
    sun,
    utcOffsetSeconds: d.utc_offset_seconds,
    timezone: d.timezone,
  }
}

function localHours(iso: string) {
  return Number(iso.slice(11, 13)) + Number(iso.slice(14, 16)) / 60
}

/** UTC timestamp of local midnight for a "YYYY-MM-DD" date. */
export function localMidnightMs(date: string, utcOffsetSeconds: number) {
  const [y, m, d] = date.split('-').map(Number)
  return Date.UTC(y, m - 1, d) - utcOffsetSeconds * 1000
}

export function weatherLabel(code: number) {
  if (code === 0) return 'Ясно'
  if (code <= 2) return 'Мінлива хмарність'
  if (code === 3) return 'Похмуро'
  if (code === 45 || code === 48) return 'Туман'
  if (code >= 51 && code <= 57) return 'Мряка'
  if (code >= 61 && code <= 67) return 'Дощ'
  if (code >= 71 && code <= 77) return 'Сніг'
  if (code >= 80 && code <= 82) return 'Злива'
  if (code >= 85 && code <= 86) return 'Снігопад'
  if (code >= 95) return 'Гроза'
  return 'Хмарно'
}

export function windDirName(deg: number) {
  const names = [
    'північний',
    'північно-східний',
    'східний',
    'південно-східний',
    'південний',
    'південно-західний',
    'західний',
    'північно-західний',
  ]
  return names[Math.round((((deg % 360) + 360) % 360) / 45) % 8]
}
