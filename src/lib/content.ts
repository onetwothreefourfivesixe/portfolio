// All portfolio copy lives in content.json. This file only adds types on top of it,
// so edit the text there and the renderer (city.ts) never reads any of it.
import data from "./content.json";

export interface Line {
  line: string;
  color: string;
  label: string;
  dark?: boolean;
}
export interface Job {
  years: string;
  shift: string;
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
  wrought: string;
  links: ProjectLink[];
  hidden?: boolean;
}
export interface Links {
  resume: string;
  linkedin: string;
  github: string;
  email: string;
}

export const links: Links = data.links;
export const bio: string = data.bio;
// Subway-line bullets for the Midtown panel. Colours follow the NYC line palette.
export const lines: Line[] = data.lines;
// Shift log for The Works panel, newest first. Shift numbers count up from the earliest job.
export const jobs: Job[] = data.jobs;
// Charters for the Old Town panel. Set hidden: true to keep an entry out of the page.
export const projects: Project[] = data.projects;
