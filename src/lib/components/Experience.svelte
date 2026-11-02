<script lang="ts">
    import { jobs } from "#lib/content.ts";
</script>

<section id="experience" data-era="industrial">
    <div class="panel works">
        <div class="hazard" aria-hidden="true"></div>
        <p class="plate-label">The Works · Est. 1888 · Shift log</p>
        <h2>Experience</h2>
        <p class="intro-note">
            Where the heavy lifting happens. Three shifts are on the clock right
            now: cuneiform OCR research at TokenWorks and clinic software for
            Holistic Acupuncture.
        </p>
        <div class="jobs">
            {#each jobs as job (job.shift)}
                <article class="job">
                    <div class="job-years">
                        {job.years}<small>{job.shift}</small>
                    </div>
                    <div>
                        <h3>{job.title}</h3>
                        <p class="job-org">{job.org}</p>
                        <ul>
                            {#each job.points as point}
                                <li>{point}</li>
                            {/each}
                        </ul>
                    </div>
                </article>
            {/each}
        </div>
        <a class="cue" href="#projects">Further back to 1347 ↓</a>
    </div>
</section>

<style>
    /* The Works: riveted boiler plate */
    .works {
        max-width: 1100px;
        color: var(--soot-ink);
        font-family: var(--f-works);
        border: 2px solid var(--plate-dark);
        padding: clamp(24px, 5vw, 52px);
        background: radial-gradient(
                circle at 16px 16px,
                #8d7c69 0 3px,
                transparent 4px
            ),
            radial-gradient(
                circle at calc(100% - 16px) 16px,
                #8d7c69 0 3px,
                transparent 4px
            ),
            radial-gradient(
                circle at 16px calc(100% - 16px),
                #8d7c69 0 3px,
                transparent 4px
            ),
            radial-gradient(
                circle at calc(100% - 16px) calc(100% - 16px),
                #8d7c69 0 3px,
                transparent 4px
            ),
            linear-gradient(170deg, #332a24, #221b17 60%, #2a211c);
        box-shadow:
            inset 0 0 0 6px #3a3029,
            0 30px 60px -30px #000;
    }
    .hazard {
        height: 10px;
        background: repeating-linear-gradient(
            -45deg,
            var(--brass) 0 12px,
            var(--plate) 12px 24px
        );
        margin-bottom: 22px;
    }
    .plate-label {
        font-family: var(--f-mono);
        font-size: 0.76rem;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: var(--brass);
    }
    h2 {
        font-family: var(--f-stencil);
        font-weight: 400;
        font-size: clamp(3rem, 11vw, 7.2rem);
        line-height: 0.9;
        color: var(--brass);
        margin-top: 10px;
        letter-spacing: 0.01em;
    }
    .intro-note {
        font-size: 1.12rem;
        line-height: 1.5;
        color: #d9ccb6;
    }
    .jobs {
        margin-top: 30px;
        display: grid;
    }
    .job {
        display: grid;
        grid-template-columns: 170px minmax(0, 1fr);
        gap: 8px 28px;
        padding-block: 22px;
        border-top: 1px dashed rgba(227, 161, 74, 0.4);
    }
    .job-years {
        font-family: var(--f-stencil);
        font-size: 1.45rem;
        color: var(--brass);
        line-height: 1.1;
        font-variant-numeric: tabular-nums;
    }
    .job-years small {
        display: block;
        font-family: var(--f-mono);
        font-size: 0.72rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: #b9a68b;
        margin-top: 6px;
    }
    .job h3 {
        font-family: var(--f-works);
        font-weight: 600;
        font-size: 1.5rem;
        letter-spacing: 0.01em;
    }
    .job-org {
        font-family: var(--f-mono);
        font-size: 0.82rem;
        color: var(--rust);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin-top: 4px;
        filter: brightness(1.5);
    }
    .job ul {
        margin: 12px 0 0;
        padding-left: 1.1em;
        display: grid;
        gap: 6px;
        font-size: 1.08rem;
        line-height: 1.45;
    }
    .job li::marker {
        color: var(--brass);
    }
    .cue {
        color: var(--brass);
        font-family: var(--f-mono);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        font-size: 0.92rem;
    }
    @media (max-width: 640px) {
        .job {
            grid-template-columns: 1fr;
        }
    }
</style>
