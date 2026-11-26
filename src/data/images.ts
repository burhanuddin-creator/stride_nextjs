/**
 * Shared image type. Every page image — including the Home page — comes from src/data/media.ts (client package
 * illustrations, the Home package hero and the approved portrait of Dr. Arva Gadly).
 */
export interface SiteImage {
  /** Image URL: the JPEG/WebP shown when no <picture> source applies. */
  src: string;
  alt: string;
  /** Intrinsic dimensions of `src` — set on <img> to reserve space and avoid layout shift. */
  width: number;
  height: number;
  illustrative: boolean;
  /** Optional WebP candidates ("url 480w, url 800w, …") served through <picture>. */
  webpSrcSet?: string;
  /** Default CSS object-position for this image's crops (placements may override). */
  position?: string;
}
