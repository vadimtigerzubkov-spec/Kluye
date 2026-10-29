import {
  CloudRain,
  Clock,
  Droplets,
  Fish,
  Gauge,
  Moon,
  Sunrise,
  Sunset,
  Thermometer,
  ThumbsDown,
  ThumbsUp,
  Wind,
} from 'lucide-react'

import { Badge } from '../ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'
import { hh, hm, verdictFor } from '../../lib/forecast'
import type { DayForecast, Factor, HourScore, WindowForecast } from '../../lib/forecast'
import type { FishProfile } from '../../lib/fish'
import { weatherLabel, windDirName } from '../../lib/weather'
import { cn } from '../../lib/utils'

export function scoreColor(score: number) {
  const tone = verdictFor(score).tone
  return {
    great: 'var(--success)',
    good: 'var(--chart-2)',
    fair: 'var(--primary)',
    poor: 'oklch(0.7 0.16 50)',
    bad: 'var(--destructive)',
  }[tone]
}

export function ScoreRing({ score, size = 148 }: { score: number; size?: number }) {
  const r = size / 2 - 10
  const c = 2 * Math.PI * r
  const color = scoreColor(score)
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={10} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
          className="transition-[stroke-dashoffset] duration-700 motion-reduce:transition-none"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-4xl font-bold" style={{ color }}>
          {score}
        </span>
        <span className="text-xs text-muted-foreground">зі 100</span>
      </div>
    </div>
  )
}

export function WindowSummary({
  result,
  fish,
  dateLabel,
}: {
  result: WindowForecast
  fish: FishProfile
  dateLabel: string
}) {
  return (
    <section className="rounded-2xl border bg-card p-6 sm:p-8">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
        <ScoreRing score={result.score} />
        <div className="text-center sm:text-left">
          <p className="text-sm text-muted-foreground">
            {fish.name} · {dateLabel}
          </p>
          <h2
            className="mt-1 font-display text-2xl font-bold sm:text-3xl"
            style={{ color: scoreColor(result.score) }}
          >
            {result.verdict.label}
          </h2>
          <p className="mt-3 max-w-reading leading-relaxed text-foreground/90">{result.summary}</p>
        </div>
      </div>
    </section>
  )
}

function FactorList({ items, kind }: { items: Factor[]; kind: 'pro' | 'con' }) {
  const pro = kind === 'pro'
  const Icon = pro ? ThumbsUp : ThumbsDown
  return (
    <section
      className={cn(
        'rounded-2xl border p-6',
        pro ? 'border-success/30 bg-success/5' : 'border-destructive/40 bg-destructive/5',
      )}
    >
      <h3 className="flex items-center gap-2 font-display text-lg font-bold">
        <Icon className={cn('size-5', pro ? 'text-success' : 'text-destructive')} />
        {pro ? 'Плюси' : 'Мінуси'}
        <span className="ml-auto text-sm font-normal text-muted-foreground">{items.length}</span>
      </h3>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          {pro ? 'Суттєвих плюсів у цей час немає.' : 'Суттєвих мінусів не виявлено — чудово!'}
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((f) => (
            <li key={f.key} className="flex gap-3">
              <span
                className={cn(
                  'mt-0.5 h-6 min-w-11 rounded-md px-1.5 text-center text-xs leading-6 font-bold tabular-nums',
                  pro ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive-foreground',
                )}
              >
                {f.impact > 0 ? '+' : '−'}
                {Math.abs(Math.round(f.impact))}
              </span>
              <div>
                <p className="font-semibold">{f.title}</p>
                <p className="text-sm text-muted-foreground">{f.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function ProsCons({ result }: { result: WindowForecast }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <FactorList items={result.pros} kind="pro" />
      <FactorList items={result.cons} kind="con" />
    </div>
  )
}

export function HourChart({
  day,
  from,
  to,
  onPick,
}: {
  day: DayForecast
  from: number
  to: number
  onPick: (hour: number) => void
}) {
  return (
    <section className="rounded-2xl border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-lg font-bold">Кльов по годинах</h3>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-primary" /> головний солунарний
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full border border-primary" /> другорядний
          </span>
        </div>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Підсвічено ваш проміжок. Натисніть на годину, щоб почати рибалку з неї.
      </p>
      <div className="mt-6 overflow-x-auto pb-2">
        <div className="flex h-48 min-w-[640px] items-end gap-1">
          {day.hours.map((h) => (
            <HourBar key={h.hour} h={h} active={h.hour >= from && h.hour < to} onPick={onPick} />
          ))}
        </div>
        <div className="mt-2 flex min-w-[640px] gap-1 text-center text-[10px] text-muted-foreground tabular-nums">
          {day.hours.map((h) => (
            <span key={h.hour} className="flex-1">
              {h.hour % 3 === 0 ? hh(h.hour) : ''}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

function HourBar({
  h,
  active,
  onPick,
}: {
  h: HourScore
  active: boolean
  onPick: (hour: number) => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => onPick(h.hour)}
          aria-label={`${hh(h.hour)} — ${h.score} зі 100`}
          className={cn(
            'group relative flex h-full flex-1 flex-col items-center justify-end rounded-md transition-colors motion-reduce:transition-none',
            active ? 'bg-accent/60' : 'hover:bg-muted/60',
          )}
        >
          {h.solunar && (
            <span
              className={cn(
                'mb-1 size-2 rounded-full',
                h.solunar === 'major' ? 'bg-primary' : 'border border-primary',
              )}
            />
          )}
          <span
            className={cn('w-full max-w-5 rounded-t-sm transition-opacity', !active && 'opacity-45')}
            style={{ height: `${Math.max(4, h.score) * 0.8}%`, background: scoreColor(h.score) }}
          />
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-semibold">
          {hh(h.hour)} · {h.score}/100
        </p>
        <p>
          {weatherLabel(h.weather.code)}, {Math.round(h.weather.temp)} °C, вітер{' '}
          {h.weather.wind.toFixed(1)} м/с
        </p>
      </TooltipContent>
    </Tooltip>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Gauge
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function Conditions({ day, result }: { day: DayForecast; result: WindowForecast }) {
  const w = result.best.weather
  const trend = day.pressureTrend
  return (
    <section>
      <h3 className="mb-3 font-display text-lg font-bold">
        Умови о {hh(result.best.hour)}{' '}
        <span className="text-sm font-normal text-muted-foreground">(найкраща година вікна)</span>
      </h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Stat
