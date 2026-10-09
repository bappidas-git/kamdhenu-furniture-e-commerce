import React from "react";
import PolicyPage from "../../components/ContentPage/PolicyPage";
import { REFUND_POLICY } from "../../content/legalContent";

// /refund: the returns and refunds policy.
// Rendered from src/content/legalContent.js (a draft for legal review) in
// PolicyPage's layout (prompts/DESIGN_SYSTEM.md §38.3).
const RefundPolicy = () => <PolicyPage document={REFUND_POLICY} />;

export default RefundPolicy;
