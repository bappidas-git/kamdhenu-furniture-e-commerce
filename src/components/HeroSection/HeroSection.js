import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { HERO } from "../../content/homeContent";
import { TOKENS } from "../../theme/tokens";
import { onImageError } from "../../utils/helpers";
import { renderAccent } from "../ui";
import styles from "./HeroSection.module.css";

// =============================================================================
// HeroSection — the home page's full-bleed editorial hero
// =============================================================================
//
// Everything it shows comes from HERO in src/content/homeContent.js: an
// optional eyebrow, the headline (the page's only h1, with its *accent* word
// in italic), one support line, one or two CTAs, and the media (a photograph,
// optionally with a muted looping film over it).
//
//   media   fills the section, cropped around `focalPoint`; on mount it
//           settles from a 1.04 scale, and while the page scrolls it drifts
//           down by up to 6% of its height (a light parallax). Transforms
//           only; both are off under reduced motion.
//   scrim   the always-dark navy scrim behind the copy, so paper text reads
//           on any photograph (HeroSection.module.css)
//   copy    bottom-left from 1024px, bottom-aligned below that; once its
//           fonts have loaded (at most 1s) the lines rise in one after
//           another (--sf-stagger), on mount, not on scroll
//
// The film, when there is one, never plays under reduced motion (its poster
// shows), and a Pause/Play button keeps it under the visitor's control.
// =============================================================================

const { duration, easeOut, revealDistance, stagger } = TOKENS.motion;

const MEDIA_SCALE_FROM = 1.04;
const PARALLAX_SHIFT = 6; // % of the media's height

const copyVariants = {
  hidden: {},
  shown: { transition: { delayChildren: stagger, staggerChildren: stagger } },
};

const lineVariants = {
  hidden: { opacity: 0, y: revealDistance },
  shown: { opacity: 1, y: 0, transition: { duration: duration.reveal, ease: easeOut } },
};

const TITLE_ID = "sf-hero-title";

// The copy is bottom-aligned, so if it re-wrapped when its web fonts arrive
// (font-display: swap) every line above the change would move. It therefore
// stays hidden, scrim included, until the faces it uses have loaded (at most
// FONT_WAIT_MS; on a slower connection it shows in the fallback), then
// enters. The media does not wait.
const familyOf = (stack) => stack.split(",")[0].trim();
const COPY_FONTS = [
  `400 1em ${familyOf(TOKENS.type.fontDisplay)}`,
  `italic 400 1em ${familyOf(TOKENS.type.fontDisplay)}`,
  `400 1em ${familyOf(TOKENS.type.fontSans)}`,
  `500 1em ${familyOf(TOKENS.type.fontSans)}`,
];
const FONT_WAIT_MS = 1000;

const copyFontsLoaded = () => {
  if (typeof document === "undefined" || !document.fonts) return true;
  try {
    return COPY_FONTS.every((font) => document.fonts.check(font));
  } catch {
    return true;
  }
};

const useCopyFontsReady = () => {
  const [ready, setReady] = useState(copyFontsLoaded);

  useEffect(() => {
    if (ready) return undefined;
    let active = true;
    const done = () => {
      if (active) setReady(true);
    };
    const timer = window.setTimeout(done, FONT_WAIT_MS);
    Promise.all(COPY_FONTS.map((font) => document.fonts.load(font))).then(done, done);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [ready]);

  return ready;
};

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
    <path d="M8 5.5v13l10.5-6.5z" />
  </svg>
);

const PauseIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
    <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />
  </svg>
);

