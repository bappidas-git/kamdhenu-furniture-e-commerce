import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import {
  SOCIAL_LINKS,
  SUPPORT_ADDRESS,
  SUPPORT_EMAIL,
  SUPPORT_HOURS,
  SUPPORT_PHONE,
} from "../../utils/constants";
import ContactFacts, { telHref } from "./ContactFacts";

const terms = () => screen.getAllByRole("term").map((term) => term.textContent);

test("email, phone, WhatsApp and hours from constants; the address on request", () => {
  const { rerender } = render(<ContactFacts />);
  expect(terms()).toEqual(["Email", "Phone", "WhatsApp", "Hours"]);
  expect(screen.getByRole("link", { name: SUPPORT_EMAIL })).toHaveAttribute("href", `mailto:${SUPPORT_EMAIL}`);
  expect(screen.getByRole("link", { name: SUPPORT_PHONE })).toHaveAttribute("href", telHref(SUPPORT_PHONE));
  const whatsapp = screen.getByRole("link", { name: "Message us on WhatsApp (opens in a new tab)" });
  expect(whatsapp).toHaveAttribute("href", SOCIAL_LINKS.WHATSAPP);
  expect(whatsapp).toHaveAttribute("rel", "noopener noreferrer");
  expect(screen.getByText(SUPPORT_HOURS)).toBeInTheDocument();
  expect(screen.queryByText(SUPPORT_ADDRESS)).not.toBeInTheDocument();

  rerender(<ContactFacts address />);
  expect(terms()).toEqual(["Email", "Phone", "WhatsApp", "Hours", "Address"]);
  expect(screen.getByText(SUPPORT_ADDRESS)).toBeInTheDocument();
});

test("telHref keeps the digits and the plus sign (the header's tel: link)", () => {
  expect(telHref("+91 84729 18653")).toBe("tel:+918472918653");
  expect(telHref("(0361) 222-333")).toBe("tel:0361222333");
});

test("no WhatsApp row while SOCIAL_LINKS.WHATSAPP is empty", () => {
  jest.isolateModules(() => {
    jest.doMock("../../utils/constants", () => {
      const actual = jest.requireActual("../../utils/constants");
      return { ...actual, SOCIAL_LINKS: { ...actual.SOCIAL_LINKS, WHATSAPP: "" } };
    });
    const { default: IsolatedFacts } = require("./ContactFacts");
    render(<IsolatedFacts />);
  });
  expect(terms()).toEqual(["Email", "Phone", "Hours"]);
  expect(screen.queryByRole("link", { name: /WhatsApp/ })).not.toBeInTheDocument();
});
