<script lang="ts">
    import { onMount } from "svelte";
    import MetroPortfolio from "#lib/metro/MetroPortfolio.svelte";
    import { STATIONS, type StationId } from "#lib/metro/stations.ts";

    // The open station lives in the URL hash (/#p3), so stations can be linked and Back works.
    const fromHash = (): StationId => {
        const id = decodeURIComponent(location.hash.slice(1)); // client only: onMount and popstate
        return id in STATIONS ? id : "hub";
    };

    // Server render and hydration start at Central; a hash in the URL is applied after mount.
    let key = $state(0);
    let initial = $state<StationId>("hub");
    onMount(() => {
        const id = fromHash();
        if (id !== "hub") {
            initial = id;
            key++;
        }
    });

    function onchange(id: StationId) {
        const hash = id === "hub" ? "" : `#${id}`;
        if (location.hash !== hash) history.pushState(null, "", hash || location.pathname);
    }

    // Back / forward: reopen at the station in the URL.
    function onpopstate() {
        initial = fromHash();
        key++;
    }
</script>

<svelte:window {onpopstate} />

{#key key}
    <MetroPortfolio {initial} {onchange} />
{/key}
