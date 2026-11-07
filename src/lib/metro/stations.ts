// Turns the copy in content.json into lines and stations on the map.
// Copy lives in content.json; this file only decides where things sit.
import { bio, contact, hobbies, jobs, links, projects, status, tagline } from "#lib/content.ts";

export type LineId = "red" | "blue" | "green" | "yellow";
export type StationId = string;
export type Shape = "circle" | "square" | "triangle" | "star" | "cross" | "diamond" | "pentagon" | "gem" | "hourglass";
export type LabelSide = "r" | "l" | "t" | "b";

export interface Line {
	id: LineId;
	name: string;
	section: string;
	code: string;
	color: string;
	text: string;
	eta: string;
	loop?: boolean;
	/** Riding order, including 'hub' where the line passes Central. */
	order: StationId[];
}

export interface StationLink {
	text: string;
	href: string;
	external?: boolean;
}

export interface Station {
	id: StationId;
	line: LineId;
	x: number;
	y: number;
	shape: Shape;
	side: LabelSide;
	name: string; // map label and sign
	meta: string; // first line in the panel
	body?: string;
	highlights?: string[];
	tags?: string[];
	links?: StationLink[];
	/** Text to copy to the clipboard (the email address). */
	copy?: string;
	/** Picture slot in the panel (projects, hobbies and clubs). `src` is unset until an image is added. */
	image?: { src?: string; alt: string };
}

export interface Hub {
	x: number;
	y: number;
	name: string;
	meta: string;
	body: string;
	photo: { src: string; alt: string };
	status: string;
	resumeStation: StationId;
	emailStation: StationId;
}

/** A place on a line for a station. `afterHub` slots come after Central in riding order. */
interface Slot {
	x: number;
	y: number;
	side: LabelSide;
	afterHub?: boolean;
}

// Station slots, in riding order. They sit on the line paths in geometry.ts and clear of
// crossings. A line uses as many slots as it has entries; add a slot before adding entries.
const RED_SLOTS: Slot[] = [
	{ x: 240, y: 940, side: "r" },
	{ x: 240, y: 820, side: "l" },
	{ x: 240, y: 700, side: "l" },
	{ x: 700, y: 688, side: "l", afterHub: true },
	{ x: 700, y: 820, side: "r", afterHub: true },
	{ x: 700, y: 940, side: "r", afterHub: true }
];
const BLUE_SLOTS: Slot[] = [
	{ x: 680, y: 160, side: "r" },
	{ x: 680, y: 270, side: "r" },
	{ x: 620, y: 380, side: "l" },
	{ x: 560, y: 500, side: "l" },
	{ x: 420, y: 748, side: "l", afterHub: true },
	{ x: 150, y: 880, side: "b", afterHub: true }
];
const GREEN_SLOTS: Slot[] = [
	{ x: 176, y: 466, side: "r" },
	{ x: 240, y: 530, side: "l" },
	{ x: 800, y: 600, side: "t", afterHub: true },
	{ x: 1020, y: 660, side: "r", afterHub: true },
	{ x: 1176, y: 720, side: "b", afterHub: true }
];
const YELLOW_SLOTS: Slot[] = [
	{ x: 660, y: 508, side: "r", afterHub: true },
	{ x: 840, y: 408, side: "t", afterHub: true },
	{ x: 920, y: 488, side: "r", afterHub: true },
	{ x: 832, y: 648, side: "l", afterHub: true },
	{ x: 600, y: 736, side: "b", afterHub: true },
	{ x: 470, y: 656, side: "l", afterHub: true }
];
const HOBBY_SHAPES: Shape[] = ["star", "cross", "diamond", "pentagon", "gem", "hourglass"];

type Entry = Omit<Station, "x" | "y" | "side" | "line" | "id">;

function place(line: LineId, prefix: string, slots: Slot[], entries: Entry[]) {
	if (entries.length > slots.length) {
		console.warn(`metro: ${line} line has ${entries.length} entries but ${slots.length} slots; extra entries are not shown.`);
	}
	const placed = entries.slice(0, slots.length).map((e, i) => ({ ...e, ...slots[i], id: `${prefix}${i + 1}`, line }));
	const before = placed.filter((s) => !s.afterHub).map((s) => s.id);
	const after = placed.filter((s) => s.afterHub).map((s) => s.id);
	const stations: Station[] = placed.map(({ afterHub: _a, ...s }) => s);
	return { stations, order: [...before, "hub", ...after] };
}

