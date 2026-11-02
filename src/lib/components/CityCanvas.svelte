<script lang="ts">
    import { onMount } from "svelte";
    import { initCity } from "#lib/city.ts";
    import { hud } from "#lib/era.svelte.ts";

    let canvas: HTMLCanvasElement;

    // city.ts only touches the DOM inside initCity, so it is safe to import during SSR
    // and only start from onMount. The returned teardown stops the loop and listeners.
    onMount(() =>
        initCity(canvas, {
            main: document.querySelector("main"),
            onHud: (s) => Object.assign(hud, s),
        }),
    );
</script>

<canvas id="city" bind:this={canvas} aria-hidden="true"></canvas>
