import Link from 'next/link';
import {
  addressCityLine,
  directionsUrl,
  emailHref,
  faxDisplay,
  mapEmbedUrl,
  mapSearchUrl,
  phoneDisplay,
  phoneHref,
  site,
} from '../config/site';
import { WHAT_WE_TREAT_HREF } from '../data/conditions';
import { HOME_ACTIVITY_TABS, HOME_DIFFERENCE, HOME_FAQS, HOME_FEATURED_SERVICES, HOME_HERO } from '../data/home';
import { media } from '../data/media';
import { PATIENT_RESOURCES_HREF, resourceHref } from '../data/resources';
import { SERVICES_INDEX_HREF, serviceHref } from '../data/services';
import { ABOUT_HREF, CONTACT_HREF } from '../utils/links';
import { TealHero } from '../components/blocks/TealHero';
import { ActivityTabs } from '../components/home/ActivityTabs';
import { HomeActionsFlag } from '../components/home/HomeActionsFlag';
import { HeroSlider } from '../components/home/HeroSlider';
import { HomeFaqs } from '../components/home/HomeFaqs';
import { Reveal } from '../components/ui/Reveal';
import { ButtonAnchor, ButtonLink } from '../components/ui/Button';
import { Eyebrow } from '../components/ui/Eyebrow';
import { Photo } from '../components/ui/Photo';
import styles from './HomePage.module.css';

/** Text link with a clay underline and a small arrow (package “home-text-link”). */
function HomeTextLink({ to, children, external }: { to: string; children: string; external?: boolean }) {
  const arrow = (
    <span className={styles.textLinkArrow} aria-hidden="true">
      {external ? '↗' : '→'}
    </span>
  );
  return (
    <Link href={to} className={styles.textLink}>
      {children} {arrow}
    </Link>
  );
}

/**
 * Home page from the Home page developer package (design-reference/Stride_Home_Page_Developer_Package/), built from
 * the site's shared components: hero slider (teal hero, Coming Soon poster) → everyday-goal tabs → the Stride difference → featured services →
 * getting-started questions → sand appointment band → location, plus a booking/directions bar below 720px.
 * "Contact Stride" actions open the Contact page (CONTACT_HREF); the header links to online booking.
 */
