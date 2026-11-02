<script lang="ts">
    import CityCanvas from "#lib/components/CityCanvas.svelte";
    import Hud from "#lib/components/Hud.svelte";
    import Intro from "#lib/components/Intro.svelte";
    import Experience from "#lib/components/Experience.svelte";
    import Projects from "#lib/components/Projects.svelte";
    import Contact from "#lib/components/Contact.svelte";

    const year = new Date().getFullYear();
</script>

<CityCanvas />
<Hud />

<main>
    <Intro />
    <Experience />
    <Projects />
    <Contact />
</main>

<footer>© {year} Edward Lin · A town built over 803 years</footer>
