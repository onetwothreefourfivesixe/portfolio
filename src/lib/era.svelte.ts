// Shared nav-bar state. city.ts writes it through its onHud callback; Hud.svelte reads it.
export type EraKey = "modern" | "industrial" | "medieval" | "future";

export interface HudState {
  year: number;
  index: number;
  era: EraKey | string;
  name: string;
  pop: string;
}

export interface Section {
  id: string;
  label: string;
}

export const hud: HudState = $state({
  year: 2026,
  index: 0,
  era: "modern",
  name: "Midtown · present day",
  pop: "8.4 million",
});

export const sections: Section[] = [
  { id: "intro", label: "Intro" },
  { id: "experience", label: "Experience" },
  { id: "projects", label: "Projects" },
  { id: "contact", label: "Contact" },
];