export default function HomePage() {
  return (
    <>
      <HomeActionsFlag />
      {/* 1. Hero slider: the welcome hero (with the page's h1) and the "Coming Soon to Westmont" poster. */}
      <HeroSlider
        label="Welcome to Stride"
        slides={[
          {
            label: 'Guiding every Stride with care',
            content: (
              <TealHero
                crumbs={[{ label: 'Home' }]}
                title="Guiding every Stride with care."
                tagline="Personalized physical therapy in Westmont."
                text="Care to help you move more comfortably, build confidence, and return to the activities that matter to you."
                image={media(HOME_HERO.image, HOME_HERO.alt)}
                imagePosition="60% center"
                mobileImage="below"
                fill
                compactMobile
                actions={
                  <>
                    <ButtonLink to={CONTACT_HREF} variant="clay">
                      Contact Stride
                    </ButtonLink>
                    <ButtonLink to={WHAT_WE_TREAT_HREF} variant="ghost" arrow={false}>
                      Explore What We Treat
                    </ButtonLink>
                  </>
                }
              />
            ),
          },
          {
            label: 'Coming Soon to Westmont',
            content: (
              <div className={styles.poster}>
                {/* Desktop: the poster itself. Its words are part of the image, so the alt text repeats them. */}
                <Photo
                  image={media(
                    'coming-soon-westmont-poster',
                    'Stride Physical Therapy. Your next chapter in movement. Coming Soon to Westmont. Care that starts with you.',
                  )}
                  className={styles.posterImage}
                  sizes="100vw"
                />
                {/* Below 900px the wide poster would be too small to read, so the slide is rebuilt from its parts: the
                    same words as real text, then the poster's text-free clinic photo below them. */}
                <div className={styles.posterMobile}>
                  <div className={`container ${styles.posterCopy}`}>
                    {/* The poster's own wording (brand-assets/posters/coming-soon-westmont.png), not site.name. */}
                    <p className={styles.posterEyebrow}>Stride Physical Therapy</p>
                    <p className={styles.posterTitle}>Your next chapter in movement.</p>
                    <p className={styles.posterSoon}>Coming Soon to Westmont</p>
                    <p className={styles.posterTagline}>Care that starts with you.</p>
                  </div>
                  <Photo
                    image={media('coming-soon-westmont-photo', '')}
                    className={styles.posterPhoto}
                    position="72% 74%"
                    sizes="(max-width: 899px) 100vw, 1px"
                  />
                </div>
              </div>
            ),
          },
        ]}
      />

      {/* 2. Everyday movement goals */}
      <section className={styles.section} aria-labelledby="home-moments-title">
        <div className="container">
          <div className={styles.sectionHead}>
            <div>
              <Eyebrow>Life happens in the everyday</Eyebrow>
              <h2 id="home-moments-title" className={styles.h2}>
                What would you like <br className={styles.br} />
                to feel easier?
              </h2>
            </div>
            <p className={styles.headText}>
              You don’t need to know the name of your condition to get started. Begin with what’s getting in the way.
            </p>
          </div>
          <ActivityTabs tabs={HOME_ACTIVITY_TABS} label="Explore everyday movement goals" />
          <p className={styles.afterTabs}>
            <HomeTextLink to={WHAT_WE_TREAT_HREF}>Explore all treatment areas & our body-area guide</HomeTextLink>
          </p>
        </div>
      </section>

      {/* 3. The Stride difference */}
      <section className={`${styles.section} ${styles.warm}`} aria-labelledby="home-difference-title">
        <Reveal className={`container ${styles.difference} ${styles.reveal}`}>
          <div className={styles.differenceHeading}>
            <Eyebrow>The Stride difference</Eyebrow>
            <h2 id="home-difference-title" className={styles.h2}>
              Care that gets <br className={styles.br} />
              to know you.
            </h2>
            <p className={styles.headText}>
              Your history, your routines, and your reasons for wanting to move more comfortably all belong in the conversation.
            </p>
            <HomeTextLink to={ABOUT_HREF}>Our reason for starting Stride</HomeTextLink>
          </div>
          <div className={styles.differenceList}>
            {HOME_DIFFERENCE.map((item) => (
              <article key={item.title} className={styles.differenceItem}>
                <h3 className={styles.differenceTitle}>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </Reveal>
      </section>

      {/* 4. Featured services */}
      <section className={styles.section} aria-labelledby="home-services-title">
        <div className="container">
          <div className={styles.sectionHead}>
            <div>
              <Eyebrow>Ways we can support you</Eyebrow>
              <h2 id="home-services-title" className={styles.h2}>
                Different needs. <br className={styles.br} />A personal plan.
              </h2>
            </div>
            <p className={styles.headText}>
              Explore a few starting points. Your evaluation helps us choose the services and techniques that fit your needs.
            </p>
          </div>
          <Reveal as="ul" className={`${styles.serviceList} ${styles.reveal}`}>
            {HOME_FEATURED_SERVICES.map((service) => (
              <li key={service.slug}>
                <Link href={serviceHref(service.slug)} className={styles.serviceRow} aria-label={`Learn more about ${service.title}`}>
                  {/* Decorative: the visible title names the service. */}
                  <Photo image={media(service.image, '')} className={styles.serviceImage} sizes="126px" />
                  <h3 className={styles.serviceTitle}>{service.title}</h3>
                  <p className={styles.serviceText}>{service.text}</p>
                  <span className={styles.serviceMore} aria-hidden="true">
                    Learn More <span className={styles.serviceArrow}>↗</span>
                  </span>
                </Link>
              </li>
            ))}
          </Reveal>
          <div className={styles.serviceBottom}>
            <ButtonLink to={SERVICES_INDEX_HREF} variant="outline">
              Explore All 12 Services
            </ButtonLink>
            <p>Including manual therapy, dry needling, cupping, gait analysis, and more.</p>
          </div>
        </div>
      </section>

      {/* 5. Getting started */}
      <section className={`${styles.section} ${styles.ruled}`} aria-labelledby="home-faq-title">
        <div className={`container ${styles.faq}`}>
          <div className={styles.faqIntro}>
            <Eyebrow>Before your first stride</Eyebrow>
            <h2 id="home-faq-title" className={styles.h2}>
              Getting started, <br className={styles.br} />
              made clearer.
            </h2>
            <p className={styles.headText}>It’s natural to have questions. Here are a few answers to help you feel more prepared.</p>
            <HomeTextLink to={PATIENT_RESOURCES_HREF}>Explore Patient Resources</HomeTextLink>
          </div>
          <div>
            <HomeFaqs faqs={HOME_FAQS} />
            <p className={styles.allFaqs}>
              <HomeTextLink to={resourceHref('faqs')}>More patient questions</HomeTextLink>
            </p>
          </div>
        </div>
      </section>

      {/* 6. Appointment */}
      <section className={styles.start} aria-labelledby="home-start-title">
        <div className="container">
          <Eyebrow>Your next stride</Eyebrow>
          <h2 id="home-start-title" className={styles.startTitle}>
            Let’s start with <br className={styles.br} />
            what matters to you.
          </h2>
          <p className={styles.startText}>Tell us what feels difficult and what you want to get back to. We’ll help you take the next step.</p>
          <ButtonLink to={CONTACT_HREF}>Contact Stride</ButtonLink>
          <a className={styles.startEmail} href={emailHref}>
            Have a question first? Email us <span aria-hidden="true">↗</span>
          </a>
        </div>
      </section>

      {/* 7. Location */}
      <section className={styles.section} aria-labelledby="home-location-title" id="home-location">
        <div className={`container ${styles.location}`}>
          <div>
            <Eyebrow>Find your way to Stride</Eyebrow>
            <h2 id="home-location-title" className={styles.h2}>
              Care close <br className={styles.br} />
              to your everyday.
            </h2>
            <address className={styles.address}>
              {site.name}
              <br />
              {site.address.street}
              <br />
              {addressCityLine}
            </address>
            <p className={styles.numbers}>
              <a href={phoneHref} className={styles.contactLink}>
                {phoneDisplay}
              </a>
              <span>{faxDisplay}</span>
            </p>
            <dl className={styles.hours}>
              {site.hours.map((h) => (
                <div key={h.days}>
                  <dt>{h.days}</dt>
                  <dd>{h.time}</dd>
                </div>
              ))}
            </dl>
            <a href={emailHref} className={styles.contactLink}>
              {site.email}
            </a>
            <p className={styles.arrival}>Questions about parking, the entrance, or accessibility? Contact us before your visit so you can plan ahead.</p>
            <ButtonAnchor href={directionsUrl} variant="outline" arrow={false} aria-label="Get Directions (opens a map in a new tab)">
              Get Directions <span aria-hidden="true">↗</span>
            </ButtonAnchor>
          </div>
          <div className={styles.map}>
            <iframe
              title="Google Map showing Stride at 1131 Fairview Avenue, Westmont, Illinois 60559"
              src={mapEmbedUrl}
              width="600"
              height="470"
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
            <a className={styles.mapLink} href={mapSearchUrl} target="_blank" rel="noopener noreferrer">
              View larger map <span aria-hidden="true">↗</span>
              <span className="visually-hidden"> (opens in a new tab)</span>
            </a>
          </div>
        </div>
      </section>

      {/* Below 720px: booking and directions stay within reach. */}
      <nav className={styles.mobileActions} aria-label="Quick clinic actions">
        <Link href={CONTACT_HREF}>
          Contact Stride <span aria-hidden="true">→</span>
        </Link>
        <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
          Directions <span aria-hidden="true">↗</span>
          <span className="visually-hidden"> (opens a map in a new tab)</span>
        </a>
      </nav>
    </>
  );
}
