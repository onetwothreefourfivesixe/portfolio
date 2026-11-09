// The picture currently enlarged in the popup. Any card can open it; Lightbox.svelte shows it.
export const lightbox = $state({ src: "", alt: "" });

export function openLightbox(src: string, alt: string) {
  lightbox.src = src;
  lightbox.alt = alt;
}

export function closeLightbox() {
  lightbox.src = "";
  lightbox.alt = "";
}
