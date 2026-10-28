import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CalendarDays, Fish as FishIcon, RefreshCw } from 'lucide-react'

import { PlaceSearch } from '../components/forecast/place-search'
import {
  Conditions,
  HourChart,
  ProsCons,
  Solunar,
  Tips,
  WindowSummary,
  scoreColor,
} from '../components/forecast/results'
import { Button } from '../components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Skeleton } from '../components/ui/skeleton'
import { FISH, fishById } from '../lib/fish'
import type { FishId } from '../lib/fish'
import { buildDay, hh, localToday, summarizeWindow, upcomingDays } from '../lib/forecast'
import { fetchWeather } from '../lib/weather'
import type { Place, WeatherData } from '../lib/weather'
import { cn } from '../lib/utils'

export const Route = createFileRoute('/')({
  component: Home,
})

const DEFAULT_PLACE: Place = { name: 'Київ', region: 'Київ', country: 'Україна', lat: 50.45, lng: 30.52 }
const STORAGE_KEY = 'klyuie:prefs'
const HOURS = Array.from({ length: 25 }, (_, i) => i)

const dayFmt = new Intl.DateTimeFormat('uk-UA', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
})
const shortFmt = new Intl.DateTimeFormat('uk-UA', { weekday: 'short', timeZone: 'UTC' })
const numFmt = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const asDate = (d: string) => new Date(`${d}T12:00:00Z`)

