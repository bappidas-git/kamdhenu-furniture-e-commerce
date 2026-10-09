import React from "react";
import PolicyPage from "../../components/ContentPage/PolicyPage";
import { COOKIE_POLICY } from "../../content/legalContent";

// /cookies: the cookie policy.
// Rendered from src/content/legalContent.js (a draft for legal review) in
// PolicyPage's layout (prompts/DESIGN_SYSTEM.md §38.3).
const CookiePolicy = () => <PolicyPage document={COOKIE_POLICY} />;

export default CookiePolicy;
