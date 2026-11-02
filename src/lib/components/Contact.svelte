<script lang="ts">
    import { links } from "#lib/content.ts";

    let emailEl: HTMLElement;
    let label = $state("Copy");
    let timer: ReturnType<typeof setTimeout> | undefined;

    const channels = [
        { ch: "CH-01", name: "GitHub", href: links.github },
        { ch: "CH-02", name: "LinkedIn", href: links.linkedin },
        { ch: "CH-03", name: "Résumé", href: links.resume },
    ];

    function setLabel(text: string, revert: boolean) {
        label = text;
        clearTimeout(timer);
        if (revert) timer = setTimeout(() => (label = "Copy"), 1600);
    }

    // Falls back to selecting the address when clipboard access is refused.
    function select() {
        const r = document.createRange();
        r.selectNodeContents(emailEl);
        const s = getSelection();
        if (!s) return;
        s.removeAllRanges();
        s.addRange(r);
        setLabel("Selected", false);
    }

    function copy() {
        try {
            navigator.clipboard.writeText(links.email).then(() => setLabel("Copied", true), select);
        } catch {
            select();
        }
    }
</script>

<section id="contact" data-era="future">
    <div class="panel future">
        <p class="eyebrow">Skyport · AD 2150</p>
        <h2>Contact</h2>
        <p class="intro-note">
            Open to internships, research, and collaborations, especially anything in AI alignment and safety. Email
            reaches me fastest.
        </p>
        <div class="uplink">
            <code bind:this={emailEl}>{links.email}</code>
            <button type="button" onclick={copy}>{label}</button>
        </div>
        <ul class="channels">
            {#each channels as c (c.ch)}
                <li>
                    <a href={c.href} target="_blank" rel="noopener noreferrer">
                        <span class="ch">{c.ch}</span><span class="name">{c.name}</span><span class="arrow">↗</span>
                    </a>
                </li>
            {/each}
            <li>
                <a href="mailto:{links.email}">
                    <span class="ch">CH-04</span><span class="name">Email</span><span class="arrow">↗</span>
                </a>
            </li>
        </ul>
        <div class="status"><span class="live">Uplink open</span><span>Based at UC Berkeley</span></div>
    </div>
</section>

<style>
    /* Skyport: holographic console */
    .future {
        max-width: 1100px;
        position: relative;
        color: var(--holo);
        font-family: var(--f-fut-body);
        padding: clamp(26px, 5vw, 56px);
        background: linear-gradient(160deg, rgba(10, 14, 48, 0.9), rgba(6, 8, 32, 0.88));
        border: 1px solid rgba(62, 242, 255, 0.55);
        clip-path: polygon(22px 0, 100% 0, 100% calc(100% - 22px), calc(100% - 22px) 100%, 0 100%, 0 22px);
        box-shadow: inset 0 0 50px rgba(62, 242, 255, 0.12);
    }
    .future::after {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        background: repeating-linear-gradient(0deg, rgba(217, 248, 255, 0.04) 0 1px, transparent 1px 4px);
    }
    .eyebrow {
        font-size: 0.78rem;
        letter-spacing: 0.24em;
        text-transform: uppercase;
        color: var(--cyan);
    }
    h2 {
        font-family: var(--f-fut);
        font-weight: 400;
        font-size: clamp(2.1rem, 7.5vw, 4.6rem);
        letter-spacing: 0.1em;
        text-transform: uppercase;
        margin-top: 14px;
        background: linear-gradient(90deg, var(--cyan), var(--holo) 45%, var(--magenta));
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
    }
    .intro-note {
        font-size: 1.08rem;
        line-height: 1.6;
        max-width: 56ch;
        color: #b8d9e6;
    }
    .uplink {
        margin-top: 30px;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 12px;
        padding: 16px;
        border: 1px solid rgba(62, 242, 255, 0.35);
        background: rgba(62, 242, 255, 0.06);
    }
    .uplink code {
        font-family: var(--f-fut);
        font-size: clamp(0.82rem, 2.6vw, 1.12rem);
        letter-spacing: 0.04em;
        overflow-wrap: anywhere;
        flex: 1 1 220px;
        min-width: 0;
        user-select: all;
    }
    .uplink button {
        font: 600 0.85rem var(--f-fut-body);
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--void);
        background: var(--cyan);
        border: 0;
        padding: 10px 18px;
        cursor: pointer;
        clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);
    }
    .uplink button:hover {
        background: var(--holo);
    }
    .channels {
        list-style: none;
        padding: 0;
        margin: 22px 0 0;
        display: grid;
        gap: 2px;
    }
    .channels a {
        display: grid;
        grid-template-columns: 70px minmax(0, 1fr) auto;
        gap: 14px;
        align-items: center;
        padding: 14px 4px;
        text-decoration: none;
        border-bottom: 1px solid rgba(62, 242, 255, 0.18);
        transition:
            background-color 0.25s,
            padding 0.25s;
    }
    .channels a:hover {
        background: rgba(255, 62, 165, 0.1);
        padding-left: 12px;
    }
    .ch {
        font-size: 0.74rem;
        letter-spacing: 0.16em;
        color: var(--magenta);
    }
    .name {
        font-size: 1.15rem;
        font-weight: 600;
    }
    .arrow {
        color: var(--cyan);
    }
    .status {
        margin-top: 26px;
        display: flex;
        flex-wrap: wrap;
        gap: 8px 22px;
        font-size: 0.78rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: #7fa7b8;
    }
    .live::before {
        content: "";
        display: inline-block;
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--cyan);
        margin-right: 8px;
        box-shadow: 0 0 10px var(--cyan);
        animation: blink 2s infinite;
    }
    @keyframes blink {
        50% {
            opacity: 0.3;
        }
    }
    @media (prefers-reduced-motion: reduce) {
        .live::before {
            animation: none;
        }
    }
</style>
