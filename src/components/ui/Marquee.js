import React, { useCallback, useLayoutEffect, useRef, useState } from "react";
import styles from "./Marquee.module.css";

/**
 * Marquee: a slow ribbon of short phrases scrolling right to left, between
 * hairlines (48px, eyebrow type). Decorative: the moving track is aria-hidden
 * and repeats the phrases as often as the width needs, while screen readers
 * get them once as a plain list. Under prefers-reduced-motion that list is
 * what shows, centred and still.
 *
 * It pauses while the pointer rests on it and while its control has focus,
 * and the Pause/Play control stops it for good (WCAG 2.2.2 asks for a way to
 * pause moving content that runs longer than five seconds).
 *
 * items       string[]  the phrases; nothing renders without one
 * speed       seconds one pass through the phrases takes (default 60), so the
 *             pace is the same at every width
 * pauseLabel, playLabel  the control's accessible names
 * className   extra class on the root
 */
const PauseIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true" focusable="false">
    <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />
  </svg>
);

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true" focusable="false">
    <path d="M8 5.5v13l10.5-6.5z" />
  </svg>
);

const Marquee = ({
  items = [],
  speed = 60,
  pauseLabel = "Pause the moving text",
  playLabel = "Play the moving text",
  className,
}) => {
  const viewportRef = useRef(null);
  const setRef = useRef(null);
  // Copies of the phrase set in each half of the track: enough for one half
  // to cover the visible width, so the loop never shows a gap.
  const [copies, setCopies] = useState(2);
  const [paused, setPaused] = useState(false);

  const phrases = (Array.isArray(items) ? items : []).filter(
    (item) => typeof item === "string" && item.trim() !== ""
  );
  const seconds = Number(speed) > 0 ? Number(speed) : 60;
  const hasPhrases = phrases.length > 0;

  const measure = useCallback(() => {
    const viewport = viewportRef.current;
    const set = setRef.current;
    if (!viewport || !set) return;
    const setWidth = set.getBoundingClientRect().width;
    if (!(setWidth > 0)) return;
    const next = Math.max(1, Math.ceil(viewport.clientWidth / setWidth));
    setCopies((prev) => (prev === next ? prev : next));
  }, []);

  useLayoutEffect(() => {
    if (!hasPhrases) return undefined;
    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    // The viewport's width and the set's (it changes as the fonts arrive).
    const observer = new ResizeObserver(measure);
    if (viewportRef.current) observer.observe(viewportRef.current);
    if (setRef.current) observer.observe(setRef.current);
    return () => observer.disconnect();
  }, [measure, hasPhrases]);

  if (!hasPhrases) return null;

  const renderSet = (key, ref) => (
    <span key={key} ref={ref} className={styles.set}>
      {phrases.map((phrase, index) => (
        <span key={index} className={styles.phrase}>
          {phrase}
        </span>
      ))}
    </span>
  );
  const half = (name) => (
    <span className={styles.half}>
      {Array.from({ length: copies }, (_, index) =>
        renderSet(`${name}-${index}`, name === "a" && index === 0 ? setRef : undefined)
      )}
    </span>
  );
  const rootClass = [styles.marquee, paused && styles.paused, className].filter(Boolean).join(" ");

  return (
    <div className={rootClass}>
      <ul className={styles.list}>
        {phrases.map((phrase, index) => (
          <li key={index} className={styles.listItem}>
            {phrase}
          </li>
        ))}
      </ul>
      <div ref={viewportRef} className={styles.viewport} aria-hidden="true">
        <span className={styles.track} style={{ "--marquee-duration": `${seconds * copies}s` }}>
          {half("a")}
          {half("b")}
        </span>
      </div>
      <button
        type="button"
        className={`sf-btn sf-btn--icon ${styles.toggle}`}
        aria-label={paused ? playLabel : pauseLabel}
        onClick={() => setPaused((value) => !value)}
      >
        {paused ? <PlayIcon /> : <PauseIcon />}
      </button>
    </div>
  );
};

export default Marquee;