const HeroSection = () => {
  const { eyebrow, headline, support, primaryCta, secondaryCta, media } = HERO;
  const { image, video, focalPoint } = media;

  const reduceMotion = useReducedMotion();
  const copyReady = useCopyFontsReady();
  const heroRef = useRef(null);
  const videoRef = useRef(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const showVideo = Boolean(video?.src) && !videoFailed;

  // Parallax: the page's scroll position over the hero's bottom edge (in
  // page coordinates, measured on resize), 0 at the top of the page and 1
  // once the hero has scrolled out. Window scroll rather than
  // useScroll({ target }), which measures against <html> and needs it
  // positioned.
  const heroBottom = useRef(1);
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return undefined;
    const measure = () => {
      heroBottom.current = Math.max(1, hero.getBoundingClientRect().bottom + window.scrollY);
    };
    measure();
    window.addEventListener("resize", measure);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(hero);
    return () => {
      window.removeEventListener("resize", measure);
      observer?.disconnect();
    };
  }, []);
  const { scrollY } = useScroll();
  const parallaxY = useTransform(
    scrollY,
    (y) => `${Math.min(Math.max(y / heroBottom.current, 0), 1) * PARALLAX_SHIFT}%`
  );

  // Autoplay is only allowed muted: keep the property set (as well as the
  // prop). With reduced motion the film stays paused on its poster.
  useEffect(() => {
    const film = videoRef.current;
    if (!film) return;
    film.muted = true;
    if (reduceMotion) film.pause();
  }, [showVideo, reduceMotion]);

  const toggleVideo = () => {
    const film = videoRef.current;
    if (!film) return;
    if (film.paused) {
      // A browser can still refuse to play; the button then keeps "Play".
      film.play()?.catch(() => {});
    } else {
      film.pause();
    }
  };

  const objectPosition = focalPoint ? { objectPosition: focalPoint } : undefined;

  return (
    <section ref={heroRef} className={styles.hero} aria-labelledby={TITLE_ID}>
      <motion.div
        className={styles.media}
        style={reduceMotion ? undefined : { y: parallaxY }}
        initial={reduceMotion ? false : { scale: MEDIA_SCALE_FROM }}
        animate={{ scale: 1 }}
        transition={{ duration: duration.reveal, ease: easeOut }}
      >
        <img
          className={styles.image}
          src={image.src}
          srcSet={image.srcSet}
          sizes={image.srcSet ? image.sizes || "100vw" : undefined}
          alt={image.alt}
          width={image.width}
          height={image.height}
          loading="eager"
          fetchpriority="high"
          decoding="async"
          onError={onImageError}
          style={objectPosition}
        />
        {showVideo && (
          <video
            ref={videoRef}
            className={styles.video}
            src={video.src}
            poster={video.poster || image.src}
            autoPlay={!reduceMotion}
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
            tabIndex={-1}
            style={objectPosition}
            onPlay={() => setVideoPlaying(true)}
            onPause={() => setVideoPlaying(false)}
            onError={() => setVideoFailed(true)}
          />
        )}
      </motion.div>

      <div className={`sf-container sf-container--wide ${styles.inner}`}>
        <motion.div
          className={copyReady ? styles.copy : `${styles.copy} ${styles.waiting}`}
          variants={copyVariants}
          initial={reduceMotion ? false : "hidden"}
          animate={reduceMotion || copyReady ? "shown" : "hidden"}
        >
          {eyebrow && (
            <motion.p className={`sf-eyebrow ${styles.eyebrow}`} variants={lineVariants}>
              {eyebrow}
            </motion.p>
          )}
          <motion.h1
            id={TITLE_ID}
            className={`sf-display-xl ${styles.title}`}
            variants={lineVariants}
          >
            {renderAccent(headline)}
          </motion.h1>
          {support && (
            <motion.p className={styles.support} variants={lineVariants}>
              {support}
            </motion.p>
          )}
          <motion.div className={styles.actions} variants={lineVariants}>
            <Link to={primaryCta.to} className={`sf-btn sf-btn--paper ${styles.cta}`}>
              {primaryCta.label}
            </Link>
            {secondaryCta && (
              <Link to={secondaryCta.to} className={`sf-btn sf-btn--paper-ghost ${styles.cta}`}>
                {secondaryCta.label}
              </Link>
            )}
          </motion.div>
        </motion.div>

        {showVideo && (
          <button
            type="button"
            className={`sf-btn sf-btn--paper sf-btn--icon ${styles.videoToggle}`}
            onClick={toggleVideo}
            aria-label={videoPlaying ? "Pause background video" : "Play background video"}
          >
            <span className="sf-btn__icon">{videoPlaying ? <PauseIcon /> : <PlayIcon />}</span>
          </button>
        )}
      </div>
    </section>
  );
};

export default HeroSection;
