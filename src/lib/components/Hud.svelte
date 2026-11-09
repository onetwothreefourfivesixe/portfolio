<script lang="ts">
    import { hud, sections } from "#lib/era.svelte.ts";

    // The era tokens in app.css key off body[data-era], so the body attribute follows the renderer.
    $effect(() => {
        document.body.dataset.era = hud.era;
    });
</script>

<header class="hud">
    <div class="hud-inner">
        <nav aria-label="Sections">
            {#each sections as s, j (s.id)}
                <a href="#{s.id}" aria-current={hud.index === j ? "true" : "false"}>{s.label}</a>
            {/each}
        </nav>
        <div class="readout" aria-live="off">
            <span class="era-name">{hud.name}</span>
            <span class="pop">pop. {hud.pop}</span>
            <!-- Years before 1 are astronomical: 0 is 1 BC, -431 is 432 BC. -->
            <span>{#if hud.year > 0}AD <b>{hud.year}</b>{:else}<b>{1 - hud.year}</b> BC{/if}</span>
        </div>
    </div>
</header>

<style>
    .hud {
        position: fixed;
        top: env(safe-area-inset-top, 0px);
        left: 0;
        right: 0;
        z-index: 6;
        padding-left: var(--gl);
        padding-right: var(--gr);
        pointer-events: none;
    }
    .hud-inner {
        pointer-events: auto;
        max-width: 1180px;
        margin: 10px auto 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 7px 8px 7px 16px;
        background: var(--hud-bg);
        color: var(--hud-fg);
        border: 1px solid var(--hud-line);
        border-radius: var(--hud-r);
        font-family: var(--hud-font);
        transition:
            background-color 0.6s,
            color 0.6s,
            border-color 0.6s,
            border-radius 0.6s;
        backdrop-filter: blur(10px);
    }
    nav {
        display: flex;
        gap: 2px;
        flex-wrap: wrap;
    }
    nav a {
        text-decoration: none;
        font-size: 0.82rem;
        padding: 6px 10px;
        border-radius: var(--hud-r);
        letter-spacing: 0.02em;
        transition:
            background-color 0.4s,
            color 0.4s;
    }
    nav a[aria-current="true"] {
        background: var(--hud-fg);
        color: var(--hud-bg);
    }
    .readout {
        display: flex;
        align-items: baseline;
        gap: 12px;
        white-space: nowrap;
        font-variant-numeric: tabular-nums;
        font-size: 0.8rem;
    }
    .readout b {
        font-size: 1.05rem;
        letter-spacing: 0.04em;
    }
    .era-name,
    .pop {
        opacity: 0.75;
    }
    @media (max-width: 760px) {
        .era-name,
        .pop {
            display: none;
        }
        .hud-inner {
            padding-left: 8px;
        }
        nav a {
            padding: 6px 7px;
            font-size: 0.76rem;
        }
    }
    /* Phones: five links and the year don't share one line, so the bar becomes two rows:
       links spread across the top, era name and year beneath. */
    @media (max-width: 520px) {
        .hud-inner {
            flex-direction: column;
            align-items: stretch;
            gap: 0;
            padding: 4px 6px 5px;
        }
        nav {
            flex-wrap: nowrap;
            justify-content: space-between;
            overflow-x: auto;
            scrollbar-width: none;
        }
        nav::-webkit-scrollbar {
            display: none;
        }
        nav a {
            padding: 6px 5px;
            font-size: 0.74rem;
            letter-spacing: 0;
            white-space: nowrap;
        }
        .readout {
            justify-content: center;
            gap: 10px;
            font-size: 0.72rem;
        }
        .readout b {
            font-size: 0.9rem;
        }
        .era-name {
            display: inline;
            overflow: hidden;
            text-overflow: ellipsis;
        }
    }
    @media (max-width: 360px) {
        nav a {
            padding: 6px 2px;
            font-size: 0.68rem;
        }
    }
</style>
