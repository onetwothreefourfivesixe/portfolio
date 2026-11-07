<script lang="ts">
	import { HUB, LINES, LINE_ORDER, STATIONS, TOUR, nameOf, type StationId } from './stations';
	import StationIcon from './StationIcon.svelte';
	import { parseLinks } from './richtext';

	interface Props {
		sel: StationId;
		visited: Record<StationId, boolean>;
		tour: number; // -1 when no tour is running
		onselect: (id: StationId) => void;
		onstarttour: () => void;
		ontournext: () => void;
		ontourend: () => void;
	}
	let { sel, visited, tour, onselect, onstarttour, ontournext, ontourend }: Props = $props();

	const isHub = $derived(sel === 'hub');
	const st = $derived(isHub ? null : STATIONS[sel]);
	const ln = $derived(st ? LINES[st.line] : null);

	// Platform: neighbours along the line, named by terminus (BART style).
	const platform = $derived.by(() => {
		if (!st || !ln) return null;
		const order = ln.order, n = order.length, i = order.indexOf(sel);
		const stops = order.filter((x) => x !== 'hub');
		const atStart = !ln.loop && i === 0;
		const atEnd = !ln.loop && i === n - 1;
		const prevId = ln.loop ? order[(i - 1 + n) % n] : atStart ? 'hub' : order[i - 1];
		const nextId = ln.loop ? order[(i + 1) % n] : atEnd ? 'hub' : order[i + 1];
		return {
			position: `Station ${stops.indexOf(sel) + 1} of ${stops.length}`,
			prev: { id: prevId, dir: ln.loop ? 'Counter-clockwise' : atStart ? 'End of line' : `Toward ${nameOf(order[0])}` },
			next: { id: nextId, dir: ln.loop ? 'Clockwise' : atEnd ? 'End of line' : `Toward ${nameOf(order[n - 1])}` },
			order
		};
	});

	// Copy-to-clipboard for the email address; selects the text if the clipboard is refused.
	let copyEl = $state<HTMLElement>();
	let copyLabel = $state('Copy');
	let copyTimer: ReturnType<typeof setTimeout> | undefined;
	function setCopyLabel(text: string, revert: boolean) {
		copyLabel = text;
		clearTimeout(copyTimer);
		if (revert) copyTimer = setTimeout(() => (copyLabel = 'Copy'), 1600);
	}
	function selectCopy() {
		const s = getSelection();
		if (!copyEl || !s) return;
		const r = document.createRange();
		r.selectNodeContents(copyEl);
		s.removeAllRanges();
		s.addRange(r);
		setCopyLabel('Selected', false);
	}
	function copy(text: string) {
		try {
			navigator.clipboard.writeText(text).then(() => setCopyLabel('Copied', true), selectCopy);
		} catch {
			selectCopy();
		}
	}
	$effect(() => {
		void sel;
		copyLabel = 'Copy';
	});

	const inTour = $derived(tour >= 0 && sel === TOUR[tour]);
	const tourLast = $derived(tour === TOUR.length - 1);
</script>

