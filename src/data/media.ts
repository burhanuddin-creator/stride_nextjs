/**
 * Images from the client developer package (design-reference/Stride_Complete_Website_Developer_Package/).
 * Files are produced by `node scripts/build-site-images.mjs` into src/assets/images/site/ — only the 37 images that
 * current pages use (image-guides/IMAGE_USAGE.json). Placement and per-placement alt text come from the package's
 * rendered pages (src/data/generated/*), so callers always pass the alt text for their placement.
 *
 * Provenance (image-guides/IMAGE_CATALOG.csv, website/assets/clinic-series-notes.md): the clinic and condition
 * scenes are photorealistic GENERATED illustrations — not photographs of Dr. Arva Gadly, Stride staff, patients or the
 * clinic. `illustrative: true` marks them; the footer carries the matching disclosure. The portrait
 * (`dr-arva-gadly-portrait`, from the separately supplied JPEG in brand-assets/portraits/) is the approved photograph
 * of Dr. Arva Gadly and replaces the older bundled headshot everywhere.
 */
import { HOME_MEDIA_MANIFEST } from './generated/homeMediaManifest';
import { MEDIA_MANIFEST } from './generated/mediaManifest';
import { HOME_FILES, SITE_FILES } from './generated/imageFiles';
import { POSTER_MEDIA_MANIFEST } from './generated/posterMediaManifest';
import type { SiteImage } from './images';

/**
 * Complete-site package images (scripts/build-site-images.mjs) plus the Home package hero, the separately
 * supplied portrait of Dr. Arva Gadly (scripts/build-home-images.mjs) and the Home "Coming Soon" poster
 * (scripts/build-poster-images.mjs). Home, portrait and poster files live in src/assets/images/home/.
 */
const HOME_FOLDER_MANIFEST = { ...HOME_MEDIA_MANIFEST, ...POSTER_MEDIA_MANIFEST };
const MANIFEST = { ...MEDIA_MANIFEST, ...HOME_FOLDER_MANIFEST };
export type MediaId = keyof typeof MANIFEST;

/** The approved portrait of Dr. Arva Gadly — the only real photograph. Every other image is an illustration. */
export const PORTRAIT_ID = 'dr-arva-gadly-portrait' satisfies MediaId;
const PORTRAITS: ReadonlySet<MediaId> = new Set<MediaId>([PORTRAIT_ID]);

function file(id: MediaId, name: string): string {
  const home = Object.hasOwn(HOME_FOLDER_MANIFEST, id);
  // Static imports (scripts/build-image-imports.mjs) resolve to fingerprinted /_next/static/media/… URLs.
  const url = (home ? HOME_FILES : SITE_FILES)[name]?.src;
  if (!url) throw new Error(`Missing image ${name} — add it to src/assets/images and run node scripts/build-image-imports.mjs`);
  return url;
}

export function isMediaId(value: string): value is MediaId {
  return Object.hasOwn(MANIFEST, value);
}

/** The portrait of Dr. Arva Gadly, with crops that keep her face and head comfortably in view. */
export function portrait(alt = 'Dr. Arva Gadly, founder of Stride Physical Therapy & Wellness', position = '50% 22%'): SiteImage {
  return media(PORTRAIT_ID, alt, position);
}

/**
 * A package image for one placement. `alt` is the placement's alt text from the package ('' for decorative
 * placements, e.g. a card image next to the same visible title).
 */
export function media(id: MediaId, alt: string, position?: string): SiteImage {
  const meta: { format: string; width: number; height: number; widths: readonly number[] } = MANIFEST[id];
  const illustrative = !PORTRAITS.has(id);
  if (meta.format === 'svg') {
    return { src: file(id, `${id}.svg`), alt, width: meta.width, height: meta.height, illustrative, position };
  }
  const native = file(id, `${id}.webp`);
  const candidates = [...meta.widths.map((w) => `${file(id, `${id}-${w}.webp`)} ${w}w`), `${native} ${meta.width}w`];
  return { src: native, alt, width: meta.width, height: meta.height, illustrative, webpSrcSet: candidates.join(', '), position };
}
