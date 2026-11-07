<script lang="ts">
	import { HUB, LINES, LINE_ORDER, STATION_IDS, STATIONS, nameOf, type LineId, type StationId } from './stations';
	import { LINE_PATHS, TERMINI, VIEW, VIEWBOX, WATER_PATH, pct, type Pose } from './geometry';
	import StationIcon from './StationIcon.svelte';

	interface Props {
		sel: StationId;
		cam: { x: number; y: number; z: number };
		pose: Pose | null;
		full: boolean;
		showTrains?: boolean;
		showLabels?: boolean;
		onselect: (id: StationId) => void;
		ontogglezoom: () => void;
	}
	let { sel, cam, pose, full, showTrains = true, showLabels = true, onselect, ontogglezoom }: Props = $props();

	const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

	// Camera: translate so the target sits in the middle, never past the map edge.
	const zoomTf = $derived.by(() => {
		const z = cam.z;
		const fx = (cam.x - VIEW.x) / VIEW.w, fy = (cam.y - VIEW.y) / VIEW.h;
		const tx = clamp(0.5 - z * fx, 1 - z, 0) * 100;
		const ty = clamp(0.5 - z * fy, 1 - z, 0) * 100;
		return `translate(${tx.toFixed(3)}%, ${ty.toFixed(3)}%) scale(${z.toFixed(4)})`;
	});

	// Icons counter-scale partly, so they grow ~z^0.45 while the map grows z.
	const zd = $derived(Math.pow(cam.z, 0.55));
	const off = $derived((12 / zd).toFixed(2) + 'px');
	const labelTf = (side: string) =>
		({
			r: `translate(${off}, -50%)`,
			l: `translate(calc(-100% - ${off}), -50%)`,
			t: `translate(-50%, calc(-100% - ${off}))`,
			b: `translate(-50%, ${off})`
		})[side];

	// Later lines draw over earlier ones; the white casing leaves a gap at crossings.
	const DRAW_ORDER: LineId[] = ['yellow', 'green', 'red', 'blue'];
	const hubPos = pct(HUB.x, HUB.y);
	const trainCars = LINE_ORDER.map((id) => ({
		id,
		color: id === 'yellow' ? '#E0B800' : LINES[id].color,
		dur: { red: '20s', blue: '24s', green: '22s', yellow: '18s' }[id],
		loop: !!LINES[id].loop
	}));
</script>

