<script>
    import { onMount } from "svelte";

    let hats = ["AI Developer", "Quizbowl Player", "Pianist", "Gamer"];
    let currentHatIndex = 0;
    let isAnimating = false;

    onMount(() => {
        const interval = setInterval(() => {
            isAnimating = true;
            setTimeout(() => {
                currentHatIndex = (currentHatIndex + 1) % hats.length;
                isAnimating = false;
            }, 300);
        }, 3000);

        return () => clearInterval(interval);
    });
</script>

<section id="home" class="banner py-5 text-center">
    <div class="banner-content">
        <h1 class="display 2">Welcome! My name is</h1>
        <h1 class="display-2 fw-bold">Edward Lin</h1>
        <p class="fs-4 hat-text" class:animating={isAnimating}>
            {hats[currentHatIndex]}
        </p>
    </div>
</section>

<div class="container my-5">
    <section id="about" class="mb-5">
        <h1 class="mb-3">About</h1>
        <div class="d-flex align-items-center">
            <img
                src="/IMG20250517200848_01.jpg"
                alt="Edward Lin"
                class="me-3"
                style="width: 20%; height: 20%; flex-shrink: 0; object-fit: cover; border-radius: 50%;"
            />
            <p>
                I am currently a senior at Mclean High School. My main interests
                are in robotics, AI, and history. I'm captain of one of my
                school's quizbowl teams. Outside of school, I also captain the <a
                    href="https://pigeon-bots.netlify.app/"
                    >PigeonBots
                </a> FTC robotics team. In my free time, I enjoy playing piano, building
                PCs, and spending time with friends and family.
            </p>
        </div>
    </section>
</div>
<div class="container my-5">
    <section id="projects" class="mb-5">
        <h1 class="mb-3">Projects</h1>
        <p>Projects content</p>
    </section>
</div>
<div class="container my-5">
    <section id="contact" class="mb-5">
        <h1 class="mb-3">Contact</h1>
        <p>Contact content</p>
    </section>
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
</style>
