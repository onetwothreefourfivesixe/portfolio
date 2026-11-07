<script lang="ts">
	import { SHAPE_PATHS } from './geometry';
	import type { Shape } from './stations';

	interface Props {
		shape: Shape;
		/** Ring fill: white, or the line color when selected. */
		fill?: string;
		/** Shape fill inside the ring. */
		glyph?: string;
		size?: string;
	}
	let { shape, fill = '#FFFFFF', glyph = '#1D1D1B', size = '100%' }: Props = $props();
</script>

<svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
	<circle cx="12" cy="12" r="10.5" {fill} stroke="#1D1D1B" stroke-width="2.5" />
	<path d={SHAPE_PATHS[shape]} transform="translate(6.5 6.5) scale(0.46)" fill={glyph} />
</svg>

<style>
	svg {
		display: block;
		overflow: visible;
	}
</style>