<div class="viewport" style:--zd={zd}>
	<div class="layer" style:transform={zoomTf}>
		<svg class="map-svg" viewBox={VIEWBOX} aria-hidden="true">
			<path d={WATER_PATH} stroke="var(--metro-water)" stroke-width="96" fill="none" stroke-linejoin="round" />

			<g fill="none" stroke-linejoin="round">
				{#each DRAW_ORDER as id (id)}
					<path d={LINE_PATHS[id]} stroke="#FFFFFF" stroke-width="22" />
					<path d={LINE_PATHS[id]} stroke={LINES[id].color} stroke-width="13" />
				{/each}
			</g>

			{#if showTrains}
				<g>
					{#each trainCars as t (t.id)}
						<g>
							<rect x="-17" y="-6" width="34" height="12" rx="2" fill="#E8E6E1" stroke="#1D1D1B" stroke-width="2" />
							<rect x="-15" y="-1.5" width="30" height="3" fill={t.color} />
							{#if t.loop}
								<animateMotion dur={t.dur} repeatCount="indefinite" rotate="auto" path={LINE_PATHS[t.id]} />
							{:else}
								<animateMotion dur={t.dur} repeatCount="indefinite" rotate="auto" keyPoints="0;1;0" keyTimes="0;0.5;1" calcMode="linear" path={LINE_PATHS[t.id]} />
							{/if}
						</g>
					{/each}
				</g>
			{/if}

			{#if pose}
				<g transform={`translate(${pose.x.toFixed(1)} ${pose.y.toFixed(1)}) rotate(${pose.ang.toFixed(1)})`}>
					<rect x="-24" y="-10" width="48" height="20" rx="5" fill="#FFFFFF" stroke="#1D1D1B" stroke-width="2.5" />
					<rect x="-21" y="-3.5" width="38" height="7" fill={pose.c} />
					<path d="M16 -7.5 H19 Q22 -7.5 22 -4.5 V4.5 Q22 7.5 19 7.5 H16 Z" fill="#1D1D1B" />
					<circle cx="-14" cy="0" r="1.6" fill="#FFFFFF" />
					<circle cx="-4" cy="0" r="1.6" fill="#FFFFFF" />
					<circle cx="6" cy="0" r="1.6" fill="#FFFFFF" />
				</g>
			{/if}

			<g font-family="Inter, Helvetica, Arial, sans-serif" font-weight="800" font-size="15" text-anchor="middle">
				{#each TERMINI as b, i (i)}
					<circle cx={b.x} cy={b.y} r="21" fill={LINES[b.line].color} stroke="#FFFFFF" stroke-width="4" />
					<text x={b.x} y={b.y + 5} fill={LINES[b.line].text}>{LINES[b.line].code}</text>
				{/each}
			</g>
			<text x="1110" y="905" fill="var(--metro-water-text)" font-size="17" font-style="italic" font-weight="600" letter-spacing="3" font-family="Inter, Helvetica, Arial, sans-serif">The Bay</text>
		</svg>

		{#each STATION_IDS as id (id)}
			{@const s = STATIONS[id]}
			{@const ln = LINES[s.line]}
			{@const on = id === sel}
			{@const p = pct(s.x, s.y)}
			<button
				class="stn"
				style:left={p.left}
				style:top={p.top}
				aria-label={`${s.name} — ${ln.section}`}
				title={`${s.name} · ${s.meta}`}
				onclick={() => onselect(id)}
			>
				{#if on}<span class="ring" style:border-color={ln.color}></span>{/if}
				<StationIcon shape={s.shape} fill={on ? ln.color : '#FFFFFF'} glyph={on ? ln.text : '#1D1D1B'} />
				{#if showLabels}
					<span class="lbl" class:on style:transform={labelTf(s.side)}>{s.name}</span>
				{/if}
			</button>
		{/each}

		<button class="hub" style:left={hubPos.left} style:top={hubPos.top} aria-label="Central — Intro" onclick={() => onselect('hub')}>
			{#if sel === 'hub'}<span class="ring hub-ring"></span>{/if}
			<span class="hub-inner" class:on={sel === 'hub'}></span>
			<span class="lbl hub-lbl">Central</span>
		</button>
	</div>

	{#if pose}
		<div class="arriving" role="status">
			<span class="dot" style:background={pose.c}></span>Now arriving · {nameOf(sel)}
		</div>
	{/if}

	{#if sel !== 'hub'}
		<button class="zoom-btn" onclick={ontogglezoom}>
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4M8 11h6" /></svg>
			{full ? 'Zoom to station' : 'Full map'}
		</button>
	{/if}
</div>

<style>
	.viewport {
		position: relative;
		width: 100%;
		aspect-ratio: 1200 / 940;
		overflow: hidden;
		border-radius: 4px;
		container-type: inline-size;
	}
	.layer {
		position: absolute;
		inset: 0;
		transform-origin: 0 0;
	}
	.map-svg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		overflow: visible;
	}

	.stn,
	.hub {
		position: absolute;
		transform: translate(-50%, -50%);
		padding: 0;
		border: 0;
		background: transparent;
		cursor: pointer;
		transition: scale 0.15s ease;
	}
	.stn:hover,
	.hub:hover {
		scale: 1.18;
	}
	.stn {
		width: calc(clamp(14px, 2.4cqw, 32px) / var(--zd));
		height: calc(clamp(14px, 2.4cqw, 32px) / var(--zd));
		z-index: 2;
	}
	.hub {
		width: calc(clamp(28px, 4.8cqw, 64px) / var(--zd));
		height: calc(clamp(28px, 4.8cqw, 64px) / var(--zd));
		border: 3px solid var(--metro-ink);
		border-radius: 50%;
		background: #fff;
		z-index: 3;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.hub-inner {
		width: 62%;
		height: 62%;
		border-radius: 50%;
		border: 3px solid var(--metro-ink);
		background: #fff;
	}
	.hub-inner.on {
		background: var(--metro-ink);
	}

	.ring {
		position: absolute;
		inset: -6px;
		border-radius: 50%;
		border: 3px solid;
		pointer-events: none;
		animation: pulse 1.6s ease-out infinite;
	}
	.hub-ring {
		inset: -8px;
		border-color: var(--metro-ink);
	}
	@keyframes pulse {
		from { transform: scale(1); opacity: 0.9; }
		to { transform: scale(1.9); opacity: 0; }
	}

	.lbl {
		position: absolute;
		left: 50%;
		top: 50%;
		white-space: nowrap;
		font-size: calc(clamp(9px, 1.15cqw, 15px) / var(--zd));
		font-weight: 500;
		color: var(--metro-ink);
		text-shadow: 0 0 3px #fff, 0 0 3px #fff, 0 0 3px #fff, 0 0 3px #fff;
		pointer-events: none;
	}
	.lbl.on {
		font-weight: 700;
	}
	.hub-lbl {
		left: 100%;
		top: 100%;
		margin: 2px 0 0 4px;
		font-size: calc(clamp(10px, 1.25cqw, 16px) / var(--zd));
		font-weight: 800;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.arriving {
		position: absolute;
		right: 12px;
		top: 12px;
		z-index: 5;
		display: flex;
		align-items: center;
		gap: 10px;
		max-width: 70%;
		padding: 8px 14px;
		border-radius: 4px;
		border: 3px solid var(--metro-sign);
		background: var(--metro-led-bg);
		color: var(--metro-led);
		font-family: var(--metro-led-font);
		font-weight: 900;
		font-size: 16px;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.dot {
		flex: none;
		width: 10px;
		height: 10px;
		border-radius: 50%;
	}

	.zoom-btn {
		position: absolute;
		left: 12px;
		top: 12px;
		z-index: 5;
		display: flex;
		align-items: center;
		gap: 8px;
		min-height: 44px;
		padding: 0 14px;
		border: 0;
		border-radius: 4px;
		background: var(--metro-bronze);
		color: #fff;
		font-size: 13px;
		font-weight: 700;
		cursor: pointer;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
	}

	@media (max-width: 700px) {
		.lbl {
			display: none;
		}
	}
</style>
