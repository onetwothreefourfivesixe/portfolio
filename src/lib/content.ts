// All portfolio copy lives in content.json. This file only adds types on top of it,
// so edit the text there and the renderer (city.ts) never reads any of it.
import data from "./content.json";

export interface Job {
  years: string;
  /** Small label under the dates. Left out, the page numbers the shifts itself. */
  shift?: string;
  station?: string;
  title: string;
  org: string;
  points: string[];
}
export interface ProjectLink {
  label: string;
  href: string;
}
export interface Project {
  name: string;
  desc: string;
  /** Line under the description, e.g. "Wrought in Python". `built` is used when this is missing. */
  wrought?: string;
  built?: string;
  station?: string;
  links: ProjectLink[];
  hidden?: boolean;
  /** Optional picture: a file in static/ ("/luminate.png") or a full URL. */
  image?: string;
  imageAlt?: string;
}
/** One hobby or extracurricular. Leave a field as "" and the page shows a placeholder for it. */
export interface Pursuit {
  name: string;
  role: string; // e.g. "Cubstart Director", "Varsity captain"
  years: string; // e.g. "2026 – now"
  desc: string; // supports [label](https://...) links
  image: string; // file in static/ or a full URL
  imageAlt: string;
  /** Several pictures for one card. When set, it is used instead of image/imageAlt and the card gets dots to switch. */
  images?: { src: string; alt: string }[];
  links: ProjectLink[];
}
export interface Pursuits {
  intro: string;
  hobbies: Pursuit[];
  extracurriculars: Pursuit[];
}
export interface Links {
  resume: string;
  linkedin: string;
  github: string;
  email: string;
}

export const links: Links = data.links;
export const bio: string = data.bio;
// Shown under the name in the Midtown panel
export const tagline: string = data.tagline;
// Availability badge in the Midtown panel. Set it to "" to hide the badge.
export const status: string = data.status;
// Shift log for The Works panel, newest first. Shift numbers count up from the earliest job.
export const jobs: Job[] = data.jobs;
// Charters for the Old Town panel. Set hidden: true to keep an entry out of the page.
export const projects: Project[] = data.projects;
// Hobbies & extracurriculars for the Agora panel (432 BC).
export const pursuits: Pursuits = data.pursuits;
