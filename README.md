# Клює! — прогноз кльову риби

A Ukrainian-language website that answers one question: **is it worth going fishing on this day, at these hours?**

Pick a town or lake (search or your current location), a fish species (pike, zander, perch, carp, crucian carp, bream, roach, catfish, or "any fish"), a day from the next ~10 days and a time window. The site then shows:

- an overall bite score (0–100) and a plain-language verdict for that window;
- a list of **pros and cons** — pressure trend, wind strength and direction, estimated water temperature vs. the species' comfort range, clouds, rain/thunderstorms, dawn/dusk, solunar periods and moon phase — each with its impact in points;
- an hour-by-hour chart for the whole day (click an hour to move the window there);
- a strip of upcoming days with each day's peak score, so you can pick the best day;
- the weather at the best hour, sunrise/sunset, moon phase, recommended baits and species tips.

## Technologies

- TanStack Start (React 19, TanStack Router), Vite, TypeScript
- Tailwind CSS 4 + shadcn/ui components, lucide-react icons
- [Open-Meteo](https://open-meteo.com) weather and geocoding APIs (free, no key)
- Local astronomy calculations for moon phase and solunar periods
- Netlify hosting and Netlify Image CDN for the hero image

## Running locally

```bash
pnpm install
netlify dev        # or: pnpm dev
```

Then open the printed URL. No environment variables are needed.

## Possible next steps

- Real water-temperature data where available, and per-waterbody profiles (river vs. lake).
- A catch journal so anglers can record their results and compare with the forecast.
- Sharing a forecast via link (encode place, fish, date and hours in the URL).
