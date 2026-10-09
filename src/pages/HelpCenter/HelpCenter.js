import React, { useId, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ContentPage from "../../components/ContentPage/ContentPage";
import ContactFacts from "../../components/ContentPage/ContactFacts";
import FAQ, { filterFaqs } from "../../components/FAQ/FAQ";
import { Reveal, staggerDelay } from "../../components/ui";
import { useDealsConfig } from "../../context/DealsConfigContext";
import { FAQ_ITEMS, HELP_TOPICS } from "../../utils/constants";
import styles from "./HelpCenter.module.css";

// =============================================================================
// /help — the Help centre (prompts/DESIGN_SYSTEM.md §38.5)
// =============================================================================
// The ContentPage header ("How can we help?") with a labelled search field,
// then the common questions (the FAQ accordion, filtered by the search) beside
// six hairline topic cards (below it up to 1023px), and a contact block with
// the store's hours, email, phone and WhatsApp. The search rule is the old
// page's: the query found in a question or its answer, case-insensitive.
// The Offers topic shows only while the Special Offers page is switched on
// (the header's and footer's rule), once the deals config has loaded.
// =============================================================================

const cx = (...names) => names.filter(Boolean).join(" ");

// The polite line under the search field: what the list now shows.
export const searchStatus = (query, count) => {
  const needle = String(query ?? "").trim();
  if (!needle) return "";
  if (count === 0) return `No questions match “${needle}”.`;
  return `${count} ${count === 1 ? "question matches" : "questions match"} “${needle}”.`;
};

const Arrow = () => (
  <svg className={styles.arrow} viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
    <path d="M2 8h11M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const HelpCenter = () => {
  const [query, setQuery] = useState("");
  const { enabled: dealsEnabled, loading: dealsLoading } = useDealsConfig();
  const searchId = useId();
  const statusId = `${searchId}-status`;

  const matches = useMemo(() => filterFaqs(FAQ_ITEMS, query).length, [query]);
  const topics = HELP_TOPICS.filter((topic) => !topic.requiresDeals || (dealsEnabled && !dealsLoading));

  const search = (
    <form
      role="search"
      aria-label="Help centre"
      className={styles.search}
      onSubmit={(event) => event.preventDefault()}
    >
      <div className="sf-field">
        <label className="sf-field__label" htmlFor={searchId}>
          Search the questions
        </label>
        <input
          id={searchId}
          className="sf-input"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Delivery, returns, GST…"
          autoComplete="off"
          enterKeyHint="search"
          aria-describedby={statusId}
        />
        <p id={statusId} className={cx("sf-field__hint", styles.status)} role="status">
          {searchStatus(query, matches)}
        </p>
      </div>
    </form>
  );

  return (
    <ContentPage
      width="default"
      crumb="Help centre"
      eyebrow="Help centre"
      title="How can we help?"
      intro="Answers about orders, delivery, payments and returns. If you can’t find what you need, we’re a message away."
      extra={search}
      contact={false}
    >
      <div className={styles.layout}>
        <Reveal as="section" className={styles.questions} aria-labelledby="help-questions-title">
          <h2 id="help-questions-title" className={cx("sf-display-sm", styles.sectionTitle)}>
            Common questions
          </h2>
          <FAQ
            items={FAQ_ITEMS}
            query={query}
            idPrefix="help-faq"
            emptyMessage={
              <>
                <p>Try another word, or ask us directly.</p>
                <p>
                  <Link to="/support" className="sf-btn sf-btn--link">
                    Send us your question
                  </Link>
                </p>
              </>
            }
          />
        </Reveal>

        <section className={styles.topics} aria-labelledby="help-topics-title">
          <h2 id="help-topics-title" className={cx("sf-display-sm", styles.sectionTitle)}>
            Browse by topic
          </h2>
          <ul className={styles.topicList}>
            {topics.map((topic, index) => (
              <Reveal as="li" key={topic.id} delay={staggerDelay(index)} className={styles.topicItem}>
                <Link to={topic.to} className={styles.topic}>
                  <span className={styles.topicTitle}>{topic.title}</span>
                  <span className={styles.topicLine}>{topic.description}</span>
                  <Arrow />
                </Link>
              </Reveal>
            ))}
          </ul>
        </section>
      </div>

      <Reveal as="section" className={styles.contactBlock} aria-labelledby="help-contact-title">
        <div className={styles.contactHead}>
          <h2 id="help-contact-title" className={cx("sf-display-sm", styles.sectionTitle)}>
            Still need help?
          </h2>
          <p className={styles.contactLine}>Send us a message, call, or write to us on WhatsApp.</p>
          <Link to="/support" className={cx("sf-btn sf-btn--primary", styles.contactCta)}>
            Send us a message
          </Link>
        </div>
        <ContactFacts layout="row" className={styles.contactFacts} />
      </Reveal>
    </ContentPage>
  );
};

export default HelpCenter;
