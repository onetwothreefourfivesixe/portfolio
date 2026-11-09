<script lang="ts">
    import { lightbox, closeLightbox } from "#lib/lightbox.svelte.ts";

    // A native modal <dialog>: Esc closes it, focus stays inside while open and returns to the
    // clicked picture afterwards. Clicking the dark backdrop or the close button also dismisses it.
    let dlg: HTMLDialogElement;

    $effect(() => {
        if (lightbox.src && !dlg.open) dlg.showModal();
        else if (!lightbox.src && dlg.open) dlg.close();
    });
</script>

<dialog
    bind:this={dlg}
    class="lightbox"
    aria-label={lightbox.alt || "Enlarged picture"}
    onclose={closeLightbox}
    onclick={(e) => {
        if (e.target === dlg) closeLightbox();
    }}
>
    {#if lightbox.src}
        <figure>
            <img src={lightbox.src} alt={lightbox.alt} />
            {#if lightbox.alt}<figcaption>{lightbox.alt}</figcaption>{/if}
        </figure>
    {/if}
    <button type="button" class="close" aria-label="Close picture" onclick={closeLightbox}>
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
    </button>
</dialog>

<style>
    /* Freeze the page (and so the era) behind the open picture */
    :global(html:has(dialog.lightbox[open])) {
        overflow: hidden;
    }
    .lightbox {
        width: 100vw;
        height: 100dvh;
        max-width: none;
        max-height: none;
        margin: 0;
        padding: 0;
        border: 0;
        background: transparent;
        display: none;
    }
    .lightbox[open] {
        display: grid;
        place-items: center;
    }
    .lightbox::backdrop {
        background: rgba(10, 10, 14, 0.82);
        backdrop-filter: blur(3px);
    }
    figure {
        margin: 0;
        padding: 16px;
        max-width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        pointer-events: none;
    }
    img {
        display: block;
        max-width: min(1400px, calc(100vw - 32px));
        max-height: calc(100dvh - 120px);
        width: auto;
        height: auto;
        object-fit: contain;
        border-radius: 4px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.55);
        pointer-events: auto;
    }
    figcaption {
        max-width: 70ch;
        color: #f1ece2;
        font-family: var(--f-book, serif);
        font-size: 1.05rem;
        line-height: 1.45;
        text-align: center;
    }
    .close {
        position: fixed;
        top: calc(14px + env(safe-area-inset-top, 0px));
        right: calc(14px + env(safe-area-inset-right, 0px));
        width: 44px;
        height: 44px;
        display: grid;
        place-items: center;
        border: 1px solid rgba(255, 255, 255, 0.45);
        border-radius: 50%;
        background: rgba(20, 20, 26, 0.6);
        color: #fff;
        cursor: pointer;
    }
    .close:hover {
        background: rgba(60, 60, 70, 0.8);
    }
    .close:focus-visible {
        outline: 2px solid #fff;
        outline-offset: 3px;
    }
    @media (prefers-reduced-motion: no-preference) {
        .lightbox[open] {
            animation: fade 0.18s ease-out;
        }
        @keyframes fade {
            from {
                opacity: 0;
            }
        }
    }
</style>
