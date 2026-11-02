<script lang="ts">
    import "../app.css";
    import type { Snippet } from "svelte";
    let { children }: { children: Snippet } = $props();
</script>

<svelte:head>
    <title>Edward Lin — A City Through Time</title>
    <meta
        name="description"
        content="Edward Lin's single-page portfolio: one riverside town that grows from 1347 to 2150 as you scroll."
    />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
    <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,300..900&family=Saira+Stencil+One&family=Saira+Condensed:wght@400;600&family=IBM+Plex+Mono:wght@400;500&family=Grenze+Gotisch:wght@500;700&family=EB+Garamond:ital,wght@0,400;0,600;1,400&family=Michroma&family=Chakra+Petch:wght@400;600&display=swap"
    />
</svelte:head>

{@render children()}
