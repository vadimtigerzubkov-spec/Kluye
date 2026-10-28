import { moonIllumination, solunarPeriods } from './astro'
import type { MoonInfo, SolunarPeriod } from './astro'
import type { FishProfile, Period } from './fish'
import { localMidnightMs, windDirName } from './weather'
import type { HourWeather, WeatherData } from './weather'

export type Factor = {
  key: string
  title: string
  detail: string
  /** Score points this factor adds (+) or removes (−). */
  impact: number
}

export type HourScore = {
  hour: number
  score: number
  period: Period
  solunar?: SolunarPeriod['kind']
  weather: HourWeather
  factors: Factor[]
}

export type DayForecast = {
  date: string
  hours: HourScore[]
  sun: { sunrise: number; sunset: number }
  moon: MoonInfo
  solunar: SolunarPeriod[]
  waterTemp: number
  pressureTrend: number
}

export type Verdict = {
  label: string
  tone: 'great' | 'good' | 'fair' | 'poor' | 'bad'
}

export type WindowForecast = {
  score: number
  verdict: Verdict
  pros: Factor[]
  cons: Factor[]
  best: HourScore
  dayBest: HourScore
  summary: string
  baits: string[]
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const signed = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}`
export const hh = (h: number) =>
  Math.floor(h) >= 24 ? '24:00' : `${String(Math.floor(h)).padStart(2, '0')}:00`
export const hm = (h: number) => {
  const total = Math.round(((h % 24) + 24) % 24 * 60)
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export function verdictFor(score: number): Verdict {
  if (score >= 78) return { label: 'Відмінний кльов', tone: 'great' }
  if (score >= 63) return { label: 'Добрий кльов', tone: 'good' }
  if (score >= 48) return { label: 'Середній кльов', tone: 'fair' }
  if (score >= 33) return { label: 'Слабкий кльов', tone: 'poor' }
  return { label: 'Риба майже не клює', tone: 'bad' }
}

function periodOf(h: number, sunrise: number, sunset: number): Period {
  const mid = h + 0.5
  if (mid >= sunrise - 1.5 && mid < sunrise + 2) return 'dawn'
  if (mid >= sunset - 2 && mid < sunset + 1) return 'dusk'
  if (mid >= sunrise + 2 && mid < sunset - 2) return 'day'
  return 'night'
}

/** Rough water temperature: water lags air, so use the 72-hour mean. */
function estimateWaterTemp(hours: HourWeather[], i: number) {
  const from = Math.max(0, i - 72)
  const slice = hours.slice(from, i + 1)
  const mean = slice.reduce((s, h) => s + h.temp, 0) / slice.length
  return Math.max(0.5, Math.round(mean * 10) / 10)
}

function subjectOf(fish: FishProfile) {
  return fish.id === 'any' ? 'риба' : fish.name.toLowerCase()
}

function periodFactor(fish: FishProfile, period: Period): Factor | null {
  const impact = fish.activity[period]
  if (impact === 0) return null
  const s = subjectOf(fish)
  const pos = impact > 0
  const texts: Record<Period, [string, string]> = {
    dawn: [
      'Ранкова зоря',
      pos
        ? `На світанку ${s} виходить на годування — один з найкращих періодів.`
        : `На світанку ${s} ще неактивна.`,
    ],
    dusk: [
      'Вечірня зоря',
      pos
        ? `У сутінках ${s} активно годується перед ніччю.`
        : `Ввечері ${s} клює слабше.`,
    ],
    day: [
      pos ? 'Денна активність' : 'Денний час',
      pos
        ? `${cap(s)} добре бере вдень.`
        : `Вдень ${s} пасивніша й тримається глибини чи укриттів.`,
    ],
    night: [
      pos ? 'Нічний вихід' : 'Ніч',
      pos
        ? `Вночі ${s} виходить на мілини полювати.`
        : `Вночі ${s} майже не клює.`,
    ],
  }
  const [title, detail] = texts[period]
  return { key: 'period', title, detail, impact }
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function scoreHour(
  data: WeatherData,
  i: number,
  fish: FishProfile,
  day: Omit<DayForecast, 'hours'>,
): HourScore {
  const hours = data.hours
  const w = hours[i]
  const prev3 = hours[Math.max(0, i - 3)]
  const prev24 = hours[Math.max(0, i - 24)]
  const period = periodOf(w.hour, day.sun.sunrise, day.sun.sunset)
  const factors: Factor[] = []
  const add = (f: Factor | null) => f && f.impact !== 0 && factors.push(f)
  const s = subjectOf(fish)
  const predator = fish.kind === 'predator'
  const peaceful = fish.kind === 'peaceful'

  add(periodFactor(fish, period))

  // Pressure trend
  const d24 = w.pressure - prev24.pressure
  const d3 = w.pressure - prev3.pressure
  if (Math.abs(d24) <= 3) {
    add({
      key: 'pressure-trend',
      title: 'Стабільний тиск',
      detail: `За добу тиск змінився лише на ${signed(d24)} гПа — риба почувається комфортно.`,
      impact: 10,
    })
  } else if (d24 < -8) {
    add(
      fish.id === 'catfish'
        ? {
            key: 'pressure-trend',
            title: 'Падіння тиску перед фронтом',
            detail: `Тиск упав на ${Math.abs(d24).toFixed(1)} гПа — сом часто активізується перед негодою.`,
            impact: 6,
          }
        : {
            key: 'pressure-trend',
            title: 'Різке падіння тиску',
            detail: `Тиск упав на ${Math.abs(d24).toFixed(1)} гПа за добу — риба дезорієнтована й пасивна.`,
            impact: -10,
          },
    )
  } else if (d24 < -3) {
    add({
      key: 'pressure-trend',
      title: 'Плавне падіння тиску',
      detail: predator
        ? `Тиск знижується (${signed(d24)} гПа за добу) — перед зміною погоди хижак жирує.`
        : peaceful
          ? `Тиск знижується (${signed(d24)} гПа за добу) — мирна риба стає обережнішою.`
          : `Тиск поступово знижується (${signed(d24)} гПа за добу) — хижак активніший, мирна риба обережніша.`,
      impact: predator ? 8 : peaceful ? -4 : 3,
    })
  } else if (d24 > 7) {
    add({
      key: 'pressure-trend',
      title: 'Різке зростання тиску',
      detail: `Тиск зріс на ${d24.toFixed(1)} гПа за добу — риба притискається до дна й відмовляється від корму.`,
      impact: -14,
    })
  } else {
    add({
      key: 'pressure-trend',
      title: 'Тиск зростає',
      detail: `Тиск підвищується (${signed(d24)} гПа за добу) — рибі потрібен час на адаптацію.`,
      impact: -5,
    })
  }
  if (Math.abs(d3) > 2.5) {
    add({
      key: 'pressure-jump',
      title: 'Стрибки тиску',
      detail: `За останні 3 години тиск змінився на ${signed(d3)} гПа.`,
      impact: -6,
    })
  }

  // Absolute pressure
  if (w.pressure > 1028) {
    add({
      key: 'pressure-abs',
      title: 'Високий тиск',
      detail: `${Math.round(w.pressure)} гПа — при високому тиску риба часто пасивна.`,
      impact: -5,
    })
  } else if (w.pressure < 1000) {
    add({
      key: 'pressure-abs',
      title: 'Низький тиск',
      detail: `${Math.round(w.pressure)} гПа — циклон, погода нестабільна.`,
      impact: -5,
    })
  } else if (w.pressure >= 1008 && w.pressure <= 1022) {
    add({
      key: 'pressure-abs',
      title: 'Нормальний тиск',
      detail: `${Math.round(w.pressure)} гПа — сприятливий діапазон.`,
      impact: 3,
    })
  }

  // Water temperature
  const wt = day.waterTemp
  const [lo, hi] = fish.tempOpt
  const range = `${lo}–${hi} °C`
  if (wt >= lo && wt <= hi) {
    add({
      key: 'water-temp',
      title: 'Комфортна температура води',
      detail: `≈${wt.toFixed(0)} °C — оптимум для ${fish.genitive} (${range}).`,
      impact: 12,
    })
  } else if (wt < fish.tempMin) {
    add({
      key: 'water-temp',
      title: 'Холодна вода',
      detail: `≈${wt.toFixed(0)} °C — ${s} малорухлива, оптимум ${range}.`,
      impact: -18,
    })
  } else if (wt < lo) {
    add({
      key: 'water-temp',
      title: 'Прохолодна вода',
      detail: `≈${wt.toFixed(0)} °C — нижче оптимуму (${range}), клювання млявіше.`,
      impact: -Math.round(2 + ((lo - wt) / (lo - fish.tempMin)) * 8),
    })
  } else {
    add({
      key: 'water-temp',
      title: 'Тепла вода',
      detail: `≈${wt.toFixed(0)} °C — вище оптимуму (${range}), кисню менше, риба йде на глибину.`,
      impact: -Math.round(Math.min(15, (wt - hi) * 2.5)),
    })
  }
  const month = Number(w.date.slice(5, 7))
  if (
    ['pike', 'zander', 'perch'].includes(fish.id) &&
    month >= 9 &&
    month <= 11 &&
    wt >= 4 &&
    wt <= 14
  ) {
    add({
      key: 'autumn',
      title: 'Осінній жор',
      detail: `Перед зимою ${s} активно нагулює жир і жадібно атакує приманки.`,
      impact: 8,
    })
  }

  // Air temperature change
  const dT = w.temp - prev24.temp
  if (dT < -6) {
    add({
      key: 'temp-change',
      title: 'Різке похолодання',
      detail: `Повітря охололо на ${Math.abs(dT).toFixed(0)} °C за добу — риба реагує зниженням активності.`,
      impact: -8,
    })
  } else if (dT > 6) {
    add({
      key: 'temp-change',
      title: wt < 15 ? 'Потепління' : 'Різке потепління',
      detail:
        wt < 15
          ? `Повітря прогрілося на ${dT.toFixed(0)} °C — тепла хвиля оживляє рибу.`
          : `Температура зросла на ${dT.toFixed(0)} °C — у спеку клює гірше.`,
      impact: wt < 15 ? 4 : -3,
    })
  }

  // Wind
  const wind = w.wind
  if (wind < 1) {
    add(
      fish.id === 'crucian' || fish.id === 'carp'
        ? {
            key: 'wind',
            title: 'Безвітря',
            detail: `Тиха вода — ${s} спокійно підходить до берега.`,
            impact: 2,
          }
        : {
            key: 'wind',
            title: 'Повний штиль',
            detail: 'Гладка й прозора вода робить рибу обережною.',
            impact: -3,
          },
    )
  } else if (wind <= 4.5) {
    add({
      key: 'wind',
      title: 'Легкий вітер',
      detail: `${wind.toFixed(1)} м/с — брижа насичує воду киснем і маскує рибалку.`,
      impact: 7,
    })
  } else if (wind <= 8) {
    add({
      key: 'wind',
      title: 'Помірний вітер',
      detail: `${wind.toFixed(1)} м/с — хвиля заважає закиданню й контролю снасті.`,
      impact: -3,
    })
  } else {
    add({
      key: 'wind',
      title: 'Сильний вітер',
      detail: `${wind.toFixed(1)} м/с — ловля утруднена, на човні небезпечно.`,
      impact: -14,
    })
  }
  if (w.gust > 13) {
    add({
      key: 'gust',
      title: 'Сильні пориви',
      detail: `Пориви до ${w.gust.toFixed(0)} м/с.`,
      impact: -6,
    })
  }
  if (wind >= 1) {
    const dir = ((w.windDir % 360) + 360) % 360
    const name = windDirName(dir)
    if (dir >= 157.5 && dir <= 292.5) {
      add({
        key: 'wind-dir',
        title: `${cap(name)} вітер`,
        detail: 'Теплий південний чи західний вітер — за прикметами рибалок, до хорошого кльову.',
        impact: 4,
      })
    } else if (dir >= 337.5 || dir <= 112.5) {
      add({
        key: 'wind-dir',
        title: `${cap(name)} вітер`,
        detail: 'Північний чи східний вітер часто приносить холод і погіршує кльов.',
        impact: -4,
      })
    }
  }

  // Sky
  const daylight = period === 'day' || period === 'dawn' || period === 'dusk'
  if (daylight && w.cloud >= 40 && w.cloud <= 95) {
    add({
      key: 'clouds',
      title: 'Хмарність',
      detail: `${Math.round(w.cloud)}% хмар — розсіяне світло, риба сміливіше підходить до берега.`,
      impact: fish.likesClouds ? 6 : 2,
    })
  } else if (period === 'day' && w.cloud < 20) {
    add(
      fish.likesClouds
        ? {
            key: 'clouds',
            title: 'Яскраве сонце',
            detail: 'У ясний день риба ховається в тінь і на глибину.',
            impact: -6,
          }
        : {
            key: 'clouds',
            title: 'Сонячно',
            detail: 'Сонце прогріває мілководдя — там збирається риба.',
            impact: wt < hi ? 3 : -2,
          },
    )
  }

  // Precipitation
  const code = w.code
  if (code >= 95) {
    add({
      key: 'precip',
      title: 'Гроза',
      detail: 'Небезпечно! Під час грози вудлище притягує блискавку — краще перечекати.',
      impact: -25,
    })
  } else if (code >= 71 && code <= 77) {
    add({
      key: 'precip',
      title: 'Снігопад',
      detail: 'Сніг охолоджує воду й погіршує видимість.',
      impact: -6,
    })
  } else if (w.precip >= 2.5 || code === 65 || code === 82) {
    add({
      key: 'precip',
      title: 'Сильний дощ',
      detail: `${w.precip.toFixed(1)} мм/год — каламутна вода й незручна ловля.`,
      impact: -12,
    })
  } else if (w.precip >= 0.1) {
    add({
      key: 'precip',
      title: 'Легкий дощ',
      detail: fish.likesLightRain
        ? 'Дрібний дощ збагачує воду киснем і змиває корм у воду.'
        : `Під дощем ${s} клює гірше.`,
      impact: fish.likesLightRain ? 5 : -3,
    })
  } else if (code === 45 || code === 48) {
    add({
      key: 'precip',
      title: 'Туман',
      detail: 'Туман приглушує світло — риба менш обережна.',
      impact: predator ? 4 : 2,
    })
  }

  // Solunar
  const mid = w.hour + 0.5
  const sol = day.solunar.find((p) => mid >= p.start && mid <= p.end + 0.01)
  const major = day.solunar.find((p) => p.kind === 'major' && mid >= p.start && mid <= p.end)
  const active = major ?? sol
  if (active) {
    add({
      key: 'solunar',
      title: active.kind === 'major' ? 'Головний солунарний період' : 'Другорядний солунарний період',
      detail: `${active.label} о ${hm(active.center)} — за солунарною теорією риба активніша.`,
      impact: active.kind === 'major' ? 10 : 5,
    })
  }

  // Moon phase
  const p = day.moon.phase
  if (p < 0.06 || p > 0.94) {
    add({
      key: 'moon',
      title: 'Молодик',
      detail: 'Сильний вплив місяця — виражені піки активності.',
      impact: 4,
    })
  } else if (Math.abs(p - 0.5) < 0.06) {
    add({
      key: 'moon',
      title: 'Повня',
      detail:
        period === 'night' && predator
          ? 'Світла ніч — хижак добре бачить здобич.'
          : 'Повня підсилює солунарні піки, але вдень риба буває ситою.',
      impact: period === 'night' && predator ? 6 : 2,
    })
  }

  const sum = factors.reduce((acc, f) => acc + f.impact, 0)
  return {
    hour: w.hour,
    score: Math.round(clamp(38 + sum * 0.75, 3, 98)),
    period,
    solunar: active?.kind,
    weather: w,
    factors,
  }
}

export function buildDay(
  data: WeatherData,
  date: string,
  fish: FishProfile,
  lat: number,
  lng: number,
): DayForecast | null {
  const startIdx = data.hours.findIndex((h) => h.date === date)
  if (startIdx < 0) return null
  const midnight = localMidnightMs(date, data.utcOffsetSeconds)
  const noonIdx = Math.min(startIdx + 12, data.hours.length - 1)
  const prevDayIdx = Math.max(0, noonIdx - 24)
  const base: Omit<DayForecast, 'hours'> = {
    date,
    sun: data.sun[date] ?? { sunrise: 6, sunset: 18 },
    moon: moonIllumination(midnight + 12 * 3_600_000),
    solunar: solunarPeriods(midnight, lat, lng),
    waterTemp: estimateWaterTemp(data.hours, noonIdx),
    pressureTrend: data.hours[noonIdx].pressure - data.hours[prevDayIdx].pressure,
  }
  const hours: HourScore[] = []
  for (let i = startIdx; i < data.hours.length && data.hours[i].date === date; i++) {
    hours.push(scoreHour(data, i, fish, base))
  }
  return { ...base, hours }
}

/** Aggregate a time window [from, to) of one day into a verdict with pros and cons. */
export function summarizeWindow(
  day: DayForecast,
  from: number,
  to: number,
  fish: FishProfile,
): WindowForecast {
  const inWindow = day.hours.filter((h) => h.hour >= from && h.hour < to)
  const slice = inWindow.length ? inWindow : day.hours
  const score = Math.round(slice.reduce((s, h) => s + h.score, 0) / slice.length)
  const verdict = verdictFor(score)

  const groups = new Map<string, { sum: number; strongest: Factor }>()
  for (const h of slice) {
    for (const f of h.factors) {
      const g = groups.get(f.key)
      if (!g) groups.set(f.key, { sum: f.impact, strongest: f })
      else {
        g.sum += f.impact
        if (Math.abs(f.impact) > Math.abs(g.strongest.impact)) g.strongest = f
      }
    }
  }
  const merged: Factor[] = [...groups.values()].map((g) => ({
    ...g.strongest,
    // Scaled the same way as the hour score, so impacts read as score points.
    impact: Math.round(((g.sum * 0.75) / slice.length) * 10) / 10,
  }))
  const pros = merged.filter((f) => f.impact >= 1).sort((a, b) => b.impact - a.impact)
  const cons = merged.filter((f) => f.impact <= -1).sort((a, b) => a.impact - b.impact)

  const best = slice.reduce((a, b) => (b.score > a.score ? b : a))
  const dayBest = day.hours.reduce((a, b) => (b.score > a.score ? b : a))

  const parts: string[] = []
  parts.push(
    `${verdict.label} ${fish.id === 'any' ? '' : fish.genitive + ' '}у проміжку ${hh(from)}–${hh(to)}: ${score}/100.`.replace(
      /\s+/g,
      ' ',
    ),
  )
  if (pros[0]) parts.push(`Головний плюс — ${pros[0].title.toLowerCase()}.`)
  if (cons[0]) parts.push(`Головний мінус — ${cons[0].title.toLowerCase()}.`)
  parts.push(`Найактивніша година у вашому вікні — ${hh(best.hour)} (${best.score}/100).`)
  if (dayBest.score >= best.score + 8 && (dayBest.hour < from || dayBest.hour >= to)) {
    parts.push(
      `Якщо є можливість, зсуньте рибалку ближче до ${hh(dayBest.hour)} — тоді очікується ${dayBest.score}/100.`,
    )
  }

  return {
    score,
    verdict,
    pros,
    cons,
    best,
    dayBest,
    summary: parts.join(' '),
    baits: day.waterTemp < 12 ? fish.baits.cold : fish.baits.warm,
  }
}

/** Best 3-hour rolling score for each upcoming day — used for the week strip. */
export function upcomingDays(
  data: WeatherData,
  fish: FishProfile,
  lat: number,
  lng: number,
  today: string,
  count = 10,
) {
  const dates = [...new Set(data.hours.map((h) => h.date))].filter((d) => d >= today)
  return dates.slice(0, count).flatMap((date) => {
    const day = buildDay(data, date, fish, lat, lng)
    if (!day || day.hours.length < 24) return []
    let bestScore = 0
    let bestHour = 0
    for (let i = 0; i + 3 <= day.hours.length; i++) {
      const avg = (day.hours[i].score + day.hours[i + 1].score + day.hours[i + 2].score) / 3
      if (avg > bestScore) {
        bestScore = avg
        bestHour = day.hours[i].hour
      }
    }
    return [{ date, score: Math.round(bestScore), bestHour, moon: day.moon }]
  })
}

export function localToday(utcOffsetSeconds: number) {
  return new Date(Date.now() + utcOffsetSeconds * 1000).toISOString().slice(0, 10)
}
