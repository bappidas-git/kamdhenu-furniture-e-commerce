import React, { forwardRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { TOKENS } from "../../theme/tokens";

// The JS mirror of the motion tokens: --sf-duration-reveal (0.9s),
// --sf-ease-out, --sf-reveal-distance (20px) and --sf-stagger (90ms).
const { duration, easeOut, revealDistance, stagger } = TOKENS.motion;

// framer caches motion.<tag> itself; wrap a custom component only once.
const motionComponents = new WeakMap();
const toMotion = (as) => {
  if (typeof as === "string") return motion[as];
  if (!motionComponents.has(as)) motionComponents.set(as, motion(as));
  return motionComponents.get(as);
};

/**
 * Scroll reveal (DESIGN_SYSTEM.md, "Standard reveal recipe"): fades in with a
 * short rise once the element is 10% inside the viewport. With reduced motion
 * (the OS setting, also applied by <MotionConfig reducedMotion="user"> around
 * the storefront) it only fades: no transform.
 *
 * as        tag or component to render, default "div"
 * delay     seconds before the reveal starts (see staggerDelay)
 * distance  rise in px, default TOKENS.motion.revealDistance (20)
 * once      reveal the first time only, default true
 * className and any other prop (id, style, role, aria-*) pass through
 * onInView  called with the IntersectionObserverEntry when it enters the
 *           viewport (e.g. to start a lazy fetch)
 */
const Reveal = forwardRef(function Reveal(
  {
    as = "div",
    delay = 0,
    distance = revealDistance,
    once = true,
    className,
    onInView,
    children,
    ...rest
  },
  ref
) {
  const reduceMotion = useReducedMotion();
  const Component = toMotion(as);

  return (
    <Component
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: reduceMotion ? 0 : distance }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-10% 0px" }}
      transition={{ duration: duration.reveal, ease: easeOut, delay }}
      onViewportEnter={onInView}
      {...rest}
    >
      {children}
    </Component>
  );
});

/**
 * Delay (seconds) for item `index` of a group that reveals together: one
 * --sf-stagger step per item for the first `cap` items (8 by default); the
 * rest reveal without a delay.
 */
export const staggerDelay = (index, cap = 8) => (index < cap ? index * stagger : 0);

export default Reveal;
