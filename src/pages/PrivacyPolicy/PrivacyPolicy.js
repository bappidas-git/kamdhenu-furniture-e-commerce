import React from "react";
import PolicyPage from "../../components/ContentPage/PolicyPage";
import { PRIVACY_POLICY } from "../../content/legalContent";

// /privacy: the privacy policy.
// Rendered from src/content/legalContent.js (a draft for legal review) in
// PolicyPage's layout (prompts/DESIGN_SYSTEM.md §38.3).
const PrivacyPolicy = () => <PolicyPage document={PRIVACY_POLICY} />;

export default PrivacyPolicy;
