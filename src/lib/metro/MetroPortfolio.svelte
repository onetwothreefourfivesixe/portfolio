<script lang="ts">
	import './tokens.css';
	import { onDestroy, untrack } from 'svelte';
	import { HUB, LINES, LINE_ORDER, STATION_IDS, STATIONS, TOUR, type StationId } from './stations';
	import { CENTER, ZOOM, buildRoute, easeInOut, poseAt, tripDuration, type Route } from './geometry';
	import MetroMap from './MetroMap.svelte';
	import StationPanel from './StationPanel.svelte';
	import LineList from './LineList.svelte';

	interface Props {
		showTrains?: boolean; // ambient trains looping on each line
		showLabels?: boolean; // station names on the map
		initial?: StationId; // e.g. read from the URL hash
		onchange?: (id: StationId) => void; // e.g. write the URL hash
	}
	let { showTrains = true, showLabels = true, initial = 'hub', onchange }: Props = $props();

	type Cam = { x: number; y: number; z: number };
	type Trip = { route: Route; start: number; dur: number; t: number };

	let sel = $state<StationId>(untrack(() => initial));
	let full = $state(false);
	let view = $state<'map' | 'list'>('map');
	let visited = $state<Record<StationId, boolean>>({});
	let tour = $state(-1);
	// Raw state: replaced each frame rather than deeply tracked.
	let trip = $state.raw<Trip | null>(null);
	let cam = $state.raw<Cam>(untrack(() => targetFor(initial, false, null)));

	const pose = $derived(trip ? poseAt(trip.route, trip.t) : null);
	const isHub = $derived(sel === 'hub');
	const totalStops = STATION_IDS.length;
	const seen = $derived(Object.keys(visited).length);

	function targetFor(id: StationId, isFull: boolean, p: { x: number; y: number } | null): Cam {
		if (isFull) return { ...CENTER, z: 1 };
		if (p) return { x: p.x, y: p.y, z: ZOOM };
		if (id === 'hub') return { ...CENTER, z: 1 };
		return { x: STATIONS[id].x, y: STATIONS[id].y, z: ZOOM };
	}

	const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
	const camOff = (a: Cam, b: Cam) => Math.max(Math.abs(a.x - b.x) / 400, Math.abs(a.y - b.y) / 400, Math.abs(a.z - b.z));

	// ---- One loop drives trip + camera ---------------------------------------
	let raf = 0;
	let last = 0;

	function tick(now: number) {
		const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
		last = now;
		let tr = trip;
		if (tr) {
			const t = Math.min(1, (now - tr.start) / tr.dur);
			tr = t >= 1 ? null : { ...tr, t: easeInOut(t) };
			trip = tr;
		}
		const tgt = targetFor(sel, full, tr ? poseAt(tr.route, tr.t) : null);
		const k = reducedMotion() ? 1 : 1 - Math.exp(-dt / 0.15); // 0.15 s time constant
		let next = { x: cam.x + (tgt.x - cam.x) * k, y: cam.y + (tgt.y - cam.y) * k, z: cam.z + (tgt.z - cam.z) * k };
		if (!tr && camOff(next, tgt) < 0.001) {
			next = tgt;
			raf = 0;
		} else {
			raf = requestAnimationFrame(tick);
		}
		cam = next;
	}

	function kick() {
		if (raf || typeof requestAnimationFrame === 'undefined') return;
		last = performance.now();
		raf = requestAnimationFrame(tick);
	}

	// Restart the loop whenever the camera target changes.
	$effect(() => {
		void sel;
		void full;
		untrack(kick);
	});
	onDestroy(() => {
		if (raf && typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(raf);
	});

	// ---- Navigation ----------------------------------------------------------
	function visit(id: StationId, opts: { tour?: number; view?: 'map' | 'list' } = {}) {
		const from = sel;
		sel = id;
		full = false;
		tour = opts.tour ?? -1;
		if (opts.view) view = opts.view;
		if (id !== 'hub' && !visited[id]) visited = { ...visited, [id]: true };
		const route = reducedMotion() ? null : buildRoute(from, id);
		trip = route ? { route, start: performance.now(), dur: tripDuration(route), t: 0 } : null;
		kick();
		onchange?.(id);
	}

	const startTour = () => visit(TOUR[0], { tour: 0, view: 'map' });
	const tourNext = () => (tour >= TOUR.length - 1 ? visit('hub') : visit(TOUR[tour + 1], { tour: tour + 1 }));
	const firstStop = (id: (typeof LINE_ORDER)[number]) => LINES[id].order.find((s) => s !== 'hub')!;
	const activeLine = $derived(isHub ? null : STATIONS[sel].line);
</script>

<div class="metro" class:station={!isHub}>
	<header class="top">
		<button class="brand" onclick={() => visit('hub')}>
			<svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true">
				<circle cx="18" cy="18" r="15" fill="#FFFFFF" />
				<path d="M6 24 L14 16 H30" stroke="#BF0D3E" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round" />
				<circle cx="14" cy="16" r="4" fill="#1D1B19" />
			</svg>
			<span class="brand-text">
				<span class="brand-name">{HUB.name}</span>
				<span class="brand-sub">Portfolio Transit System</span>
			</span>
		</button>
		<nav aria-label="Lines">
			{#each LINE_ORDER as id (id)}
				{@const l = LINES[id]}
				<button class="nav" class:active={activeLine === id} aria-label={`${l.section} line`} onclick={() => visit(firstStop(id))}>
					<span class="badge" style:background={l.color} style:color={l.text}>{l.code}</span>
					<span class="nav-text">{l.section}</span>
				</button>
			{/each}
		</nav>
	</header>
	<div class="bands" aria-hidden="true">
		{#each LINE_ORDER as id (id)}<span style:background={LINES[id].color}></span>{/each}
	</div>

	<main>
		<section class="map-col" aria-label="System map">
			<div class="sheet">
				<div class="sheet-head">
					<div class="sheet-title">
						<h2>System Map</h2>
						<div class="progress">
							<span class="bar" aria-hidden="true"><span style:width={`${Math.round((seen / totalStops) * 100)}%`}></span></span>
							<span>{seen} of {totalStops} stations visited</span>
						</div>
					</div>
					<div class="toggle" role="group" aria-label="View">
						<button class:on={view === 'map'} aria-pressed={view === 'map'} onclick={() => (view = 'map')}>Map</button>
						<button class:on={view === 'list'} aria-pressed={view === 'list'} onclick={() => (view = 'list')}>List</button>
					</div>
				</div>

				{#if view === 'list'}
					<LineList {sel} {visited} onselect={(id) => visit(id)} />
				{:else}
					<div class="map-pad">
						<MetroMap {sel} {cam} {pose} {full} {showTrains} {showLabels} onselect={(id) => visit(id)} ontogglezoom={() => (full = !full)} />
					</div>
					<div class="legend">
						<span class="kicker">Legend</span>
						<span class="key"><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10.5" fill="#fff" stroke="#1D1D1B" stroke-width="2.5" /><path d="M4 4h16v16H4z" transform="translate(6.5 6.5) scale(0.46)" fill="#1D1D1B" /></svg>Role</span>
						<span class="key"><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10.5" fill="#fff" stroke="#1D1D1B" stroke-width="2.5" /><path d="M12 3.5L21 19.5H3z" transform="translate(6.5 6.5) scale(0.46)" fill="#1D1D1B" /></svg>Project</span>
						<span class="key"><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10.5" fill="#fff" stroke="#1D1D1B" stroke-width="2.5" /><path d="M12 3.5a8.5 8.5 0 1 1 0 17a8.5 8.5 0 1 1 0-17z" transform="translate(6.5 6.5) scale(0.46)" fill="#1D1D1B" /></svg>Contact</span>
						<span class="key"><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10.5" fill="#fff" stroke="#1D1D1B" stroke-width="2.5" /><path d="M12 2.8l2.6 6.2 6.6.3-5.2 4.1 1.8 6.4L12 16.1l-5.8 3.7 1.8-6.4-5.2-4.1 6.6-.3z" transform="translate(6.5 6.5) scale(0.46)" fill="#1D1D1B" /></svg>Personal</span>
						<span class="key"><svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10.5" fill="#fff" stroke="#1D1D1B" stroke-width="2.5" /><circle cx="12" cy="12" r="5.5" fill="#fff" stroke="#1D1D1B" stroke-width="2.5" /></svg>Transfer station</span>
						<span class="key"><span class="badge end" style:background="#BF0D3E" style:color="#fff">EX</span>End of line</span>
					</div>
				{/if}
			</div>
		</section>

		<div class="panel-col">
			<StationPanel
				{sel}
				{visited}
				{tour}
				onselect={(id) => visit(id)}
				onstarttour={startTour}
				ontournext={tourNext}
				ontourend={() => (tour = -1)}
			/>
		</div>
	</main>

	<footer>
		<span>All lines running · Service to every station</span>
		<span>© {new Date().getFullYear()} {HUB.name}</span>
	</footer>
</div>

<style>
	.metro {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	/* Header: WMATA pylon bronze + line badges as navigation */
	.top {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 12px 24px;
		padding: 12px 24px;
		background: var(--metro-bronze);
		color: #fff;
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 0;
		border: 0;
		background: none;
		color: #fff;
		text-align: left;
		cursor: pointer;
	}
	.brand-text {
		display: flex;
		flex-direction: column;
		line-height: 1.15;
	}
	.brand-name {
		font-size: 18px;
		font-weight: 800;
		letter-spacing: -0.01em;
	}
	.brand-sub {
		font-size: 11px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: #cfc8be;
	}
	nav {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.nav {
		display: flex;
		align-items: center;
		gap: 8px;
		min-height: 44px;
		padding: 4px 12px 4px 4px;
		border: 2px solid transparent;
		border-radius: 999px;
		background: transparent;
		color: #fff;
		cursor: pointer;
	}
	.nav:hover {
		background: rgba(255, 255, 255, 0.1);
	}
	.nav.active {
		border-color: #fff;
	}
	.nav .badge {
		width: 34px;
		height: 34px;
		font-size: 13px;
	}
	.nav-text {
		font-size: 14px;
		font-weight: 600;
	}
	.bands {
		display: flex;
		height: 6px;
	}
	.bands span {
		flex: 1;
	}

	/* Two layouts: map-first on Central, content-first on a station */
	main {
		flex: 1;
		width: 100%;
		max-width: 1440px;
		margin: 0 auto;
		padding: 24px;
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		gap: 24px;
	}
	.map-col,
	.panel-col {
		min-width: 0;
		transition:
			flex 0.6s var(--metro-ease),
			max-width 0.6s var(--metro-ease);
	}
	.map-col {
		flex: 3 1 560px;
		max-width: 2000px;
	}
	.panel-col {
		flex: 1 1 340px;
		max-width: 460px;
	}
	.station .map-col {
		flex: 1 1 380px;
		max-width: 540px;
	}
	.station .panel-col {
		flex: 2.4 1 560px;
		max-width: 2000px;
	}
	@media (min-width: 1000px) {
		.map-col {
			position: sticky;
			top: 16px;
		}
	}

	/* Map sheet */
	.sheet {
		overflow: hidden;
		border: 1px solid #d9d6cf;
		border-radius: 6px;
		background: var(--metro-paper);
	}
	.sheet-head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 12px 16px;
		padding: 14px 20px;
		border-bottom: 1px solid #e6e3dc;
	}
	.sheet-title {
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-width: 0;
	}
	h2 {
		margin: 0;
		font-size: 22px;
		font-weight: 800;
		letter-spacing: -0.01em;
	}
	.progress {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 12px;
		font-weight: 600;
		color: var(--metro-muted);
	}
	.bar {
		display: block;
		width: 120px;
		height: 6px;
		overflow: hidden;
		border-radius: 3px;
		background: #e6e3dc;
	}
	.bar span {
		display: block;
		height: 100%;
		background: var(--metro-ink);
		transition: width 0.4s ease;
	}
	.toggle {
		display: flex;
		gap: 3px;
		padding: 3px;
		border-radius: 6px;
		background: var(--metro-ground);
	}
	.toggle button {
		min-height: 40px;
		padding: 0 14px;
		border: 0;
		border-radius: 4px;
		background: transparent;
		color: var(--metro-muted);
		font-size: 13px;
		font-weight: 700;
		cursor: pointer;
	}
	.toggle button.on {
		background: #fff;
		color: var(--metro-ink);
	}
	.map-pad {
		padding: 12px clamp(8px, 2vw, 24px) 16px;
	}
	.legend {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px 20px;
		padding: 12px 20px;
		border-top: 1px solid #e6e3dc;
		background: #fafaf8;
		font-size: 13px;
		color: #3f3b36;
	}
	.key {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.badge.end {
		width: 22px;
		height: 22px;
		font-size: 9px;
	}

	footer {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 8px 24px;
		padding: 16px 24px;
		border-top: 1px solid #ddd7cc;
		font-size: 13px;
		color: #4a4640;
	}

	@media (max-width: 700px) {
		.nav-text {
			display: none;
		}
	}
</style>
