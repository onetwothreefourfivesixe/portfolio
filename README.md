# Edward Lin — Portfolio Transit System

My personal portfolio, laid out as a transit map. Central is the intro; four lines run out from it: **Experience** (Red), **Projects** (Blue), **Contact** (Green) and **Hobbies & Clubs** (the Yellow Loop). Each station is one job, project, link, hobby or club. Clicking a station zooms the map in, a train rides the track from the last stop, and the panel beside the map shows the details. The look borrows WMATA and BART signage, with Mini Metro shapes inside the station markers.

Built with [SvelteKit](https://kit.svelte.dev/) (Svelte 5, TypeScript). No UI framework; fonts (Inter, Doto) come from Google Fonts.

## Running locally

Requires Node.js 20.19+ or 22.12+ (Vite 8 and its native bundler bindings refuse older versions).

```bash
npm install
npm run dev            # start the dev server
npm run dev -- --open  # ...and open it in a browser
```

## Building

```bash
npm run check    # svelte-check
npm run build    # production build
npm run preview  # preview that build locally
```

The project uses `@sveltejs/adapter-auto`, which picks an adapter based on the deployment environment. To deploy somewhere it doesn't detect, swap in the [matching adapter](https://kit.svelte.dev/docs/adapters) in the `sveltekit(...)` plugin options in `vite.config.js`.

## Project layout

```text
src/
  app.css                   global reset and page background
  app.html                  HTML shell
  lib/
    content.json            all portfolio copy: bio, jobs, projects, hobbies and clubs, links
    content.ts              types on top of content.json
    metro/
      stations.ts           turns content.json into lines and stations; station slots on the map
      geometry.ts           line paths, terminus badges, marker shapes, train route math
      richtext.ts           turns [label](url) in the copy into link segments
      tokens.css            colours and shared classes, scoped to .metro
      MetroPortfolio.svelte page shell: header, layout, state, the animation loop
      MetroMap.svelte       SVG map, station buttons, camera zoom, trip train
      StationPanel.svelte   station sign, content card, platform buttons, stop list, departures board
      LineList.svelte       the List view, one column per line
      StationIcon.svelte    ring + shape station marker
  routes/
    +layout.svelte          global CSS, fonts, page title and link-preview tags
    +page.svelte            the map; keeps the open station in the URL hash (/#p3)
static/                     favicon, photo, link-preview image
```

## Editing content

- **Text, links, jobs, projects, hobbies, clubs:** edit `src/lib/content.json`. Every job and project has a `station` field, the short name shown on the map.
- **Jobs** are listed newest first; the Red Line runs oldest → newest, so the newest job sits at the right-hand end.
- **Projects:** set `hidden: true` to keep one off the map. `built` is the one-line stack/result shown as tags.
- **Links in text:** the bio, descriptions (`desc`), job `points` and the contact note accept Markdown links: `"I built [QBVReader](https://www.qbv-reader.com/)."`. `https://`, `mailto:` and site-relative `/` links are turned into hyperlinks; nothing else in Markdown is parsed. The parser is `src/lib/metro/richtext.ts`.
- **Images:** project, hobby and club stations show a 16:9 picture slot. Put the file in `static/` and add `"image": "/file.jpg"` to the entry in `content.json`; until then the slot shows a placeholder.
- **Hobbies & Clubs:** the `hobbies` list feeds the Yellow Loop, hobbies first, then clubs and volunteering.
- **Adding a station:** each line has a list of slots in `src/lib/metro/stations.ts` (`RED_SLOTS`, `BLUE_SLOTS`, …). A line shows as many entries as it has slots, so add a slot on the line's path before adding a seventh job or project. Paths are in `geometry.ts` → `LINE_POINTS`.
- **Express tour stops:** `TOUR` at the end of `stations.ts`.
- **Colours:** tokens at the top of `src/lib/metro/tokens.css`; line colours in `LINES` in `stations.ts`.

## Tuning

- Camera smoothing: `0.15` (seconds) in `tick()` in `MetroPortfolio.svelte`. Lower is snappier.
- Zoom level: `ZOOM` in `geometry.ts` (2.1).
- Train speed: `tripDuration()` in `geometry.ts` (650 map units/s, 0.7–2.6 s).
- Visitors with reduced motion turned on skip the train and the camera easing.

## Contact

- [LinkedIn](https://www.linkedin.com/in/eddie-x-lin/)
- [GitHub](https://github.com/onetwothreefourfivesixe)
- [edwardxuming.lin@gmail.com](mailto:edwardxuming.lin@gmail.com)
