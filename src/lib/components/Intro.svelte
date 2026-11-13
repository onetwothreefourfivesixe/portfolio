<script lang="ts">
    import { bio, links, status, tagline } from "#lib/content.ts";

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
                {#if tagline}<p class="tagline">{tagline}</p>{/if}
                {#if status}
                    <p class="status">
                        <span class="dot" aria-hidden="true"></span>{status}
                    </p>
                {/if}
            </div>
        </div>
        <ul class="profile-links" aria-label="Resume and profiles">
            <li>
                <a
                    class="btn primary"
                    href={links.resume}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <svg
                        viewBox="0 0 24 24"
                        width="17"
                        height="17"
                        aria-hidden="true"
                    >
                        <path
                            d="M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="1.8"
                            stroke-linejoin="round"
                        />
                    </svg>
                    Resume
                </a>
            </li>
            <li>
                <a
                    class="btn"
                    href={links.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <svg
                        viewBox="0 0 24 24"
                        width="17"
                        height="17"
                        aria-hidden="true"
                    >
                        <path
                            fill="currentColor"
                            d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4V21H3zM9.5 9.75h3.8v1.6h.06c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.77 2.6 4.77 5.98V21h-4v-5.1c0-1.22-.02-2.78-1.7-2.78-1.7 0-1.95 1.32-1.95 2.69V21h-4z"
                        />
                    </svg>
                    LinkedIn
                </a>
            </li>
            <li>
                <a
                    class="btn"
                    href={links.github}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <svg
                        viewBox="0 0 24 24"
                        width="17"
                        height="17"
                        aria-hidden="true"
                    >
                        <path
                            fill="currentColor"
                            d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.6 9.6 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"
                        />
                    </svg>
                    GitHub
                </a>
            </li>
        </ul>
        <p class="lede">{bio}</p>
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
    .tagline {
        margin-top: 12px;
        font-size: 0.92rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        color: #3d5568;
    }
    /* Availability badge with a softly pulsing "online" dot */
    .status {
        display: inline-flex;
        align-items: center;
        gap: 9px;
        margin-top: 14px;
        padding: 6px 14px 6px 12px;
        border: 1px solid rgba(23, 128, 74, 0.35);
        border-radius: 999px;
        background: rgba(232, 247, 238, 0.85);
        color: #135c38;
        font-size: 0.88rem;
        font-weight: 600;
        line-height: 1.3;
    }
    .dot {
        position: relative;
        flex: none;
        width: 9px;
        height: 9px;
        border-radius: 50%;
        background: #1f9d5a;
    }
    @media (prefers-reduced-motion: no-preference) {
        .dot::after {
            content: "";
            position: absolute;
            inset: 0;
            border-radius: 50%;
            background: #1f9d5a;
            animation: ping 2.4s ease-out infinite;
        }
        @keyframes ping {
            0% {
                transform: scale(1);
                opacity: 0.55;
            }
            70%,
            100% {
                transform: scale(2.6);
                opacity: 0;
            }
        }
    }
    /* Resume and profile links as small glass buttons */
    .profile-links {
        list-style: none;
        display: flex;
        flex-wrap: wrap;
        gap: 10px 12px;
        margin: 22px 0 0;
        padding: 0;
    }
    .btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 9px 18px;
        border: 1px solid rgba(11, 95, 184, 0.35);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.6);
        color: var(--signal);
        font-size: 0.95rem;
        font-weight: 600;
        text-decoration: none;
        box-shadow: 0 6px 16px -10px rgba(14, 27, 38, 0.45);
        transition:
            background-color 0.2s,
            transform 0.2s,
            box-shadow 0.2s;
    }
    .btn:hover {
        background: rgba(255, 255, 255, 0.92);
        transform: translateY(-2px);
        box-shadow: 0 10px 20px -10px rgba(14, 27, 38, 0.5);
    }
    .btn.primary {
        background: var(--signal);
        border-color: var(--signal);
        color: #fff;
    }
    .btn.primary:hover {
        background: #0a4f9a;
    }
    .btn:focus-visible {
        outline: 2px solid var(--signal);
        outline-offset: 3px;
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
    @media (max-width: 520px) {
        .tagline {
            font-size: 0.8rem;
            letter-spacing: 0.08em;
        }
        .status {
            border-radius: 14px;
            font-size: 0.84rem;
        }
        .btn {
            padding: 8px 14px;
            font-size: 0.9rem;
        }
    }
</style>