function Home() {
  const [place, setPlace] = useState<Place>(DEFAULT_PLACE)
  const [fishId, setFishId] = useState<FishId>('any')
  const [date, setDate] = useState<string>('')
  const [from, setFrom] = useState(5)
  const [to, setTo] = useState(10)
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reload, setReload] = useState(0)
  const [ready, setReady] = useState(false)

  // Restore saved preferences after hydration.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as {
        place?: Place
        fishId?: FishId
      } | null
      if (saved?.place) setPlace(saved.place)
      if (saved?.fishId) setFishId(saved.fishId)
    } catch {
      // ignore broken storage
    }
    setReady(true)
  }, [])

  useEffect(() => {
    if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify({ place, fishId }))
  }, [place, fishId, ready])

  useEffect(() => {
    if (!ready) return
    let cancelled = false
    setWeather(null)
    setError(null)
    fetchWeather(place.lat, place.lng)
      .then((w) => {
        if (cancelled) return
        setWeather(w)
        const today = localToday(w.utcOffsetSeconds)
        setDate((d) => (d && d >= today && w.sun[d] ? d : today))
      })
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : 'Помилка'))
    return () => {
      cancelled = true
    }
  }, [place, ready, reload])

  const fish = fishById(fishId)
  const today = weather ? localToday(weather.utcOffsetSeconds) : ''
  const days = useMemo(
    () => (weather ? upcomingDays(weather, fish, place.lat, place.lng, today) : []),
    [weather, fish, place, today],
  )
  const day = useMemo(
    () => (weather && date ? buildDay(weather, date, fish, place.lat, place.lng) : null),
    [weather, date, fish, place],
  )
  const result = useMemo(() => (day ? summarizeWindow(day, from, to, fish) : null), [day, from, to, fish])

  const setWindow = (f: number, t: number) => {
    const a = Math.max(0, Math.min(23, Math.round(f)))
    const b = Math.max(a + 1, Math.min(24, Math.round(t)))
    setFrom(a)
    setTo(b)
  }

  const presets = day
    ? [
        { label: 'Ранкова зоря', f: day.sun.sunrise - 1.5, t: day.sun.sunrise + 2.5 },
        { label: 'День', f: day.sun.sunrise + 3, t: day.sun.sunset - 2 },
        { label: 'Вечірня зоря', f: day.sun.sunset - 2.5, t: day.sun.sunset + 1.5 },
        { label: 'Ніч', f: Math.min(23, day.sun.sunset + 2), t: 24 },
      ]
    : []

  return (
    <div className="min-h-screen">
      <header className="relative isolate overflow-hidden">
        <img
          src="/.netlify/images?url=/img/hero.png&w=1920&fm=webp&q=75"
          srcSet="/.netlify/images?url=/img/hero.png&w=828&fm=webp&q=70 828w, /.netlify/images?url=/img/hero.png&w=1280&fm=webp&q=75 1280w, /.netlify/images?url=/img/hero.png&w=1920&fm=webp&q=75 1920w"
          sizes="100vw"
          alt=""
          className="absolute inset-0 -z-10 h-full w-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background/40 via-background/60 to-background" />
        <div className="mx-auto max-w-content px-4 pt-6 pb-40 sm:px-6">
          <nav className="flex items-center gap-2 font-display text-lg font-bold">
            <FishIcon className="size-6 text-primary" /> Клює!
          </nav>
          <div className="mt-16 max-w-2xl sm:mt-24">
            <p className="text-sm font-semibold tracking-widest text-primary uppercase">
              Прогноз кльову риби
            </p>
            <h1 className="mt-3 font-display text-4xl leading-tight font-extrabold sm:text-6xl">
              Чи варто їхати на рибалку сьогодні?
            </h1>
            <p className="mt-5 text-lg text-foreground/85">
              Оберіть водойму, рибу, день і години — ми зважимо тиск, вітер, температуру води, хмари
              та місяць і покажемо чесні плюси та мінуси саме вашої рибалки.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto -mt-28 max-w-content space-y-6 px-4 pb-16 sm:px-6">
        <section className="rounded-2xl border bg-card/95 p-5 shadow-2xl backdrop-blur sm:p-6">
          <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr_1fr]">
            <PlaceSearch place={place} onChange={setPlace} />
            <div>
              <label htmlFor="fish" className="mb-1.5 block text-sm font-medium">
                Риба
              </label>
              <Select value={fishId} onValueChange={(v) => setFishId(v as FishId)}>
                <SelectTrigger id="fish" className="w-full data-[size=default]:h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FISH.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <span className="mb-1.5 block text-sm font-medium" id="time-label">
                Час рибалки
              </span>
              <div className="flex items-center gap-2" role="group" aria-labelledby="time-label">
                <HourSelect
                  label="Початок"
                  value={from}
                  options={HOURS.slice(0, 24)}
                  onChange={(v) => setWindow(v, Math.max(to, v + 1))}
                />
                <span className="text-muted-foreground">—</span>
                <HourSelect
                  label="Кінець"
                  value={to}
                  options={HOURS.slice(from + 1)}
                  onChange={(v) => setWindow(from, v)}
                />
              </div>
            </div>
          </div>

          {presets.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {presets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setWindow(p.f, p.t)}
                  className="rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:border-primary hover:text-primary motion-reduce:transition-none"
                >
                  {p.label} · {hh(Math.max(0, Math.round(p.f)))}–{hh(Math.min(24, Math.round(p.t)))}
                </button>
              ))}
            </div>
          )}

          <div className="mt-6">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
              <CalendarDays className="size-4" /> День
            </p>
            {days.length ? (
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                {days.map((d) => (
                  <button
                    key={d.date}
                    type="button"
                    onClick={() => setDate(d.date)}
                    aria-pressed={d.date === date}
                    className={cn(
                      'min-w-[84px] flex-1 rounded-xl border px-2 py-2.5 text-center transition-colors motion-reduce:transition-none',
                      d.date === date ? 'border-primary bg-primary/10' : 'hover:bg-muted',
                    )}
                  >
                    <span className="block text-xs text-muted-foreground capitalize">
                      {d.date === today ? 'сьогодні' : shortFmt.format(asDate(d.date))}
                    </span>
                    <span className="block text-sm font-semibold">{numFmt.format(asDate(d.date))}</span>
                    <span
                      className="mt-1 block font-display text-lg font-bold tabular-nums"
                      style={{ color: scoreColor(d.score) }}
                    >
                      {d.score}
                    </span>
                    <span className="block text-[10px] text-muted-foreground">пік ~{hh(d.bestHour)}</span>
                  </button>
                ))}
              </div>
            ) : error ? null : (
              <div className="flex gap-2">
                {Array.from({ length: 8 }, (_, i) => (
                  <Skeleton key={i} className="h-[104px] min-w-[84px] flex-1 rounded-xl" />
                ))}
              </div>
            )}
          </div>
        </section>

        {error && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-8 text-center">
            <AlertTriangle className="size-8 text-destructive" />
            <p className="font-semibold">{error}</p>
            <p className="text-sm text-muted-foreground">Перевірте з’єднання з інтернетом і спробуйте ще раз.</p>
            <Button variant="outline" onClick={() => setReload((n) => n + 1)}>
              <RefreshCw /> Спробувати знову
            </Button>
          </div>
        )}

        {!error && (!day || !result) && (
          <div className="space-y-4" aria-busy="true" aria-label="Завантаження прогнозу">
            <Skeleton className="h-52 rounded-2xl" />
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-64 rounded-2xl" />
              <Skeleton className="h-64 rounded-2xl" />
            </div>
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        )}

        {day && result && (
          <>
            <WindowSummary result={result} fish={fish} dateLabel={`${dayFmt.format(asDate(day.date))}, ${hh(from)}–${hh(to)}`} />
            <ProsCons result={result} />
            <HourChart
              day={day}
              from={from}
              to={to}
              onPick={(h) => setWindow(h, h + Math.max(1, to - from))}
            />
            <Conditions day={day} result={result} />
            <div className="grid gap-4 md:grid-cols-2">
              <Tips fish={fish} result={result} />
              <Solunar day={day} />
            </div>
          </>
        )}

        <footer className="pt-6 text-center text-xs text-muted-foreground">
          <p>
            Прогноз розраховано за даними погоди{' '}
            <a href="https://open-meteo.com" className="underline hover:text-foreground" target="_blank" rel="noreferrer">
              Open-Meteo
            </a>
            , фазами та положенням місяця і рибальськими спостереженнями. Температура води — оцінка.
          </p>
          <p className="mt-1">Риба завжди має останнє слово. Ні хвоста, ні луски!</p>
        </footer>
      </main>
    </div>
  )
}

function HourSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: number
  options: number[]
  onChange: (v: number) => void
}) {
  return (
    <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger aria-label={label} className="flex-1 data-[size=default]:h-11">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((h) => (
          <SelectItem key={h} value={String(h)}>
            {h === 24 ? '24:00' : hh(h)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
