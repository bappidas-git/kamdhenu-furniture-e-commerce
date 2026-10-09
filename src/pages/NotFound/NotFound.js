import React from "react";
import { Link } from "react-router-dom";
import ContentPage from "../../components/ContentPage/ContentPage";
import styles from "./NotFound.module.css";

// =============================================================================
// NotFound — any storefront URL no route matches (prompts/DESIGN_SYSTEM.md
// §38.8). Until Prompt 28 an unknown URL redirected silently to "/"; now it
// stays put inside the storefront shell (header, footer, bottom nav) and says
// so, with a way home and a way into the catalogue. It reads nothing and sets
// nothing else.
// =============================================================================

const NotFound = () => (
  <ContentPage
    crumb={null}
    eyebrow="Page not found"
    title="This page has moved or never existed."
    intro="The link may be out of date, or the address may have a typo. Start again from the home page, or browse the collection."
    contact={false}
  >
    <div className={styles.actions}>
      <Link to="/" className="sf-btn sf-btn--primary">
        Back to home
      </Link>
      <Link to="/products" className="sf-btn sf-btn--ghost">
        Browse furniture
      </Link>
    </div>
  </ContentPage>
);

export default NotFound;
