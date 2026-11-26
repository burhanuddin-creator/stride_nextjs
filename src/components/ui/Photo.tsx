import type { SiteImage } from '../../data/images';
import styles from './Photo.module.css';

interface Props {
  image: SiteImage;
  className?: string;
  imgClassName?: string;
  /** CSS object-position for intentional cropping (falls back to the image's default position). */
  position?: string;
  /** Rendered width hint for responsive candidates, e.g. "(min-width: 900px) 48vw, 100vw". */
  sizes?: string;
  /** Above-the-fold image: load eagerly with high fetch priority instead of lazily. */
  priority?: boolean;
}

export function Photo({ image, className, imgClassName, position, sizes = '100vw', priority }: Props) {
  const objectPosition = position ?? image.position;
  const img = (
    <img
      className={[styles.img, imgClassName].filter(Boolean).join(' ')}
      src={image.src}
      alt={image.alt}
      width={image.width}
      height={image.height}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
      style={objectPosition ? { objectPosition } : undefined}
    />
  );

  return (
    <figure className={[styles.figure, className].filter(Boolean).join(' ')}>
      {image.webpSrcSet ? (
        <picture className={styles.picture}>
          <source type="image/webp" srcSet={image.webpSrcSet} sizes={sizes} />
          {img}
        </picture>
      ) : (
        img
      )}
    </figure>
  );
}