<!-- Copy from content.json; [label](url) becomes a link. Kept on one line so no stray spaces appear. -->
{#snippet rich(text: string)}
	{#each parseLinks(text) as seg, i (i)}{#if seg.href}<a class="inline" href={seg.href} target={seg.external ? '_blank' : undefined} rel={seg.external ? 'noopener noreferrer' : undefined}>{seg.text}</a>{:else}{seg.text}{/if}{/each}
{/snippet}

<aside class="panel" aria-label="Station information" aria-live="polite">
	{#if inTour}
		<div class="tour">
			<span class="express" aria-hidden="true"><span>X</span></span>
			<span class="tour-text">
				<span class="tour-kicker">Express tour · Stop {tour + 1} of {TOUR.length}</span>
				<span class="tour-next">{tourLast ? 'Last stop — next train returns to Central' : `Next: ${nameOf(TOUR[tour + 1])}`}</span>
			</span>
			<button class="tour-go" onclick={ontournext}>{tourLast ? 'Finish' : 'Next stop'}</button>
			<button class="tour-exit" onclick={ontourend}>Exit</button>
		</div>
	{/if}

	<div class="sign">
		<div class="sign-row">
			{#if ln}
				<span class="badge sign-badge" style:background={ln.color} style:color={ln.text}>{ln.code}</span>
			{:else}
				<img class="photo" src={HUB.photo.src} alt={HUB.photo.alt} width="88" height="88" />
			{/if}
			<div class="sign-titles">
				<div class="sign-kicker">{ln ? `${ln.name} · ${ln.section}` : 'Central Station · Intro'}</div>
				<h1>{st ? st.name : HUB.name}</h1>
			</div>
		</div>
		<div class="stripe">
			{#if ln}
				<span style:background={ln.color}></span>
			{:else}
				{#each LINE_ORDER as id (id)}<span style:background={LINES[id].color}></span>{/each}
			{/if}
		</div>
	</div>

	<div class="body-row">
		<article class="card">
			<div class="kicker">{platform ? platform.position : 'All lines stop here'}</div>
			<p class="meta">{st ? st.meta : HUB.meta}</p>

			{#if st?.image}
				{#if st.image.src}
					<img class="shot" src={st.image.src} alt={st.image.alt} loading="lazy" />
				{:else}
					<div class="shot shot-empty" role="img" aria-label={`Image placeholder for ${st.image.alt}`}>
						<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4.5" width="18" height="15" rx="2" /><circle cx="8.5" cy="10" r="1.6" /><path d="M21 15.5l-5-5-8.5 9" /></svg>
						<span>Image coming soon</span>
					</div>
				{/if}
			{/if}

			{#if st ? st.body : HUB.body}
				<p class="body">{@render rich((st ? st.body : HUB.body) ?? '')}</p>
			{/if}

			{#if st?.copy}
				<div class="copy">
					<code bind:this={copyEl}>{st.copy}</code>
					<button type="button" class="btn" onclick={() => st?.copy && copy(st.copy)}>{copyLabel}</button>
				</div>
			{/if}

			{#if st?.highlights?.length && ln}
				<ul class="highlights">
					{#each st.highlights as h, i (i)}
						<li><span class="bullet" style:border-color={ln.color} aria-hidden="true"></span><span>{@render rich(h)}</span></li>
					{/each}
				</ul>
			{/if}

			{#if st?.tags?.length}
				<div class="tags">
					{#each st.tags as t, i (i)}<span class="tag">{t}</span>{/each}
				</div>
			{/if}

			{#if isHub}
				<div class="actions">
					<button class="btn primary" onclick={onstarttour}>
						Take the express tour
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
					</button>
					<button class="btn" onclick={() => onselect(HUB.resumeStation)}>Résumé</button>
					<button class="btn" onclick={() => onselect(HUB.emailStation)}>Email me</button>
				</div>
			{/if}

			{#if st?.links?.length}
				<div class="actions">
					{#each st.links as l, i (l.href)}
						<a
							class="btn"
							class:primary={i === 0}
							href={l.href}
							target={l.external ? '_blank' : undefined}
							rel={l.external ? 'noopener noreferrer' : undefined}
						>
							{l.text}
							{#if l.external}
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8" /></svg>
								<span class="sr">(opens in a new tab)</span>
							{:else}
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
							{/if}
						</a>
					{/each}
				</div>
			{/if}
		</article>

		<div class="side">
			{#if isHub}
				<div class="led">
					<div class="led-head"><span>DEPARTURES</span><span>CENTRAL</span></div>
					{#each LINE_ORDER as id (id)}
						{@const l = LINES[id]}
						{@const stops = l.order.filter((s) => s !== 'hub')}
						<button class="led-row" onclick={() => onselect(stops[0])}>
							<span class="badge" style:background={l.color} style:color={l.text}>{l.code}</span>
							<span class="led-dest">
								<span class="led-text">{l.section}</span>
								<span class="led-sub">
									{stops.length} stops · {l.loop ? 'Loops back to Central' : `${nameOf(l.order[0])} ↔ ${nameOf(l.order[l.order.length - 1])}`}
								</span>
							</span>
							<span class="led-text">{l.eta}</span>
						</button>
					{/each}
					<div class="led-status"><span>STATUS</span><span>{HUB.status}</span></div>
				</div>
			{:else if platform && ln}
				<div class="platform">
					<button class="plat" onclick={() => onselect(platform.prev.id)}>
						<span class="plat-dir">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
							{platform.prev.dir}
						</span>
						<span class="plat-name">Next: {nameOf(platform.prev.id)}</span>
					</button>
					<button class="plat right" onclick={() => onselect(platform.next.id)}>
						<span class="plat-dir">
							{platform.next.dir}
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
						</span>
						<span class="plat-name">Next: {nameOf(platform.next.id)}</span>
					</button>
				</div>

				<div class="strip">
					<div class="kicker strip-head">{ln.name} — all stops</div>
					<div class="strip-list">
						<span class="strip-bar" style:background={ln.color}></span>
						{#each platform.order as id (id)}
							{@const on = id === sel}
							<button class="strip-row" class:on aria-current={on ? 'location' : undefined} onclick={() => onselect(id)}>
								<StationIcon
									shape={id === 'hub' ? 'circle' : STATIONS[id].shape}
									fill={on ? ln.color : '#FFFFFF'}
									glyph={on ? ln.text : '#1D1D1B'}
									size="24"
								/>
								<span class="strip-name">{id === 'hub' ? 'Central · Intro' : STATIONS[id].name}</span>
								<span class="strip-tag">{on ? 'You are here' : id === 'hub' ? 'Transfer' : visited[id] ? 'Visited' : ''}</span>
							</button>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</div>
</aside>

<style>
	.panel {
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	/* Express tour banner */
	.tour {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px 12px;
		padding: 12px 14px;
		border-radius: 6px;
		background: var(--metro-ink);
		color: #fff;
	}
	.express {
		flex: none;
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
		background: #fff;
		transform: rotate(45deg);
	}
	.express span {
		transform: rotate(-45deg);
		color: var(--metro-ink);
		font-weight: 900;
		font-size: 14px;
	}
	.tour-text {
		flex: 1;
		min-width: 140px;
		display: flex;
		flex-direction: column;
	}
	.tour-kicker {
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--metro-sign-text);
	}
	.tour-next {
		font-size: 14px;
		font-weight: 700;
	}
	.tour-go,
	.tour-exit {
		min-height: 44px;
		padding: 0 14px;
		border-radius: 4px;
		font-size: 13px;
		cursor: pointer;
	}
	.tour-go {
		border: 0;
		background: #fff;
		color: var(--metro-ink);
		font-weight: 800;
	}
	.tour-exit {
		border: 1px solid var(--metro-muted);
		background: transparent;
		color: #fff;
		font-weight: 600;
	}

	/* Station sign */
	.sign {
		border-radius: 6px;
		overflow: hidden;
		background: var(--metro-sign);
		color: #fff;
	}
	.sign-row {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 18px 20px;
	}
	.sign-badge {
		width: 48px;
		height: 48px;
		font-size: 16px;
	}
	.photo {
		flex: none;
		width: 88px;
		height: 88px;
		border-radius: 50%;
		border: 3px solid #fff;
		object-fit: cover;
	}
	.sign-titles {
		min-width: 0;
	}
	.sign-kicker {
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--metro-sign-text);
	}
	h1 {
		margin: 2px 0 0;
		font-size: 28px;
		line-height: 1.15;
		font-weight: 800;
		letter-spacing: -0.01em;
	}
	.stripe {
		display: flex;
		height: 8px;
	}
	.stripe span {
		flex: 1;
	}

	/* Content card + side column */
	.body-row {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		gap: 16px;
	}
	.card {
		flex: 999 1 380px;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 14px;
		padding: clamp(20px, 2.4vw, 32px);
		border: 1px solid var(--metro-rule);
		border-radius: 6px;
		background: var(--metro-paper);
	}
	.meta {
		margin: 0;
		max-width: 64ch;
		font-size: 18px;
		font-weight: 600;
		line-height: 1.4;
	}
	.body {
		margin: 0;
		max-width: 64ch;
		font-size: 17px;
		line-height: 1.65;
		color: var(--metro-body);
	}
	/* Picture slot on project, hobby and club stations */
	.shot {
		display: block;
		width: 100%;
		max-width: 64ch;
		aspect-ratio: 16 / 9;
		border-radius: 6px;
		object-fit: cover;
		background: var(--metro-paper-2);
	}
	.shot-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		border: 2px dashed var(--metro-rule);
		color: var(--metro-muted);
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}
	.inline {
		color: inherit;
		font-weight: 600;
		text-decoration: underline;
		text-decoration-thickness: 2px;
		text-underline-offset: 3px;
		overflow-wrap: anywhere;
	}
	.inline:hover {
		color: var(--metro-ink);
		text-decoration-color: var(--metro-blue);
	}
	.highlights {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.highlights li {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		max-width: 64ch;
		font-size: 16px;
		line-height: 1.55;
	}
	.bullet {
		flex: none;
		width: 10px;
		height: 10px;
		margin-top: 6px;
		border-radius: 50%;
		border: 2.5px solid;
	}
	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.tag {
		padding: 4px 10px;
		border-radius: 999px;
		background: var(--metro-ground);
		color: var(--metro-body);
		font-size: 12px;
		font-weight: 600;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		padding-top: 4px;
	}
	.btn {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		min-height: 44px;
		padding: 0 14px;
		border: 2px solid var(--metro-ink);
		border-radius: 4px;
		background: #fff;
		color: var(--metro-ink);
		font-size: 14px;
		font-weight: 700;
		text-decoration: none;
		cursor: pointer;
	}
	.btn.primary {
		border-color: var(--metro-ink);
		background: var(--metro-ink);
		color: #fff;
		padding: 0 16px;
	}
	.side {
		flex: 1 1 260px;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	/* LED departures board */
	.led {
		padding: 14px 8px 10px;
		border: 4px solid var(--metro-sign);
		border-radius: 6px;
		background: var(--metro-led-bg);
	}
	.led-head,
	.led-status {
		display: flex;
		gap: 12px;
		padding: 0 10px 8px;
		font-family: var(--metro-led-font);
		font-weight: 900;
		font-size: 15px;
		letter-spacing: 0.06em;
		color: var(--metro-led);
	}
	.led-head {
		justify-content: space-between;
	}
	.led-status {
		align-items: baseline;
		margin-top: 2px;
		padding: 10px 10px 2px;
		border-top: 1px solid #2a2724;
		text-transform: uppercase;
	}
	.led-status span:first-child {
		flex: none;
	}
	.led-row {
		width: 100%;
		display: grid;
		grid-template-columns: 36px minmax(0, 1fr) auto;
		gap: 12px;
		align-items: center;
		min-height: 52px;
		padding: 6px 10px;
		border: 0;
		border-top: 1px solid #2a2724;
		background: transparent;
		cursor: pointer;
		text-align: left;
	}
	.led-row:hover {
		background: rgba(255, 255, 255, 0.08);
	}
	.led-row .badge {
		width: 32px;
		height: 32px;
		font-size: 12px;
	}
	.led-dest {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.led-text {
		font-family: var(--metro-led-font);
		font-weight: 900;
		font-size: 19px;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--metro-led);
	}
	.led-sub {
		font-size: 12px;
		color: #c9c2b8;
	}

	/* Platform buttons + stop list */
	.platform {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
		gap: 10px;
	}
	.plat {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 2px;
		min-height: 64px;
		padding: 10px 14px;
		border: 0;
		border-radius: 6px;
		background: var(--metro-sign);
		color: #fff;
		cursor: pointer;
		text-align: left;
	}
	.plat.right {
		align-items: flex-end;
		text-align: right;
	}
	.plat:hover {
		background: var(--metro-bronze);
	}
	.plat-dir {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		color: var(--metro-sign-text);
	}
	.plat-name {
		font-size: 14px;
		font-weight: 700;
	}
	.strip {
		padding: 12px 8px;
		border: 1px solid var(--metro-rule);
		border-radius: 6px;
		background: var(--metro-paper-2);
	}
	.strip-head {
		padding: 0 8px 8px;
	}
	.strip-list {
		position: relative;
		display: flex;
		flex-direction: column;
	}
	.strip-bar {
		position: absolute;
		left: 18px;
		top: 22px;
		bottom: 22px;
		width: 8px;
		border-radius: 4px;
	}
	.strip-row {
		position: relative;
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: 44px;
		padding: 0 8px 0 10px;
		border: 0;
		border-radius: 4px;
		background: transparent;
		cursor: pointer;
		text-align: left;
	}
	.strip-row:hover,
	.strip-row.on {
		background: #fff;
	}
	.strip-name {
		font-size: 14px;
		font-weight: 500;
		color: var(--metro-ink);
	}
	.strip-row.on .strip-name {
		font-weight: 700;
	}
	.strip-tag {
		margin-left: auto;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--metro-muted);
	}
	/* Email copy row */
	.copy {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px;
		padding: 12px 14px;
		border: 1px solid var(--metro-rule);
		border-radius: 6px;
		background: var(--metro-paper-2);
	}
	.copy code {
		flex: 1 1 220px;
		min-width: 0;
		font-size: 16px;
		font-weight: 600;
		overflow-wrap: anywhere;
		user-select: all;
	}

	.sr {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
</style>
