<script>
    import { onMount } from "svelte";
    import { fade, fly } from "svelte/transition";

    let hats = ["AI Developer", "Quizbowl Player", "Pianist", "Gamer"];
    let currentHatIndex = 0;

    // visibility flags for sections/cards
    let showHome = true; // home is visible immediately
    let showAbout = false;
    let showProjects = false;
    let showContact = false;

    let projectVisible = [false, false, false];
    let projectExpanded = [false, false, false];

    function toggleProject(index) {
        projectExpanded[index] = !projectExpanded[index];
        projectExpanded = projectExpanded; // Trigger reactivity
    }

    // IntersectionObserver action
    function inview(node, { onEnter, once = true, threshold = 0.15 } = {}) {
        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        onEnter?.();
                        if (once) observer.unobserve(node);
                    }
                }
            },
            { threshold },
        );

        observer.observe(node);

        return {
            destroy() {
                observer.disconnect();
            },
        };
    }

    onMount(() => {
        const interval = setInterval(() => {
            currentHatIndex = (currentHatIndex + 1) % hats.length;
        }, 3000);

        return () => clearInterval(interval);
    });
</script>

<section id="home" class="banner py-5 text-center">
    {#if showHome}
        <div
            class="banner-content"
            in:fly={{ y: 20, opacity: 0, duration: 600 }}
        >
            <h1 class="display 2">Welcome! My name is</h1>
            <h1 class="display-2 fw-bold">Edward Lin</h1>

            <div
                style="position: relative; height: 60px; display: flex; align-items: center; justify-content: center;"
            >
                {#key currentHatIndex}
                    <p
                        class="fs-4 hat-text"
                        transition:fly={{ y: 20, duration: 300 }}
                        style="position: absolute; margin: 0;"
                    >
                        {hats[currentHatIndex]}
                    </p>
                {/key}
            </div>
        </div>
    {/if}
</section>

<div class="container my-5">
    <div
        use:inview={{
            onEnter: () => (showAbout = true),
            once: true,
            threshold: 0.2,
        }}
    >
        {#if showAbout}
            <section
                id="about"
                class="mb-5"
                style="border: 2px solid #0085dc; padding: 20px; border-radius: 8px;"
                in:fly={{ y: 24, opacity: 0, duration: 650 }}
            >
                <div class="d-flex align-items-center">
                    <img
                        src="/IMG20250517200848_01.jpg"
                        alt="Edward Lin"
                        class="me-3"
                        style="width: 20%; height: 20%; flex-shrink: 0; object-fit: cover; border-radius: 50%;"
                    />
                    <div style="padding-left: 2%;">
                        <h1 class="mb-3 sectionHeading">About</h1>
                        <p>
                            I am currently a senior at Mclean High School. My
                            main interests are in robotics, AI, and history. I'm
                            captain of one of my school's quizbowl teams.
                            Outside of school, I also captain the <a
                                href="https://pigeon-bots.netlify.app/"
                                >PigeonBots</a
                            >
                            FTC robotics team. In my free time, I enjoy playing piano,
                            building PCs, and spending time with friends and family.
                        </p>
                        <p>
                            Check out my
                            <a
                                href="https://drive.google.com/file/d/14QlLGwWFjMibgWFr4m3WRWh4du41W_Z_/view?usp=sharing"
                            >
                                resume.
                            </a>
                        </p>
                    </div>
                </div>
            </section>
        {/if}
    </div>
</div>
<div class="container my-5">
    <div
        use:inview={{
            onEnter: () => (showProjects = true),
            once: true,
            threshold: 0.15,
        }}
    >
        {#if showProjects}
            <section id="projects" class="mb-5" in:fade={{ duration: 500 }}>
                <h1
                    class="mb-3 sectionHeading text-center"
                    in:fly={{ y: 16, duration: 600 }}
                >
                    Projects
                </h1>

                <div class="projects-grid">
                    <!-- Card 1 -->
                    <div
                        class="project-card-wrapper"
                        use:inview={{
                            onEnter: () => (projectVisible[0] = true),
                            once: true,
                            threshold: 0.15,
                        }}
                    >
                        {#if projectVisible[0]}
                            <div
                                class="project-card"
                                in:fly={{
                                    y: 22,
                                    duration: 600,
                                    opacity: 0,
                                    delay: 0,
                                }}
                            >
                                <h3 class="mb-3">
                                    <a href="https://www.qbv-reader.com/">
                                        QBVReader
                                    </a>
                                </h3>
                                <p>
                                    QBVReader is a web-based tool designed to
                                    help quizbowl players practice, read, and
                                    analyze questions more effectively. It
                                    allows users to simulate real quizbowl
                                    reading conditions, track performance, and
                                    identify strengths and weaknesses across
                                    question categories. The platform is used by
                                    hundreds of players and teams to improve
                                    speed, accuracy, and overall gameplay.
                                </p>
                            </div>
                        {/if}
                    </div>

                    <!-- Card 2 -->
                    <div
                        class="project-card-wrapper"
                        use:inview={{
                            onEnter: () => (projectVisible[1] = true),
                            once: true,
                            threshold: 0.15,
                        }}
                    >
                        {#if projectVisible[1]}
                            <div
                                class="project-card"
                                in:fly={{
                                    y: 22,
                                    duration: 600,
                                    opacity: 0,
                                    delay: 80,
                                }}
                            >
                                <div class="project-header">
                                    <h3 class="mb-0">
                                        <a
                                            href="https://github.com/onetwothreefourfivesixe/PathwayPaver"
                                        >
                                            Pathway Paver
                                        </a>
                                    </h3>
                                    <!-- <i
                                        class="fas fa-chevron-down"
                                        style="transform: rotate({projectExpanded[1]
                                            ? 180
                                            : 0}deg); transition: transform 0.3s;"
                                    ></i> -->
                                </div>
                                <p class="mt-3">
                                    Pathway Paver is a grid-based puzzle game
                                    where players guide cars to their
                                    color-matched destinations by strategically
                                    placing road tiles. Each level introduces
                                    limited resources, turn constraints, and
                                    obstacles such as trees, requiring careful
                                    planning to avoid collisions and dead ends.
                                    The game was created for the 2025 McLean
                                    Hackathon, where it won first place.
                                </p>
                            </div>
                        {/if}
                    </div>

                    <!-- Card 3 -->
                    <!-- <div
                        class="project-card-wrapper"
                        use:inview={{
                            onEnter: () => (projectVisible[2] = true),
                            once: true,
                            threshold: 0.15,
                        }}
                    >
                        {#if projectVisible[2]}
                            <div
                                class="project-card"
                                in:fly={{
                                    y: 22,
                                    duration: 600,
                                    delay: 160,
                                    opacity: 0,
                                }}
                            >
                                <h3 class="mb-3">Chess AI Research</h3>
                                <p>
                                    This research project explored how
                                    artificial intelligence can model human
                                    decision-making rather than simply
                                    optimizing for perfect play. The focus was
                                    on aggressive chess playstyles, which are
                                    difficult to replicate using traditional AI
                                    approaches that prioritize accuracy alone.
                                    Two custom neural networks were developed:
                                    one to evaluate board aggression and another
                                    to assess move quality using features such
                                    as king safety, mobility, and pawn
                                    structure. While the models were able to
                                    identify aggressive moves, they sometimes
                                    sacrificed strategic soundness, highlighting
                                    the challenge of balancing human-like
                                    behavior with optimal decision-making. The
                                    project demonstrates how AI can be used to
                                    study human behavior and create more
                                    realistic training opponents.
                                </p>
                            </div>
                        {/if}
                    </div> -->
                </div>
            </section>
        {/if}
    </div>
</div>
<div class="container my-5">
    <div
        use:inview={{
            onEnter: () => (showContact = true),
            once: true,
            threshold: 0.15,
        }}
    >
        {#if showContact}
            <section id="contact" class="mb-5" in:fade={{ duration: 500 }}>
                <h1
                    class="mb-3 sectionHeading text-center"
                    in:fly={{ y: 16, opacity: 0, duration: 600 }}
                >
                    Contact
                </h1>

                <div
                    class="text-center"
                    in:fly={{ y: 18, duration: 600, opacity: 0, delay: 120 }}
                >
                    <a
                        href="https://www.linkedin.com/in/eddie-lin-1363a5318/"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="social-icon"
                        aria-label="LinkedIn"
                    >
                        <i class="fab fa-linkedin"></i>
                    </a>
                    <a
                        href="https://github.com/onetwothreefourfivesixe"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="social-icon"
                        aria-label="GitHub"
                    >
                        <i class="fab fa-github"></i>
                    </a>
                    <a
                        href="mailto:edwardxuming.lin@gmail.com"
                        class="social-icon"
                        aria-label="Email"
                    >
                        <i class="fas fa-envelope"></i>
                    </a>
                </div>
            </section>
        {/if}
    </div>
</div>

<style>
    .banner {
        width: 100%;
        background-color: #002944;
        margin: 0 calc(-50vw + 50%);
        padding-top: 120px !important;
        padding-bottom: 120px !important;
    }

    .hat-text {
        transition: all 0.3s ease-in-out;
    }

    .hat-text.animating {
        opacity: 0;
        transform: translateY(-20px);
    }

    .project-card {
        border: 2px solid #0085dc;
        padding: 20px;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
    }

    .projects-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 20px;
        margin-bottom: 40px;
    }

    .project-card-wrapper {
        display: flex;
        flex-direction: column;
    }

    .project-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: pointer;
        user-select: none;
    }

    .project-header h3 {
        margin: 0;
        flex-grow: 1;
    }

    .project-header i {
        margin-left: 10px;
        color: #4a9eff;
        font-size: 14px;
    }

    .project-card h3 {
        color: #4a9eff;
    }

    .project-card a {
        color: #4a9eff;
        text-decoration: none;
    }

    .project-card a:hover {
        color: #7bc8ff;
        text-decoration: underline;
    }

    .social-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 20%;
        height: 20%;
        margin: 0 10px;
        font-size: 600%;
        color: #4a9eff;
        text-decoration: none;
        transition: all 0.3s ease-in-out;
    }

    .social-icon:hover {
        color: #7bc8ff;
        transform: scale(1.1);
    }
    @media (prefers-reduced-motion: reduce) {
        .hat-text,
        .social-icon {
            transition: none !important;
        }
    }
</style>
