<script lang="ts">
    import { bio, links } from "#lib/content.ts";

    // One shortcut per section, labelled with the era its skyline rewinds to
    const shortcuts = [
        { href: "#experience", label: "Experience", era: "AD 1888" },
        { href: "#projects", label: "Projects", era: "AD 1347" },
        { href: "#hobbies", label: "Hobbies", era: "432 BC" },
        { href: "#contact", label: "Contact", era: "AD 2150" },
    ];
</script>

<section id="intro" data-era="modern">
    <div class="panel modern">
        <div class="who">
            <img
                src="/IMG20250517200848_01.jpg"
                alt="Edward Lin"
                class="portrait"
                width="720"
                height="720"
            />
            <div class="who-text">
                <p class="eyebrow">Midtown · AD 2026</p>
                <h1>Edward Lin</h1>
            </div>
        </div>
        <p class="lede">{bio}</p>
        <p class="lede">
            Check out my <a
                href={links.resume}
                target="_blank"
                rel="noopener noreferrer">resume</a
            >.
        </p>
        <p class="lede">
            This site is one town seen across time. As you scroll, the skyline
            behind each section rewinds to a new era: my experience sits in a
            Victorian factory town (1888), my projects in a medieval old town
            (1347), and my hobbies in classical Athens (432 BC). To get in
            touch, jump ahead to the city of AD 2150.
        </p>
        <nav class="cues" aria-label="Jump to a section">
            {#each shortcuts as c (c.href)}
                <a class="cue" href={c.href}>{c.label} · {c.era} ↓</a>
            {/each}
        </nav>
    </div>
</section>

<style>
    /* Midtown: glass curtain wall */
    .modern {
        max-width: 1100px;
        background: var(--glass);
        border: 1px solid var(--glass-edge);
        border-radius: 22px;
        padding: clamp(24px, 5vw, 56px);
        backdrop-filter: blur(16px) saturate(1.3);
        box-shadow: 0 30px 60px -30px rgba(14, 27, 38, 0.35);
    }
    .who {
        display: flex;
        align-items: center;
        gap: clamp(16px, 4vw, 32px);
        flex-wrap: wrap;
    }
    .who-text {
        flex: 1 1 260px;
        min-width: 0;
    }
    .portrait {
        flex: none;
        width: clamp(120px, 22vw, 200px);
        height: clamp(120px, 22vw, 200px);
        border-radius: 50%;
        object-fit: cover;
        border: 3px solid var(--glass-edge);
        box-shadow: 0 10px 30px -12px rgba(14, 27, 38, 0.5);
    }
    .eyebrow {
        font-size: 0.78rem;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        color: var(--signal);
        font-weight: 600;
    }
    h1 {
        font-size: clamp(2.9rem, 9vw, 5.6rem);
        font-stretch: 125%;
        font-weight: 800;
        letter-spacing: -0.035em;
        line-height: 0.9;
        margin-top: 14px;
    }
    .lede {
        font-size: 1.05rem;
        line-height: 1.6;
        max-width: none;
        margin-top: 18px;
        color: #26394a;
    }
    .lede a {
        color: var(--signal);
        font-weight: 600;
    }
    /* Same pill and 34px gap as every other section's next-section button */
    .cues {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 12px 14px;
        margin-top: 34px;
    }
    .cue {
        margin: 0;
        color: var(--signal);
        font-weight: 600;
    }
</style>
