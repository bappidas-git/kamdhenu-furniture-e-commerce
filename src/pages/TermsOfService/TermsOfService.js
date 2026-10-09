import React from "react";
import PolicyPage from "../../components/ContentPage/PolicyPage";
import { TERMS_OF_SERVICE } from "../../content/legalContent";

// /terms: the terms of service.
// Rendered from src/content/legalContent.js (a draft for legal review) in
// PolicyPage's layout (prompts/DESIGN_SYSTEM.md §38.3).
const TermsOfService = () => <PolicyPage document={TERMS_OF_SERVICE} />;

export default TermsOfService;
