import { HUB, LINES, STATIONS, type LineId, type Shape, type StationId } from './stations';

/** The map's coordinate space (SVG viewBox). */
export const VIEW = { x: 40, y: 80, w: 1200, h: 940 } as const;
export const VIEWBOX = `${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`;
export const CENTER = { x: VIEW.x + VIEW.w / 2, y: VIEW.y + VIEW.h / 2 };
export const ZOOM = 2.1;

type Pt = [number, number];

/** Polylines for each line; every segment is 0°, 45° or 90°. */
export const LINE_POINTS: Record<LineId, Pt[]> = {
	red: [[240, 980], [240, 616], [700, 616], [700, 980]],
	blue: [[680, 120], [680, 320], [560, 440], [560, 608], [288, 880], [80, 880]],
	green: [[150, 440], [310, 600], [960, 600], [1080, 720], [1200, 720]],
	yellow: [[560, 608], [760, 408], [920, 408], [920, 560], [744, 736], [470, 736], [470, 632], [560, 632], [560, 608]]
};

export const toPath = (pts: Pt[]) => 'M' + pts.map((p) => p.join(' ')).join(' L');
export const LINE_PATHS: Record<LineId, string> = {
	red: toPath(LINE_POINTS.red),
	blue: toPath(LINE_POINTS.blue),
	green: toPath(LINE_POINTS.green),
	yellow: toPath(LINE_POINTS.yellow)
};

/** Line badges at each terminus (the loop gets one beside it). */
export const TERMINI: { line: LineId; x: number; y: number }[] = [
	{ line: 'red', x: 240, y: 996 },
	{ line: 'red', x: 700, y: 996 },
	{ line: 'blue', x: 680, y: 104 },
	{ line: 'blue', x: 64, y: 880 },
	{ line: 'green', x: 138, y: 428 },
	{ line: 'green', x: 1216, y: 720 },
	{ line: 'yellow', x: 980, y: 408 }
];

export const WATER_PATH = 'M760 1060 L1000 820 H1280';

/** Mini Metro shapes on a 24 x 24 grid. */
export const SHAPE_PATHS: Record<Shape, string> = {
	circle: 'M12 3.5a8.5 8.5 0 1 1 0 17a8.5 8.5 0 1 1 0-17z',
	square: 'M4 4h16v16H4z',
	triangle: 'M12 3.5L21 19.5H3z',
	star: 'M12 2.8l2.6 6.2 6.6.3-5.2 4.1 1.8 6.4L12 16.1l-5.8 3.7 1.8-6.4-5.2-4.1 6.6-.3z',
	cross: 'M9 3h6v6h6v6h-6v6H9v-6H3V9h6z',
	diamond: 'M12 2.5l9.5 9.5-9.5 9.5L2.5 12z',
	pentagon: 'M12 3l9 6.6-3.4 10.4H6.4L3 9.6z',
	gem: 'M6 4h12l4 6-10 11L2 10z',
	hourglass: 'M5 3h14l-5.5 9 5.5 9H5l5.5-9z'
};

/** Map coordinate → CSS percentage inside the map box. */
export const pct = (x: number, y: number) => ({
	left: ((x - VIEW.x) / VIEW.w) * 100 + '%',
	top: ((y - VIEW.y) / VIEW.h) * 100 + '%'
});

export const coordsOf = (id: StationId) => (id === 'hub' ? { x: HUB.x, y: HUB.y } : { x: STATIONS[id].x, y: STATIONS[id].y });

// ---- Train routes ----------------------------------------------------------

export interface RoutePoint { x: number; y: number; c: string }
export type Route = RoutePoint[];
export interface Pose { x: number; y: number; ang: number; c: string }

const cumulative = (pts: Pt[]) => {
	const c = [0];
	for (let i = 1; i < pts.length; i++) c.push(c[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
	return c;
};

const project = (pts: Pt[], c: number[], x: number, y: number) => {
	let best = Infinity, s = 0;
	for (let i = 0; i < pts.length - 1; i++) {
		const [ax, ay] = pts[i];
		const dx = pts[i + 1][0] - ax, dy = pts[i + 1][1] - ay, l2 = dx * dx + dy * dy;
		const t = l2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0;
		const px = ax + dx * t, py = ay + dy * t, d2 = (x - px) ** 2 + (y - py) ** 2;
		if (d2 < best) { best = d2; s = c[i] + t * Math.sqrt(l2); }
	}
	return s;
};

const pointAt = (pts: Pt[], c: number[], s: number) => {
	for (let i = 0; i < pts.length - 1; i++) {
		if (s <= c[i + 1] || i === pts.length - 2) {
			const seg = c[i + 1] - c[i];
			const t = seg ? Math.max(0, Math.min(1, (s - c[i]) / seg)) : 0;
			return { x: pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, y: pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t };
		}
	}
	return { x: pts[0][0], y: pts[0][1] };
};

/** Samples the track between two stops on one line, every ~6 units. */
function leg(line: LineId, a: StationId, b: StationId): Route {
	const pts = LINE_POINTS[line], c = cumulative(pts), total = c[c.length - 1];
	const A = coordsOf(a), B = coordsOf(b);
	const sa = project(pts, c, A.x, A.y), sb = project(pts, c, B.x, B.y);
	const loop = !!LINES[line].loop;
	let dist: number, dir: number;
	if (loop) {
		const fwd = (((sb - sa) % total) + total) % total;
		[dist, dir] = fwd <= total - fwd ? [fwd, 1] : [total - fwd, -1];
	} else {
		dist = Math.abs(sb - sa);
		dir = sb >= sa ? 1 : -1;
	}
	const steps = Math.max(2, Math.ceil(dist / 6));
	const out: Route = [];
	for (let k = 0; k <= steps; k++) {
		let s = sa + dir * dist * (k / steps);
		if (loop) s = ((s % total) + total) % total;
		out.push({ ...pointAt(pts, c, s), c: LINES[line].color });
	}
	return out;
}

/** Track route between any two stops; changes lines at Central. */
export function buildRoute(from: StationId, to: StationId): Route | null {
	if (from === to) return null;
	const la = from === 'hub' ? null : STATIONS[from].line;
	const lb = to === 'hub' ? null : STATIONS[to].line;
	let pts: Route = [];
	if (la && lb && la === lb) pts = leg(la, from, to);
	else {
		if (la) pts = pts.concat(leg(la, from, 'hub'));
		if (lb) pts = pts.concat(leg(lb, 'hub', to));
	}
	return pts.length > 1 ? pts : null;
}

/** Trip length in ms: distance / 650 units per second, 0.7–2.6 s. */
export const tripDuration = (route: Route) => Math.max(700, Math.min(2600, ((route.length * 6) / 650) * 1000));

export const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export function poseAt(route: Route, t: number): Pose {
	const n = route.length;
	const fi = t * (n - 1), i0 = Math.floor(fi), i1 = Math.min(i0 + 1, n - 1), fr = fi - i0;
	const a = route[i0], b = route[i1];
	const pa = route[Math.max(i0 - 2, 0)], pb = route[Math.min(i0 + 2, n - 1)];
	return { x: a.x + (b.x - a.x) * fr, y: a.y + (b.y - a.y) * fr, ang: (Math.atan2(pb.y - pa.y, pb.x - pa.x) * 180) / Math.PI, c: a.c };
}
