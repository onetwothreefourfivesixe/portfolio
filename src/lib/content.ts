// All portfolio copy lives in content.json. This file only adds types on top of it.
// The metro map (src/lib/metro/stations.ts) turns these entries into stations.
import data from "./content.json";

export interface Job {
  station: string; // short name shown on the map
  years: string;
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
  station: string; // short name shown on the map
  built: string; // one line: stack, scale or result
  desc: string;
  links: ProjectLink[];
  hidden?: boolean;
  image?: string; // path under static/, e.g. "/luminate.png"; a placeholder shows until set
}
export interface Hobby {
  station: string;
  meta: string;
  desc: string;
  image?: string; // path under static/; a placeholder shows until set
}
export interface Links {
  resume: string;
  linkedin: string;
  github: string;
  email: string;
}
export interface Contact {
  note: string;
  basedAt: string;
  from: string;
}

export const links: Links = data.links;
export const tagline: string = data.tagline;
export const bio: string = data.bio;
// Departures-board status line on Central.
export const status: string = data.status;
export const contact: Contact = data.contact;
// Newest first. The Red Line runs oldest → newest, so the map reverses this list.
export const jobs: Job[] = data.jobs;
// Set hidden: true to keep an entry off the map.
export const projects: Project[] = data.projects;
// The Yellow Loop: hobbies first, then clubs and volunteering.
export const hobbies: Hobby[] = data.hobbies;
