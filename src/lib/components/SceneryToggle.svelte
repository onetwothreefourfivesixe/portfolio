<script lang="ts">
    // Bottom-right switch that fades the section panels out so the town behind them can be seen.
    // The panels keep their space, so scrolling still travels through the eras while they are hidden.
    let hidden = $state(false);

    $effect(() => {
        document.body.classList.toggle("scenery-only", hidden);
    });
</script>

<button type="button" class="scenery-toggle" aria-pressed={hidden} onclick={() => (hidden = !hidden)}>
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path
            d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linejoin="round"
        />
        <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.8" />
        {#if !hidden}
            <path d="M4 4l16 16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
        {/if}
    </svg>
    <span>{hidden ? "Show content" : "Hide content"}</span>
</button>

<style>
    /* Same era tokens as the HUD, so the button restyles itself in every era */
    .scenery-toggle {
        position: fixed;
        right: calc(var(--gr, 16px) + env(safe-area-inset-right, 0px));
        bottom: calc(16px + env(safe-area-inset-bottom, 0px));
        z-index: 7;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 9px 16px;
        border: 1px solid var(--hud-line);
        border-radius: var(--hud-r);
        background: var(--hud-bg);
        color: var(--hud-fg);
        font-family: var(--hud-font);
        font-size: 0.9rem;
        cursor: pointer;
        backdrop-filter: blur(10px);
        box-shadow: 0 8px 24px -10px rgba(0, 0, 0, 0.45);
        transition:
            background-color 0.2s,
            transform 0.2s;
    }
    .scenery-toggle:hover {
        transform: translateY(-2px);
    }
    .scenery-toggle:focus-visible {
        outline: 2px solid var(--hud-line);
        outline-offset: 3px;
    }
    @media (max-width: 520px) {
        /* Icon only on phones, the label stays available to screen readers */
        .scenery-toggle {
            padding: 11px;
        }
        .scenery-toggle span {
            position: absolute;
            width: 1px;
            height: 1px;
            overflow: hidden;
            clip-path: inset(50%);
            white-space: nowrap;
        }
    }
</style>
