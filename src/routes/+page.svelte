<script lang="ts">
    import CityCanvas from "#lib/components/CityCanvas.svelte";
    import Hud from "#lib/components/Hud.svelte";
    import Intro from "#lib/components/Intro.svelte";
    import Experience from "#lib/components/Experience.svelte";
    import Projects from "#lib/components/Projects.svelte";
    import Hobbies from "#lib/components/Hobbies.svelte";
    import Contact from "#lib/components/Contact.svelte";
    import SceneryToggle from "#lib/components/SceneryToggle.svelte";
    import Lightbox from "#lib/components/Lightbox.svelte";

    const year = new Date().getFullYear();
</script>

<CityCanvas />
<Hud />
<SceneryToggle />
<Lightbox />

<main>
    <Intro />
    <Experience />
    <Projects />
    <Hobbies />
    <Contact />
</main>

<footer>© {year} Edward Lin · A town built over 2,581 years</footer>
