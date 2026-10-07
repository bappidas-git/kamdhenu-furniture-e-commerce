import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { renderAccent } from "../ui";
import { HERO } from "../../content/homeContent";
import { TOKENS } from "../../theme/tokens";
import { onImageError } from "../../utils/helpers";
import styles from "./HeroSection.module.css";

// =============================================================================
// HeroSection — the home page's full-bleed editorial hero
// =============================================================================
// Everything it shows comes from HERO in src/content/homeContent.js: one
// headline (the page's only h1, with an *accent* word), one support line and
// up to two CTAs over a single photograph or a muted looping video. No
// carousel, no offers, no claims.
//
// Motion (DESIGN_SYSTEM.md, section 8): on mount the media settles from a
// 1.04 scale and the text lines rise in one --sf-stagger apart; on scroll the
// media drifts down by up to 6% (transform only). With reduced motion none of
// this runs and a video stays on its poster.
// =============================================================================

const { duration, easeOut, revealDistance, stagger } = TOKENS.motion;

const MEDIA_SCALE_FROM = 1.04;
const PARALLAX_SHIFT = 6; // % of the media height at full scroll

const textGroup = {
  hidden: {},
  visible: { transition: { staggerChildren: stagger, delayChildren: stagger } },
};

const textLine = {
  hidden: { opacity: 0, y: revealDistance },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.reveal, ease: easeOut },
  },
};

const HeroMedia = ({ media, reduceMotion }) => {
  const videoRef = useRef(null);
  const initialReduceMotion = useRef(reduceMotion);
  const { image, video, focalPoint } = media;
  const objectPosition = focalPoint ? { objectPosition: focalPoint } : undefined;

  // The OS setting can change while the page is open (autoPlay only applies
  // on mount): pause the loop when it turns on, resume when it turns off.
  useEffect(() => {
    const el = videoRef.current;
    if (!el || reduceMotion === initialReduceMotion.current) return;
    initialReduceMotion.current = reduceMotion;
    if (reduceMotion) el.pause();
    else el.play()?.catch(() => {});
  }, [reduceMotion]);

  // React 18 has no camelCase fetchPriority prop; the lowercase attribute
  // passes straight through to the DOM.
  const img = (
    <img
      className={styles.mediaEl}
      src={image.src}
      alt={image.alt}
      width={image.width}
      height={image.height}
      loading="eager"
      fetchpriority="high"
      decoding="async"
      onError={onImageError}
      style={objectPosition}
    />
  );

  if (!video?.src) return img;

  return (
    <video
      ref={videoRef}
      className={styles.mediaEl}
      autoPlay={!reduceMotion}
      muted
      loop
      playsInline
      poster={video.poster || image.src}
      preload="metadata"
      aria-label={image.alt}
      style={objectPosition}
    >
      <source src={video.src} />
      {img}
    </video>
  );
};

const HeroSection = ({ content = HERO }) => {
  const reduceMotion = useReducedMotion();
  const sectionRef = useRef(null);

  // The hero opens the page, so its scroll progress is the window's scrollY
  // over its own height (0 → 1 as it leaves the viewport).
  const { scrollY } = useScroll();
  const parallaxY = useTransform(scrollY, (y) => {
    const height = sectionRef.current?.offsetHeight || 1;
    return `${Math.min(Math.max(y / height, 0), 1) * PARALLAX_SHIFT}%`;
  });

  const { eyebrow, headline, support, primaryCta, secondaryCta, media } = content;
  const textInitial = reduceMotion ? false : "hidden";

  return (
    <section ref={sectionRef} className={styles.hero} aria-labelledby="home-hero-title">
      <motion.div
        className={styles.mediaFrame}
        style={reduceMotion ? undefined : { y: parallaxY }}
      >
        <motion.div
          className={styles.media}
          initial={reduceMotion ? false : { scale: MEDIA_SCALE_FROM }}
          animate={{ scale: 1 }}
          transition={{ duration: duration.reveal, ease: easeOut }}
        >
          <HeroMedia media={media} reduceMotion={reduceMotion} />
        </motion.div>
      </motion.div>

      <div className={styles.inner}>
        <motion.div
          className={styles.content}
          variants={textGroup}
          initial={textInitial}
          animate="visible"
        >
          {eyebrow && (
            <motion.p className={styles.eyebrow} variants={textLine}>
              {eyebrow}
            </motion.p>
          )}
          <motion.h1 id="home-hero-title" className={styles.headline} variants={textLine}>
            {renderAccent(headline)}
          </motion.h1>
          {support && (
            <motion.p className={styles.support} variants={textLine}>
              {support}
            </motion.p>
          )}
          <motion.div className={styles.ctas} variants={textLine}>
            <Link className={`sf-btn sf-btn--paper ${styles.cta}`} to={primaryCta.to}>
              {primaryCta.label}
            </Link>
            {secondaryCta && (
              <Link
                className={`sf-btn sf-btn--paper-ghost ${styles.cta}`}
                to={secondaryCta.to}
              >
                {secondaryCta.label}
              </Link>
            )}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
