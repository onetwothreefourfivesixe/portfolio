<script lang="ts">
    import { projects } from "#lib/content.ts";

    const numerals = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"];
    const shown = projects.filter((p) => !p.hidden);
</script>

<section id="projects" data-era="medieval">
    <div class="panel vellum">
        <p class="incipit">Here begin the charters of the Old Town, anno 1347</p>
        <h2>Projects</h2>
        <p class="intro-note">Things I made by hand, on my own time, for the joy of the craft.</p>
        <div class="charters">
            {#each shown as p, i (p.name)}
                <article class="charter">
                    <p class="folio">Folio {numerals[i]}</p>
                    {#if p.image}
                        <figure class="miniature">
                            <img src={p.image} alt={p.imageAlt || p.name} loading="lazy" />
                        </figure>
                    {/if}
                    <h3>{p.name}</h3>
                    <p class="desc">{p.desc}</p>
                    {#if p.wrought || p.built}<p class="wrought">{p.wrought || p.built}</p>{/if}
                    {#if p.links.length}
                        <p class="links">
                            {#each p.links as l (l.href)}
                                <a href={l.href} target="_blank" rel="noopener noreferrer">{l.label}</a>
                            {/each}
                        </p>
                    {/if}
                </article>
            {/each}
        </div>
        <a class="cue" href="#hobbies">Hobbies · further back to 432 BC ↓</a>
    </div>
</section>

<style>
    /* Old Town: illuminated vellum folio */
    .vellum {
        max-width: 1100px;
        color: var(--iron-gall);
        font-family: var(--f-book);
        padding: clamp(28px, 6vw, 64px);
        background: radial-gradient(ellipse at center, #f7ecd2 40%, #e7d4a8 100%);
        box-shadow:
            inset 0 0 0 1px var(--iron-gall),
            inset 0 0 0 7px var(--vellum),
            inset 0 0 0 8px var(--rubric),
            0 30px 60px -30px rgba(46, 32, 23, 0.6);
    }
    .incipit {
        font-style: italic;
        font-size: 1.05rem;
        color: var(--rubric);
    }
    h2 {
        font-family: var(--f-goth);
        font-weight: 700;
        font-size: clamp(3.4rem, 11vw, 6.8rem);
        line-height: 0.95;
        margin-top: 4px;
    }
    .intro-note {
        font-size: 1.2rem;
        line-height: 1.55;
        margin-top: 12px;
    }
    .charters {
        margin-top: 34px;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
        gap: 34px 44px;
    }
    .charter {
        border-top: 1px solid var(--iron-gall);
        padding-top: 16px;
        min-width: 0;
    }
    .folio {
        font-size: 0.82rem;
        font-variant: small-caps;
        letter-spacing: 0.12em;
        color: var(--gilt);
    }
    /* Optional project picture, framed like an illuminated miniature */
    .miniature {
        margin: 8px 0 12px;
        aspect-ratio: 4 / 3;
        padding: 5px;
        background: var(--vellum);
        border: 2px solid var(--gilt);
        box-shadow:
            inset 0 0 0 1px var(--rubric),
            0 0 0 1px var(--iron-gall);
    }
    .miniature img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
        border: 1px solid var(--iron-gall);
    }
    .charter h3 {
        font-family: var(--f-goth);
        font-weight: 500;
        font-size: 2rem;
        margin-top: 2px;
    }
    .desc {
        font-size: 1.14rem;
        line-height: 1.5;
        margin-top: 10px;
    }
    .desc::first-letter {
        font-family: var(--f-goth);
        font-weight: 700;
        float: left;
        font-size: 3.4em;
        line-height: 0.8;
        padding: 4px 8px 0 0;
        color: var(--rubric);
    }
    .wrought {
        margin-top: 12px;
        font-variant: small-caps;
        letter-spacing: 0.06em;
        font-size: 1rem;
        color: #5c4530;
    }
    .links {
        margin-top: 12px;
        display: flex;
        gap: 18px;
        flex-wrap: wrap;
    }
    .links a {
        color: var(--rubric);
        text-underline-offset: 3px;
        font-size: 1.05rem;
    }
    .cue {
        color: var(--rubric);
        font-style: italic;
        font-size: 1.1rem;
    }
</style>
