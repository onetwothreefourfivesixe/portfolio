# Edward Lin — Personal Website

My personal portfolio site: a single-page introduction covering who I am, the projects I've built, and how to reach me.

Built with [SvelteKit](https://kit.svelte.dev/) and [Bootstrap 5](https://getbootstrap.com/), with scroll-triggered animations driven by `IntersectionObserver` and Svelte transitions.

## Sections

- **Home** — banner with a rotating list of the hats I wear
- **About** — short bio, photo, and a link to my resume
- **Projects** — cards for the things I've built
- **Contact** — LinkedIn, GitHub, and email

## Running locally

Requires Node.js 18+.

```bash
npm install
npm run dev            # start the dev server
npm run dev -- --open  # ...and open it in a browser
```

## Building

```bash
npm run build    # production build
npm run preview  # preview that build locally
```

The project uses `@sveltejs/adapter-auto`, which picks an adapter based on the deployment environment. To deploy somewhere it doesn't detect, swap in the [matching adapter](https://kit.svelte.dev/docs/adapters) in `svelte.config.js`.

## Project layout

```text
src/
  routes/
    +layout.svelte   navbar, footer, global styles
    +page.svelte     all page sections and project cards
  app.html           HTML shell
static/              favicon and images
```

## Contact

- [LinkedIn](https://www.linkedin.com/in/eddie-lin-1363a5318/)
- [GitHub](https://github.com/onetwothreefourfivesixe)
- [edwardxuming.lin@gmail.com](mailto:edwardxuming.lin@gmail.com)
