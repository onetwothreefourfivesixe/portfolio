<script lang="ts">
	import { LINES, LINE_ORDER, STATIONS, type StationId } from './stations';
	import StationIcon from './StationIcon.svelte';

	interface Props {
		sel: StationId;
		visited: Record<StationId, boolean>;
		onselect: (id: StationId) => void;
	}
	let { sel, visited, onselect }: Props = $props();

	const groups = LINE_ORDER.map((id) => {
		const ln = LINES[id];
		const stops = ln.order.filter((s) => s !== 'hub');
		return { ln, stops };
	});
</script>

<div class="grid">
	{#each groups as { ln, stops } (ln.id)}
		<section class="group" aria-label={ln.section}>
			<header style:border-color={ln.color}>
				<span class="badge" style:background={ln.color} style:color={ln.text}>{ln.code}</span>
				<span class="titles">
					<span class="section">{ln.section}</span>
					<span class="sub">{ln.name} · {stops.length} stops</span>
				</span>
			</header>
			{#each stops as id (id)}
				{@const s = STATIONS[id]}
				{@const on = id === sel}
				<button class="row" class:on aria-current={on ? 'true' : undefined} onclick={() => onselect(id)}>
					<StationIcon shape={s.shape} fill={on ? ln.color : '#FFFFFF'} glyph={on ? ln.text : '#1D1D1B'} size="24" />
					<span class="text">
						<span class="name">{s.name}</span>
						<span class="meta">{s.meta}</span>
					</span>
					<span class="tag">{on ? 'Selected' : visited[id] ? 'Visited' : ''}</span>
				</button>
			{/each}
		</section>
	{/each}
</div>

<style>
	.grid {
		padding: 20px;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
		gap: 24px;
	}
	.group {
		display: flex;
		flex-direction: column;
		gap: 8px;
		min-width: 0;
	}
	header {
		display: flex;
		align-items: center;
		gap: 10px;
		padding-bottom: 8px;
		border-bottom: 3px solid;
	}
	.badge {
		width: 32px;
		height: 32px;
		font-size: 12px;
	}
	.titles {
		display: flex;
		flex-direction: column;
	}
	.section {
		font-size: 16px;
		font-weight: 800;
	}
	.sub,
	.meta,
	.tag {
		color: var(--metro-muted);
	}
	.sub,
	.meta {
		font-size: 12px;
	}
	.row {
		display: grid;
		grid-template-columns: 24px minmax(0, 1fr) auto;
		gap: 12px;
		align-items: center;
		min-height: 52px;
		padding: 6px 10px;
		border: 0;
		border-radius: 4px;
		background: transparent;
		cursor: pointer;
		text-align: left;
	}
	.row:hover {
		background: var(--metro-paper-2);
	}
	.row.on {
		background: #f4f2ed;
	}
	.text {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.name {
		font-size: 14px;
		font-weight: 700;
		color: var(--metro-ink);
	}
	.meta {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.tag {
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
</style>
