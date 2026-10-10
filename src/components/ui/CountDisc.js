import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TOKENS } from "../../theme/tokens";

const { duration, easeInOut } = TOKENS.motion;

const countText = (count) => (count > 99 ? "99+" : String(count));

/**
 * CountDisc: the cart and wishlist count, an .sf-count disc. Nothing renders
 * at 0, and "99+" stands for anything above 99. A new figure fades in over
 * --sf-duration (an opacity change, never a pop); the first render draws the
 * disc as it is, so a page load does not animate it. Decorative: the button
 * it sits in says the count in its accessible name.
 *
 * count      number
 * className  extra class (the component's placement)
 */
const CountDisc = ({ count, className }) => {
  const [settled, setSettled] = useState(false);
  useEffect(() => setSettled(true), []);

  if (!(count > 0)) return null;
  const text = countText(count);

  return (
    <motion.span
      key={text}
      className={className ? `sf-count ${className}` : "sf-count"}
      aria-hidden="true"
      initial={settled ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={{ duration: duration.base, ease: easeInOut }}
    >
      {text}
    </motion.span>
  );
};

export default CountDisc;
