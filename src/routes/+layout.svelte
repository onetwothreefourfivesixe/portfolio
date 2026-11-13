<script lang="ts">
    import "../app.css";
    import { page } from "$app/state";
    import type { Snippet } from "svelte";
    let { children }: { children: Snippet } = $props();

    const title = "Edward Lin — A City Through Time";
    const description =
        "Edward Lin's single-page portfolio: one riverside town that travels from 432 BC to AD 2150 as you scroll.";
    const image = `${page.url.origin}/og.png`;
</script>

<svelte:head>
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={page.url.origin + "/"} />
    <!-- Link previews (Open Graph + Twitter card) -->
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Edward Lin" />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:url" content={page.url.origin + "/"} />
    <meta property="og:image" content={image} />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="Edward Lin's portfolio: a skyline at dusk with an airliner passing overhead." />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={title} />
    <meta name="twitter:description" content={description} />
    <meta name="twitter:image" content={image} />
    <meta name="theme-color" content="#1c2654" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
    <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,300..900&family=Saira+Stencil+One&family=Saira+Condensed:wght@400;600&family=IBM+Plex+Mono:wght@400;500&family=Grenze+Gotisch:wght@500;700&family=EB+Garamond:ital,wght@0,400;0,600;1,400&family=Cinzel:wght@400;600;700&family=Michroma&family=Chakra+Petch:wght@400;600&display=swap"
    />
    <!-- Only the three Chinese characters on the Skyport card (天港 and the 林 seal), so the download stays tiny -->
    <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@500&family=Noto+Serif+SC:wght@900&text=%E5%A4%A9%E6%B8%AF%E6%9E%97&display=swap"
    />
</svelte:head>

{@render children()}
