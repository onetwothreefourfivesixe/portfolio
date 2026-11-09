# Edward Lin — A City Through Time

My personal portfolio: one scrolling page where a single invented riverside town travels from 432 BC to AD 2150 behind the content. Each section sits in one era, and the panel, type and nav bar take on that era's materials. Scrolling is time travel.

Built with [SvelteKit](https://kit.svelte.dev/) (Svelte 5, TypeScript) and a hand-written canvas renderer. No UI framework; fonts come from Google Fonts. The full concept, era table, scroll-to-time mechanics and renderer architecture are in `City Through Time — Design Document.md`.

## Sections

| Section | Era | Panel |
| --- | --- | --- |
| Intro | Midtown, 2026 | Frosted glass, bio, photo, subway-line interests |
| Experience | The Works, 1888 | Riveted steel plate, shift log |
| Projects | Old Town, 1347 | Vellum folio, numbered charters with drop caps, optional miniature per project |
| Hobbies | The Agora, 432 BC | Marble temple front: pediment, meander frieze, a stele per hobby or extracurricular |
| Contact | Skyport, 2150 | Holographic console, copy-to-clipboard email, channels |

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
  app.css                   era tokens, HUD colours per era, section spacing, footer
  app.html                  HTML shell (body carries data-era for the nav bar tokens)
  lib/
    city.ts                 canvas renderer: eras, landmarks, bridge, scroll-to-time, caching
    content.json            all portfolio copy: bio, interests, jobs, projects, hobbies, links
    content.ts              types on top of content.json
    richtext.ts             turns [label](url) in hobby text into links
    era.svelte.ts           shared nav-bar state written by the renderer
    components/
      CityCanvas.svelte     mounts the renderer and tears it down
      Hud.svelte            fixed nav bar with era name, population and live year
      Intro.svelte          Midtown 2026 glass panel
      Experience.svelte     The Works 1888 steel plate
      Projects.svelte       Old Town 1347 vellum folio
      Hobbies.svelte        The Agora 432 BC marble temple
      Contact.svelte        Skyport 2150 console
  routes/
    +layout.svelte          global CSS and font links
    +page.svelte            canvas, HUD, the five sections, footer
static/                     favicon and photo
```

## Editing content

- **Text, links, jobs, projects:** edit `src/lib/content.json`. The renderer never reads panel text.
- **Project images:** put the file in `static/` and add `"image": "/luminate.png"` (and optionally `"imageAlt"`) to the project. Projects without an image show no frame.
- **Hobbies & extracurriculars:** fill in `pursuits` in `content.json`. Each entry has `name`, `role`, `years`, `desc`, `image`, `imageAlt` and `links`; any field left as `""` shows a faded placeholder on the page, so copy an existing entry to add one. `desc` and `intro` accept Markdown links: `[QBVReader](https://www.qbv-reader.com/)`.
- **Era colours:** the `ERA` and `HP` tables at the top of `src/lib/city.ts`; panel colours are the tokens at the top of `src/app.css`.
- **Add an era:** see "Code structure and extending" in the design document.

## Contact

- [LinkedIn](https://www.linkedin.com/in/eddie-lin-1363a5318/)
- [GitHub](https://github.com/onetwothreefourfivesixe)
- [edwardxuming.lin@gmail.com](mailto:edwardxuming.lin@gmail.com)
