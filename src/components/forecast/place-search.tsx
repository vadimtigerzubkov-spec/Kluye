import { useEffect, useRef, useState } from 'react'
import { LocateFixed, MapPin, Search } from 'lucide-react'

import { Button } from '../ui/button'
import { Input } from '@/components/ui/input'
import { searchPlaces } from '@/lib/weather'
import type { Place } from '@/lib/weather'
import { toast } from 'sonner'

export function PlaceSearch({
  place,
  onChange,
}: {
  place: Place
  onChange: (place: Place) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Place[]>([])
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState('')
  const [locating, setLocating] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) return
    let stale = false
    const t = setTimeout(() => {
      setSearching(true)
      searchPlaces(q, place)
        .then((r) => {
          if (stale) return
          setResults(r)
          setOpen(true)
        })
        .catch(() => !stale && setResults([]))
        .finally(() => {
          if (stale) return
          setSearching(false)
          setSearched(q)
        })
    }, 300)
    return () => {
      stale = true
      clearTimeout(t)
    }
    // Searching near the current place only biases ranking; don't re-run when it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  // Short queries aren't searched; hide whatever an earlier query found.
  const shown = query.trim().length >= 2 ? results : []

  const pick = (p: Place) => {
    onChange(p)
    setQuery('')
    setResults([])
    setOpen(false)
  }

  const locate = () => {
    if (!navigator.geolocation) {
      toast.error('Браузер не підтримує геолокацію')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        pick({
          name: 'Моє місцезнаходження',
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        })
      },
      () => {
        setLocating(false)
        toast.error('Не вдалося визначити місцезнаходження')
      },
      { timeout: 10_000 },
    )
  }

  return (
    <div ref={boxRef} className="relative">
      <label htmlFor="place" className="mb-1.5 block text-sm font-medium">
        Водойма або населений пункт
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="place"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => shown.length && setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && shown[0]) {
                e.preventDefault()
                pick(shown[0])
              }
              if (e.key === 'Escape') setOpen(false)
            }}
            placeholder={place.name}
            autoComplete="off"
            className="h-11 pl-9"
            role="combobox"
            aria-expanded={open}
            aria-controls="place-results"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          className="h-11 w-11"
          onClick={locate}
          disabled={locating}
          aria-label="Визначити моє місцезнаходження"
          title="Моє місцезнаходження"
        >
          <LocateFixed
            className={
              locating ? 'animate-pulse motion-reduce:animate-none' : ''
            }
          />
        </Button>
      </div>
      <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
        <MapPin className="size-3" />
        {place.name}
        {placeDetails(place) ? `, ${placeDetails(place)}` : ''} ·{' '}
        {place.lat.toFixed(2)}°, {place.lng.toFixed(2)}°
      </p>
      {open && shown.length > 0 && (
        <ul
          id="place-results"
          role="listbox"
          className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-xl"
        >
          {shown.map((r) => (
            <li key={`${r.name},${r.lat},${r.lng}`}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => pick(r)}
                className="w-full px-3 py-2 text-left text-sm transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none motion-reduce:transition-none"
              >
                <span className="font-medium">{r.name}</span>
                {r.kind && (
                  <span className="text-muted-foreground"> · {r.kind}</span>
                )}
                {placeDetails(r, true) && (
                  <span className="block text-xs text-muted-foreground">
                    {placeDetails(r, true)}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      {open &&
        !searching &&
        shown.length === 0 &&
        searched &&
        searched === query.trim() && (
          <p className="absolute z-20 mt-1 w-full rounded-md border bg-popover px-3 py-2 text-sm text-muted-foreground shadow-xl">
            Нічого не знайдено. Спробуйте іншу назву або додайте район чи
            область.
          </p>
        )}
    </div>
  )
}

/** "Обухівський район, Київська область" (+ country outside Ukraine). */
function placeDetails(p: Place, withCountry = false) {
  const parts = [p.district, p.region !== p.name ? p.region : undefined]
  if (withCountry && p.country && p.country !== 'Україна') parts.push(p.country)
  return parts.filter(Boolean).join(', ')
}
