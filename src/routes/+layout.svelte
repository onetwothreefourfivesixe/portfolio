<script lang="ts">
    import "../app.css";
    import { page } from "$app/state";
    import type { Snippet } from "svelte";
    let { children }: { children: Snippet } = $props();

    const title = "Edward Lin — Portfolio";
    const description =
        "Edward Lin's portfolio as a transit map: ride the Experience, Projects, Contact and Hobbies & Clubs lines from Central.";
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
    <meta name="theme-color" content="#3b2f27" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
    <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Doto:wght@700;900&display=swap"
    />
</svelte:head>

{@render children()}