const display = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

// Red Line · Experience: oldest at the left terminus, newest at the right.
const red = place(
	"red",
	"e",
	RED_SLOTS,
	[...jobs].reverse().map((j) => ({
		shape: "square",
		name: j.station,
		meta: j.title,
		body: `${j.org} · ${j.years}`,
		highlights: j.points
	}))
);

// Blue Line · Projects, in content.json order.
const blue = place(
	"blue",
	"p",
	BLUE_SLOTS,
	projects
		.filter((p) => !p.hidden)
		.map((p) => ({
			shape: "triangle",
			name: p.station,
			meta: p.name,
			body: p.desc,
			tags: p.built.split(" · "),
			image: { src: p.image, alt: p.name },
			links: p.links.map((l) => ({ text: l.label, href: l.href, external: true }))
		}))
);

// Green Line · Contact.
const green = place("green", "c", GREEN_SLOTS, [
	{
		shape: "circle",
		name: "Email",
		meta: "Reaches me fastest",
		body: contact.note,
		copy: links.email,
		links: [{ text: "Send an email", href: `mailto:${links.email}` }]
	},
	{
		shape: "circle",
		name: "LinkedIn",
		meta: display(links.linkedin),
		links: [{ text: "Open LinkedIn", href: links.linkedin, external: true }]
	},
	{
		shape: "circle",
		name: "GitHub",
		meta: display(links.github),
		links: [{ text: "Open GitHub", href: links.github, external: true }]
	},
	{
		shape: "circle",
		name: "Résumé",
		meta: "Google Doc",
		links: [{ text: "Open résumé", href: links.resume, external: true }]
	},
	{
		shape: "circle",
		name: "Based at",
		meta: contact.basedAt,
		body: `Originally from ${contact.from}.`
	}
]);

// Yellow Loop · Hobbies & Clubs: hobbies, then the clubs and volunteering.
const yellow = place(
	"yellow",
	"h",
	YELLOW_SLOTS,
	hobbies.map((h, i) => ({
		shape: HOBBY_SHAPES[i % HOBBY_SHAPES.length],
		name: h.station,
		meta: h.meta,
		body: h.desc,
		image: { src: h.image, alt: h.station }
	}))
);

export const HUB: Hub = {
	x: 560,
	y: 608,
	name: "Edward Lin",
	meta: tagline,
	body: bio,
	photo: { src: "/IMG20250517200848_01.jpg", alt: "Edward Lin" },
	status,
	resumeStation: "c4",
	emailStation: "c1"
};

export const LINES: Record<LineId, Line> = {
	red: { id: "red", name: "Red Line", section: "Experience", code: "EX", color: "#BF0D3E", text: "#FFFFFF", eta: "BRD", order: red.order },
	blue: { id: "blue", name: "Blue Line", section: "Projects", code: "PR", color: "#009CDE", text: "#FFFFFF", eta: "3 MIN", order: blue.order },
	green: { id: "green", name: "Green Line", section: "Contact", code: "CT", color: "#00B140", text: "#FFFFFF", eta: "5 MIN", order: green.order },
	yellow: { id: "yellow", name: "Yellow Loop", section: "Hobbies & Clubs", code: "HB", color: "#FFD100", text: "#1D1D1B", eta: "7 MIN", loop: true, order: yellow.order }
};

export const LINE_ORDER: LineId[] = ["red", "blue", "green", "yellow"];

const all = [...red.stations, ...blue.stations, ...green.stations, ...yellow.stations];
export const STATIONS: Record<StationId, Station> = Object.fromEntries(all.map((s) => [s.id, s]));
export const STATION_IDS: StationId[] = all.map((s) => s.id);

/** Express tour: newest role, two flagship projects, then email. Finishing returns to Central. */
export const TOUR: StationId[] = [red.order[red.order.length - 1], "p1", "p3", "c1"].filter((id) => id in STATIONS);

export const nameOf = (id: StationId): string => (id === "hub" ? "Central" : (STATIONS[id]?.name ?? id));
