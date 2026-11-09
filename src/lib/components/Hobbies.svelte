<script lang="ts">
    import { pursuits, type Pursuit } from "#lib/content.ts";
    import { parseLinks } from "#lib/richtext.ts";

    // Greek alphabetic numerals with the keraia, as on inscriptions: Α΄ = 1, Β΄ = 2 ...
    const NUM = ["Α΄", "Β΄", "Γ΄", "Δ΄", "Ε΄", "Ϛ΄", "Ζ΄", "Η΄", "Θ΄", "Ι΄", "ΙΑ΄", "ΙΒ΄"];

    const groups: { id: string; title: string; sub: string; items: Pursuit[] }[] = [
        { id: "extracurriculars", title: "Societies", sub: "Extracurriculars", items: pursuits.extracurriculars },
        { id: "hobbies", title: "Pursuits", sub: "Hobbies", items: pursuits.hobbies },
    ];

    // A card's pictures: the images list if given, otherwise the single image
    const pics = (p: Pursuit) => p.images?.length ? p.images : p.image ? [{ src: p.image, alt: p.imageAlt || p.name }] : [];
    // Which picture each multi-image card is showing, keyed by group and position
    let shown: Record<string, number> = $state({});
</script>

<!-- Empty fields in content.json render as faded placeholders, so the template shows where each piece goes. -->
{#snippet rich(text: string)}{#each parseLinks(text) as seg, i (i)}{#if seg.href}<a href={seg.href} target={seg.external ? "_blank" : undefined} rel={seg.external ? "noopener noreferrer" : undefined}>{seg.text}</a>{:else}{seg.text}{/if}{/each}{/snippet}

<section id="hobbies" data-era="classical">
    <div class="panel temple">
        <svg class="pediment" viewBox="0 0 1000 120" preserveAspectRatio="none" aria-hidden="true">
            <polygon points="0,120 500,0 1000,120" fill="var(--marble-deep)" />
            <!-- Blue tympanum, inset by an even marble band (22 units down each slope) -->
            <polygon points="125,112 500,22 875,112" fill="var(--aegean)" />
            <polygon points="0,120 500,0 1000,120 990,120 500,8 10,120" fill="var(--vein)" />
        </svg>
        <div class="entablature">
            <p class="inscription">ΑΓΟΡΑ · The Agora · 432 BC</p>
        </div>
        <div class="frieze" aria-hidden="true"></div>

        <div class="cella">
            <h2>Hobbies <span class="amp">&amp;</span> Extracurriculars</h2>
            {#if pursuits.intro}
                <p class="intro-note">{@render rich(pursuits.intro)}</p>
            {:else}
                <p class="intro-note pending">An opening line about life outside of class goes here.</p>
            {/if}

            {#each groups as g (g.id)}
                <div class="group">
                    <h3 class="group-title"><span>{g.title}</span><small>{g.sub}</small></h3>
                    <div class="steles">
                        {#each g.items as item, i (item.name + i)}
                            {@const ps = pics(item)}
                            {@const key = g.id + i}
                            <article class="stele">
                                <figure class="relief" class:empty={!ps.length}>
                                    {#if ps.length}
                                        {#each ps as pic, j (pic.src)}
                                            <img src={pic.src} alt={pic.alt} loading="lazy" class:on={(shown[key] ?? 0) === j} aria-hidden={(shown[key] ?? 0) !== j} />
                                        {/each}
                                        {#if ps.length > 1}
                                            <div class="dots">
                                                {#each ps as pic, j (pic.src)}
                                                    <button
                                                        type="button"
                                                        class:on={(shown[key] ?? 0) === j}
                                                        aria-label={`Show picture ${j + 1} of ${ps.length}: ${pic.alt}`}
                                                        aria-pressed={(shown[key] ?? 0) === j}
                                                        onclick={() => (shown[key] = j)}
                                                    ></button>
                                                {/each}
                                            </div>
                                        {/if}
                                    {:else}
                                        <svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true">
                                            <path
                                                d="M9 2.5h6M10 2.5v2.6c0 .9-.6 1.4-1.3 1.9C6.4 8.6 5 11 5 14c0 4 3.1 7.5 7 7.5s7-3.5 7-7.5c0-3-1.4-5.4-3.7-7-.7-.5-1.3-1-1.3-1.9V2.5M5.6 11.5h12.8M5.4 16h13.2"
                                                fill="none"
                                                stroke="currentColor"
                                                stroke-width="1.4"
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                            />
                                        </svg>
                                        <figcaption>Image to come</figcaption>
                                    {/if}
                                </figure>
                                <p class="numeral">{NUM[i] ?? i + 1}</p>
                                <h4 class:pending={!item.name}>{item.name || "Name"}</h4>
                                {#if item.role || item.years}
                                    <p class="role">{[item.role, item.years].filter(Boolean).join(" · ")}</p>
                                {:else}
                                    <p class="role pending">Role · Years</p>
                                {/if}
                                {#if item.desc}
                                    <p class="desc">{@render rich(item.desc)}</p>
                                {:else}
                                    <p class="desc pending">A sentence or two about what you do and why it matters to you.</p>
                                {/if}
                                {#if item.links.length}
                                    <p class="links">
                                        {#each item.links as l (l.href)}
                                            <a href={l.href} target="_blank" rel="noopener noreferrer">{l.label}</a>
                                        {/each}
                                    </p>
                                {/if}
                            </article>
                        {/each}
                    </div>
                </div>
            {/each}

            <a class="cue" href="#contact">Contact · leap ahead to AD 2150 ↓</a>
        </div>

        <div class="stylobate" aria-hidden="true"><span></span><span></span><span></span></div>
    </div>
</section>

<style>
    /* The stylobate steps reach past the panel; keep them from causing sideways scroll on tablets */
    section {
        overflow-x: clip;
    }
    /* The Agora: a marble temple front. Pediment, meander frieze, a cella between two fluted columns, stepped base. */
    .temple {
        max-width: 1100px;
        color: var(--temple-ink);
        font-family: var(--f-book);
        filter: drop-shadow(0 30px 40px rgba(40, 30, 20, 0.35));
    }
    .pediment {
        display: block;
        width: 100%;
        height: clamp(44px, 9vw, 104px);
        margin-bottom: -1px;
    }
    .entablature {
        background: var(--marble-deep);
        border-top: 3px solid var(--vein);
        padding: 8px 16px;
        text-align: center;
    }
    .inscription {
        font-family: var(--f-classic);
        font-size: clamp(0.72rem, 1.6vw, 0.9rem);
        letter-spacing: 0.32em;
        color: #5b4a3a;
    }
    /* Running meander (Greek key) in terracotta on marble */
    .frieze {
        height: 26px;
        background-color: var(--marble);
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Cpath d='M0 21H19V3H5V15H13V9H9M19 21H24' fill='none' stroke='%23a8552f' stroke-width='2' stroke-linecap='square'/%3E%3C/svg%3E");
        background-size: 22px 22px;
        background-position: center 2px;
        background-repeat: repeat-x;
        border-top: 2px solid var(--terracotta);
        border-bottom: 2px solid var(--terracotta);
    }
    .cella {
        position: relative;
        padding: clamp(26px, 5vw, 56px) clamp(28px, 6vw, 64px);
        background:
            radial-gradient(ellipse 60% 40% at 20% 10%, rgba(255, 255, 255, 0.55), transparent 70%),
            radial-gradient(ellipse 50% 30% at 85% 80%, rgba(205, 191, 166, 0.35), transparent 70%),
            linear-gradient(176deg, #f7f2e9, var(--marble) 55%, #ebe2d1);
    }
    /* Fluted Doric columns framing the cella on wide screens */
    .cella::before,
    .cella::after {
        content: "";
        position: absolute;
        top: 0;
        bottom: 0;
        width: clamp(28px, 6vw, 64px); /* same as the cella side padding, so columns meet the content */
        background:
            linear-gradient(90deg, rgba(60, 45, 30, 0.18), transparent 30%, transparent 65%, rgba(60, 45, 30, 0.28)),
            repeating-linear-gradient(90deg, #efe7d8 0 5px, #d9ccb4 5px 6px, #f6f0e4 6px 9px);
    }
    .cella::before {
        left: 0;
    }
    .cella::after {
        right: 0;
    }
    h2 {
        font-family: var(--f-classic);
        font-weight: 600;
        font-size: clamp(1.2rem, 6.2vw, 4rem);
        letter-spacing: 0.06em;
        line-height: 1.05;
        text-align: center;
        overflow-wrap: anywhere;
    }
    .amp {
        font-family: var(--f-book);
        font-style: italic;
        font-weight: 400;
        color: var(--terracotta);
    }
    .intro-note {
        margin: 14px auto 0;
        text-align: center;
        font-size: 1.2rem;
        line-height: 1.55;
    }
    .group {
        margin-top: 44px;
    }
    .group-title {
        display: flex;
        align-items: center;
        gap: 16px;
        font-family: var(--f-classic);
        font-weight: 700;
        font-size: 1.15rem;
        letter-spacing: 0.24em;
        text-transform: uppercase;
    }
    .group-title::before,
    .group-title::after {
        content: "";
        flex: 1;
        height: 1px;
        background: var(--terracotta);
    }
    .group-title small {
        font-family: var(--f-book);
        font-style: italic;
        font-weight: 400;
        font-size: 1rem;
        letter-spacing: 0.02em;
        text-transform: none;
        color: #6b5a48;
    }
    .steles {
        margin-top: 24px;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(min(100%, 230px), 1fr));
        gap: 30px 26px;
    }
    /* Each entry is a grave stele: a small gable on top, a relief panel, then the carved text */
    .stele {
        position: relative;
        min-width: 0;
        padding: 26px 18px 20px;
        background: linear-gradient(180deg, #fbf8f2, #f1eadc);
        border: 1px solid var(--vein);
        box-shadow: inset 0 -3px 0 var(--marble-deep);
    }
    .stele::before {
        content: "";
        position: absolute;
        left: -1px;
        right: -1px;
        bottom: 100%;
        height: 14px;
        background: var(--vein);
        clip-path: polygon(0 100%, 50% 0, 100% 100%);
    }
    .relief {
        margin: 0;
        aspect-ratio: 4 / 3;
        overflow: hidden;
        border: 1px solid var(--vein);
        box-shadow: inset 0 0 0 4px #fbf8f2, inset 0 0 0 5px var(--vein);
        background: var(--marble-deep);
    }
    .relief:not(.empty) {
        position: relative;
    }
    /* Pictures are stacked; only the selected one is visible */
    .relief img {
        position: absolute;
        inset: 0;
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
        opacity: 0;
        transition: opacity 0.35s;
    }
    .relief img.on {
        opacity: 1;
    }
    .dots {
        position: absolute;
        left: 50%;
        bottom: 8px;
        transform: translateX(-50%);
        display: flex;
        gap: 6px;
        padding: 5px 8px;
        border-radius: 999px;
        background: rgba(40, 30, 20, 0.45);
    }
    .dots button {
        width: 10px;
        height: 10px;
        padding: 0;
        border: 1px solid #fbf8f2;
        border-radius: 50%;
        background: transparent;
        cursor: pointer;
    }
    .dots button.on {
        background: #fbf8f2;
    }
    .dots button:focus-visible {
        outline: 2px solid var(--terracotta);
        outline-offset: 2px;
    }
    .relief.empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        color: var(--bronze);
        background: repeating-linear-gradient(135deg, #efe6d6 0 10px, #eadfcb 10px 20px);
        box-shadow: inset 0 0 0 6px #f6f0e4, inset 0 0 0 7px rgba(138, 106, 46, 0.5);
    }
    .relief figcaption {
        font-family: var(--f-classic);
        font-size: 0.72rem;
        letter-spacing: 0.22em;
        text-transform: uppercase;
    }
    .numeral {
        margin-top: 14px;
        font-family: var(--f-classic);
        font-size: 0.85rem;
        letter-spacing: 0.18em;
        color: var(--terracotta);
    }
    h4 {
        margin: 2px 0 0;
        font-family: var(--f-classic);
        font-weight: 600;
        font-size: 1.28rem;
        letter-spacing: 0.04em;
        line-height: 1.2;
    }
    .role {
        margin-top: 4px;
        font-style: italic;
        font-size: 1.02rem;
        color: #5b4a3a;
    }
    .desc {
        margin-top: 10px;
        font-size: 1.1rem;
        line-height: 1.5;
    }
    .desc a,
    .intro-note a,
    .links a {
        color: var(--aegean);
        text-underline-offset: 3px;
    }
    .links {
        margin-top: 12px;
        display: flex;
        gap: 16px;
        flex-wrap: wrap;
        font-size: 1.02rem;
    }
    /* Template slots that are still empty in content.json */
    .pending {
        color: #9a8a76;
        font-style: italic;
    }
    h4.pending {
        font-style: normal;
    }
    .cue {
        color: var(--terracotta);
        font-family: var(--f-classic);
        font-size: 0.95rem;
        letter-spacing: 0.06em;
    }
    /* Three steps of the crepidoma, each wider than the one above */
    .stylobate span {
        display: block;
        height: clamp(8px, 1.4vw, 14px);
        background: linear-gradient(180deg, #efe7d8, #d8ccb4);
        border-bottom: 1px solid #bfae90;
    }
    .stylobate span:nth-child(1) {
        margin-inline: -6px;
    }
    .stylobate span:nth-child(2) {
        margin-inline: -12px;
    }
    .stylobate span:nth-child(3) {
        margin-inline: -18px;
    }
    @media (max-width: 480px) {
        h2 {
            letter-spacing: 0.02em;
        }
        .group-title {
            gap: 10px;
            letter-spacing: 0.14em;
        }
    }
    @media (max-width: 700px) {
        .cella::before,
        .cella::after {
            display: none;
        }
        .stylobate span:nth-child(n) {
            margin-inline: 0;
        }
    }
</style>
