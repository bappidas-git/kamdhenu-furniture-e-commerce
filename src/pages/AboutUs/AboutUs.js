import React from "react";
import { Link } from "react-router-dom";
import ContentPage from "../../components/ContentPage/ContentPage";
import { Reveal, renderAccent, staggerDelay } from "../../components/ui";
import {
  ABOUT_CLOSING,
  ABOUT_HEADLINE,
  ABOUT_INTRO,
  ABOUT_STORY,
  ABOUT_VALUES,
} from "../../content/brandContent";
import { onImageError } from "../../utils/helpers";
import styles from "./AboutUs.module.css";

// =============================================================================
// /about — Our story (prompts/DESIGN_SYSTEM.md §38.7)
// =============================================================================
// The ContentPage header (the eyebrow "Our story", ABOUT_HEADLINE, ABOUT_INTRO),
// two 4:5 image-and-text blocks (the second mirrored), the three values and a
// ghost "Browse the collection". All copy and media come from brandContent.js
// and state only what the client's own site states: no statistics, years in
// business or warranties.
// =============================================================================

const cx = (...names) => names.filter(Boolean).join(" ");

const StoryBlock = ({ story, mirrored }) => {
  const titleId = `about-${story.id}-title`;
  const paragraphs = Array.isArray(story.body) ? story.body : [story.body];
  return (
    <section className={cx(styles.story, mirrored && styles.mirrored)} aria-labelledby={titleId}>
      {story.image?.src && (
        <Reveal className={styles.media}>
          <img
            className={styles.image}
            src={story.image.src}
            alt={story.image.alt || ""}
            width={story.image.width}
            height={story.image.height}
            loading="lazy"
            decoding="async"
            onError={onImageError}
          />
        </Reveal>
      )}
      <Reveal className={styles.text} delay={staggerDelay(1)}>
        {story.eyebrow && <p className="sf-eyebrow sf-eyebrow--rule">{story.eyebrow}</p>}
        <h2 id={titleId} className={cx("sf-display-md", styles.storyTitle)}>
          {renderAccent(story.title)}
        </h2>
        {paragraphs.filter(Boolean).map((paragraph) => (
          <p key={paragraph} className={styles.body}>
            {paragraph}
          </p>
        ))}
      </Reveal>
    </section>
  );
};

const AboutUs = () => (
  <ContentPage
    width="default"
    crumb="Our story"
    eyebrow="Our story"
    title={ABOUT_HEADLINE}
    intro={ABOUT_INTRO}
  >
    {ABOUT_STORY.map((story, index) => (
      <StoryBlock key={story.id} story={story} mirrored={index % 2 === 1} />
    ))}

    <section className={styles.values} aria-labelledby="about-values-title">
      <Reveal className={styles.valuesHead}>
        <p className="sf-eyebrow sf-eyebrow--rule">{ABOUT_VALUES.eyebrow}</p>
        <h2 id="about-values-title" className={cx("sf-display-md", styles.valuesTitle)}>
          {renderAccent(ABOUT_VALUES.title)}
        </h2>
      </Reveal>
      <ul className={styles.valueList}>
        {ABOUT_VALUES.items.map((value, index) => (
          <Reveal as="li" key={value.id} delay={staggerDelay(index)} className={styles.value}>
            <h3 className={cx("sf-display-sm", styles.valueTitle)}>{value.title}</h3>
            <p className={styles.valueBody}>{value.body}</p>
          </Reveal>
        ))}
      </ul>
    </section>

    <Reveal className={styles.closing}>
      <p className={styles.closingLine}>{ABOUT_CLOSING.line}</p>
      <Link to={ABOUT_CLOSING.cta.to} className={cx("sf-btn sf-btn--ghost", styles.closingCta)}>
        {ABOUT_CLOSING.cta.label}
      </Link>
    </Reveal>
  </ContentPage>
);

export default AboutUs;
