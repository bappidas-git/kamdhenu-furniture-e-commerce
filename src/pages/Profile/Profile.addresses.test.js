import React from "react";
import { MemoryRouter } from "react-router-dom";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import Swal from "sweetalert2";
import { useReducedMotion } from "framer-motion";
import apiService from "../../services/api";
import { AuthProvider } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import db from "../../../db.json";
import Profile from "./Profile";

// The Addresses section (prompts/DESIGN_SYSTEM.md §32) against the real
// AuthProvider: updateUser() is AuthContext's own, so a save goes through
// apiService.auth.updateUser with the whole array, and the cards follow the
// user it stores. Only the network, SweetAlert and the theme are stubbed.
jest.mock("../../services/api", () => ({
  __esModule: true,
  default: {
    auth: { login: jest.fn(), logout: jest.fn(), updateUser: jest.fn(), changePassword: jest.fn() },
    wallet: { getBalance: jest.fn(), getTransactions: jest.fn() },
  },
  getErrorMessage: (error) => error?.message,
}));
jest.mock("sweetalert2", () => ({ __esModule: true, default: { fire: jest.fn() } }));
jest.mock("../../context/ThemeContext", () => ({ useTheme: jest.fn() }));
jest.mock("framer-motion", () => ({
  ...jest.requireActual("framer-motion"),
  useReducedMotion: jest.fn(),
}));

// jsdom has no IntersectionObserver (Reveal uses one): everything is in view.
class MockIntersectionObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe(target) {
    this.callback([{ isIntersecting: true, target }], this);
  }
  unobserve() {}
  disconnect() {}
}

// The seeded accounts (without their passwords): John has one address, the
// default; Jane has none.
const { password: _password, ...USER } = db.users[0];
const { password: _janePassword, ...JANE } = db.users[1];
const HOME = USER.addresses[0];
const WORK = {
  id: "w2",
  label: "Work",
  firstName: "John",
  lastName: "Doe",
  phone: "+91 9123456789",
  addressLine1: "12 Park Avenue",
  addressLine2: "",
  city: "Pune",
  state: "Maharashtra",
  postalCode: "411001",
  country: "India",
  isDefault: false,
};
const OTHER = {
  id: "o3",
  label: "Other",
  firstName: "Jo",
  lastName: "Doe",
  phone: "9876501234",
  addressLine1: "7 Lake Road",
  addressLine2: "Near the temple",
  city: "Guwahati",
  state: "Assam",
  postalCode: "781001",
  country: "India",
  isDefault: false,
};
const withAddresses = (...addresses) => ({ ...USER, addresses });

// The keys Checkout, Orders and db.json read, and nothing else.
const ADDRESS_KEYS = [
  "addressLine1",
  "addressLine2",
  "city",
  "country",
  "firstName",
  "id",
  "isDefault",
  "label",
  "lastName",
  "phone",
  "postalCode",
  "state",
];

const renderAddresses = (user = USER) => {
  sessionStorage.setItem("user", JSON.stringify(user));
  sessionStorage.setItem("token", "mock-token-1");
  return render(
    <MemoryRouter initialEntries={["/profile?tab=addresses"]}>
      <AuthProvider>
        <main>
          <Profile />
        </main>
      </AuthProvider>
    </MemoryRouter>
  );
};

const region = () => screen.getByRole("region", { name: "Addresses" });
const cards = () => within(region()).queryAllByRole("listitem");
const cardWith = (text) => cards().find((card) => within(card).queryByText(text));
const form = () => screen.getByRole("form", { name: /^(Add an address|Edit address)$/ });
const queryForm = () => screen.queryByRole("form", { name: /^(Add an address|Edit address)$/ });
const field = (label) => within(form()).getByLabelText(label);
const fill = (label, value) => fireEvent.change(field(label), { target: { value } });
const radio = (name) => within(form()).getByRole("radio", { name });
const defaultBox = () => within(form()).getByRole("checkbox", { name: "Set as default address" });
const saveButton = () => within(form()).getByRole("button", { name: /^(Save address|Saving…)$/ });
const status = () => screen.getByRole("status");
const cardButton = (card, name) => within(card).getByRole("button", { name: new RegExp(`^${name} `) });
const sent = () => apiService.auth.updateUser.mock.calls[0][0].addresses;

// Click, and let the request it starts (if any) and the renders after it
// settle: act() returns once React has rendered and run the effects (focus
// moves in an effect).
const press = async (element) => {
  // eslint-disable-next-line testing-library/no-unnecessary-act
  await act(async () => {
    fireEvent.click(element);
  });
};

const fillNewAddress = (values = {}) => {
  const all = {
    "First name": "Asha",
    "Last name": "Rao",
    "Phone number": " 98765 01234 ",
    "Address line 1": "4 Hill View",
    "Address line 2 (optional)": "Opposite the park",
    City: "Shillong",
    State: "Meghalaya",
    "Postal code": "793001",
    ...values,
  };
  Object.entries(all).forEach(([label, value]) => fill(label, value));
};

beforeAll(() => {
  window.IntersectionObserver = MockIntersectionObserver;
});
afterAll(() => {
  delete window.IntersectionObserver;
});

// CRA resets every mock before each test (resetMocks): implementations here.
let scrollTo;
beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  useTheme.mockReturnValue({ isDarkMode: false });
  useReducedMotion.mockReturnValue(false);
  apiService.auth.updateUser.mockImplementation((updates) => Promise.resolve({ ...USER, ...updates }));
  apiService.wallet.getBalance.mockResolvedValue(0);
  apiService.wallet.getTransactions.mockResolvedValue([]);
  Swal.fire.mockResolvedValue({ isConfirmed: true });
  scrollTo = jest.spyOn(window, "scrollTo").mockImplementation(() => {});
});

afterEach(() => {
  scrollTo.mockRestore();
  document.documentElement.style.removeProperty("--sf-header-height");
});

// ── The section and the cards ───────────────────────────────────────────────

test("the heading row: the serif h2, the line about checkout, 'Add address' as a ghost button", () => {
  renderAddresses();
  const heading = within(region()).getByRole("heading", { level: 2, name: "Addresses" });
  expect(heading).toHaveClass("sf-display-sm");
  expect(within(region()).getByText("Your default address is selected for you at checkout.")).toBeInTheDocument();
  const add = within(region()).getByRole("button", { name: "Add address" });
  expect(add).toHaveClass("sf-btn", "sf-btn--ghost");
  expect(queryForm()).not.toBeInTheDocument();
});

test("a card: the label and an ink 'Default' badge in its heading, the name, the lines, the phone", () => {
  renderAddresses();
  expect(cards()).toHaveLength(1);
  const [card] = cards();
  expect(card).toHaveClass("sf-card", "sf-card--hairline", "addressCardDefault");
  const heading = within(card).getByRole("heading", { level: 3, name: "Home Default" });
  expect(within(heading).getByText("Default")).toHaveClass("sf-badge", "sf-badge--ink");
  expect(within(card).getByText("John Doe")).toBeInTheDocument();
  expect(within(card).getByText("123 Main Street, Apt 4B")).toBeInTheDocument();
  expect(within(card).getByText("Mumbai, Maharashtra 400001")).toBeInTheDocument();
  expect(within(card).getByText("India")).toBeInTheDocument();
  expect(within(card).getByText("+91 9876543210")).toBeInTheDocument();
  expect(within(card).getByText("Phone:")).toHaveClass("sf-visually-hidden");
});

test("the default card has no 'Set as default'; Edit and Delete carry the card's name", () => {
  renderAddresses();
  const [card] = cards();
  expect(within(card).queryByRole("button", { name: /^Set as default/ })).not.toBeInTheDocument();
  const edit = within(card).getByRole("button", { name: "Edit Home address at 123 Main Street" });
  expect(edit).toHaveClass("sf-btn", "sf-btn--link");
  const remove = within(card).getByRole("button", { name: "Delete Home address at 123 Main Street" });
  expect(remove).toHaveClass("sf-btn--link", "deleteAddress");
  expect(remove).toHaveAttribute("aria-haspopup", "dialog");
});

test("other cards: no badge, no bar, and 'Set as default' first", () => {
  renderAddresses(withAddresses(HOME, WORK));
  const work = cardWith("12 Park Avenue");
  expect(work).not.toHaveClass("addressCardDefault");
  expect(within(work).getByRole("heading", { level: 3, name: "Work" })).toBeInTheDocument();
  expect(within(work).queryByText("Default")).not.toBeInTheDocument();
  expect(within(work).getAllByRole("button").map((button) => button.textContent)).toEqual([
    "Set as default Work address at 12 Park Avenue",
    "Edit Work address at 12 Park Avenue",
    "Delete Work address at 12 Park Avenue",
  ]);
});

test("a legacy row (fullName, zipCode, no label) still shows its name and PIN", () => {
  renderAddresses(
    withAddresses({ id: 9, fullName: "Ravi Kumar Das", addressLine1: "2 Old Lane", city: "Jorhat", state: "Assam", zipCode: "785001", phone: "9876512345", isDefault: true })
  );
  const [card] = cards();
  expect(within(card).getByRole("heading", { level: 3, name: "Address Default" })).toBeInTheDocument();
  expect(within(card).getByText("Ravi Kumar Das")).toBeInTheDocument();
  expect(within(card).getByText("Jorhat, Assam 785001")).toBeInTheDocument();
  expect(within(card).getByRole("button", { name: "Edit Address at 2 Old Lane" })).toBeInTheDocument();
});

test("no address yet: a serif line, the fact, 'Add your first address'; no list and no 'Add address'", () => {
  renderAddresses(JANE);
  expect(within(region()).queryByRole("list")).not.toBeInTheDocument();
  expect(within(region()).queryByRole("button", { name: "Add address" })).not.toBeInTheDocument();
  expect(within(region()).getByText("No addresses yet.")).toHaveClass("sf-display-sm");
  expect(within(region()).getByText("Add an address to make checkout faster.")).toBeInTheDocument();
  expect(within(region()).getByRole("button", { name: "Add your first address" })).toHaveClass("sf-btn--primary");
});

// ── The form ─────────────────────────────────────────────────────────────────

test("'Add address' opens the sand form with focus on its heading; the button steps aside", async () => {
  renderAddresses();
  await press(within(region()).getByRole("button", { name: "Add address" }));
  expect(form()).toHaveClass("sf-panel");
  const heading = within(form()).getByRole("heading", { level: 3, name: "Add an address" });
  expect(heading).toHaveFocus();
  expect(within(region()).queryByRole("button", { name: "Add address" })).not.toBeInTheDocument();
  // The cards stay below the form.
  expect(cards()).toHaveLength(1);
});

test("an Edit far down the page brings the form's heading back under the sticky header", async () => {
  document.documentElement.style.setProperty("--sf-header-height", "64px");
  // The form opens above the window (the card was far down): its heading
  // starts 300px above the top.
  const rect = jest.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function box() {
    const top = this.id === "address-form-title" ? -300 : 0;
    return { top, bottom: top + 24, left: 0, right: 600, width: 600, height: 24 };
  });
  const scrollY = Object.getOwnPropertyDescriptor(window, "scrollY");
  Object.defineProperty(window, "scrollY", { configurable: true, value: 1500 });
  try {
    renderAddresses(withAddresses(HOME, WORK));
    await press(cardButton(cardWith("12 Park Avenue"), "Edit"));
    expect(within(form()).getByRole("heading", { level: 3, name: "Edit address" })).toHaveFocus();
    // 1500 - 300 - 64 (the header) - 16 (the gap)
    expect(scrollTo).toHaveBeenCalledWith({ top: 1120, behavior: "smooth" });
  } finally {
    Object.defineProperty(window, "scrollY", scrollY);
    rect.mockRestore();
  }
});

test("labelled fields with autocomplete, inputmode, hints and the read-only country", async () => {
  renderAddresses();
  await press(within(region()).getByRole("button", { name: "Add address" }));
  const expectations = [
    ["First name", { autocomplete: "given-name", type: "text" }, null, true],
    ["Last name", { autocomplete: "family-name", type: "text" }, null, true],
    ["Phone number", { autocomplete: "tel", type: "tel", inputmode: "tel" }, "10-digit mobile number", true],
    ["Address line 1", { autocomplete: "address-line1" }, "House or flat number, building and street", true],
    ["Address line 2 (optional)", { autocomplete: "address-line2" }, "Landmark or area", false],
    ["City", { autocomplete: "address-level2" }, null, true],
    ["State", { autocomplete: "address-level1" }, null, true],
    ["Postal code", { autocomplete: "postal-code", inputmode: "numeric" }, "6-digit PIN", true],
  ];
  expectations.forEach(([label, attributes, hint, required]) => {
    const input = field(label);
    Object.entries(attributes).forEach(([name, value]) => expect(input).toHaveAttribute(name, value));
    // No hint: an empty description.
    expect(input).toHaveAccessibleDescription(hint || "");
    expect(input.required).toBe(required);
    expect(input).toHaveValue("");
    expect(input).not.toHaveAttribute("aria-invalid");
  });
  const country = field("Country");
  expect(country).toHaveValue("India");
  expect(country).toHaveAttribute("readonly");
  expect(country).toHaveAttribute("autocomplete", "country-name");
  expect(country).toHaveAccessibleDescription("We deliver within India only");
  // No placeholders: labels and hints say it all.
  within(form()).getAllByRole("textbox").forEach((input) => expect(input).not.toHaveAttribute("placeholder"));
});

test("'Address type' is a radio group of chips: Home chosen, one chip in the tab order", async () => {
  renderAddresses();
  await press(within(region()).getByRole("button", { name: "Add address" }));
  const group = within(form()).getByRole("radiogroup", { name: "Address type" });
  const radios = within(group).getAllByRole("radio");
  expect(radios.map((r) => r.textContent)).toEqual(["Home", "Work", "Other"]);
  radios.forEach((r) => expect(r).toHaveClass("sf-chip"));
  expect(radio("Home")).toBeChecked();
  expect(radio("Home")).toHaveAttribute("aria-checked", "true");
  expect(radio("Work")).toHaveAttribute("aria-checked", "false");
  expect(radios.map((r) => r.getAttribute("tabindex"))).toEqual(["0", "-1", "-1"]);
  fireEvent.click(radio("Other"));
  expect(radio("Other")).toBeChecked();
  expect(radio("Home")).not.toBeChecked();
  expect(radios.map((r) => r.getAttribute("tabindex"))).toEqual(["-1", "-1", "0"]);
});

test("arrow keys move along the chips and choose (wrapping); Home and End jump to the ends", async () => {
  renderAddresses();
  await press(within(region()).getByRole("button", { name: "Add address" }));
  radio("Home").focus();
  fireEvent.keyDown(radio("Home"), { key: "ArrowRight" });
  expect(radio("Work")).toBeChecked();
  expect(radio("Work")).toHaveFocus();
  fireEvent.keyDown(radio("Work"), { key: "ArrowDown" });
  expect(radio("Other")).toBeChecked();
  fireEvent.keyDown(radio("Other"), { key: "ArrowRight" });
  expect(radio("Home")).toBeChecked();
  expect(radio("Home")).toHaveFocus();
  fireEvent.keyDown(radio("Home"), { key: "ArrowLeft" });
  expect(radio("Other")).toBeChecked();
  fireEvent.keyDown(radio("Other"), { key: "ArrowUp" });
  expect(radio("Work")).toBeChecked();
  fireEvent.keyDown(radio("Work"), { key: "Home" });
  expect(radio("Home")).toBeChecked();
  fireEvent.keyDown(radio("Home"), { key: "End" });
  expect(radio("Other")).toBeChecked();
  expect(radio("Other")).toHaveFocus();
  // Other keys do nothing.
  fireEvent.keyDown(radio("Other"), { key: "a" });
  expect(radio("Other")).toBeChecked();
});

test("the chosen chip is the label that is saved", async () => {
  renderAddresses();
  await press(within(region()).getByRole("button", { name: "Add address" }));
  fireEvent.click(radio("Work"));
  fillNewAddress();
  await press(saveButton());
  expect(sent()[1].label).toBe("Work");
});

test("a saved label that is none of the three: no chip chosen, the first one reachable, the label kept", async () => {
  renderAddresses(withAddresses({ ...HOME, label: "Office" }));
  await press(within(cards()[0]).getByRole("button", { name: "Edit Office address at 123 Main Street" }));
  const radios = within(form()).getAllByRole("radio");
  radios.forEach((r) => expect(r).not.toBeChecked());
  expect(radios.map((r) => r.getAttribute("tabindex"))).toEqual(["0", "-1", "-1"]);
  await press(saveButton());
  expect(sent()[0].label).toBe("Office");
});

test("a submit with nothing filled: a message on each required field, focus on the first, the toast, no save", async () => {
  renderAddresses();
  await press(within(region()).getByRole("button", { name: "Add address" }));
  fill("Address line 2 (optional)", "Kept as typed");
  await press(saveButton());
  const messages = {
    "First name": "Enter a first name",
    "Last name": "Enter a last name",
    "Phone number": "10-digit mobile number Enter a phone number",
    "Address line 1": "House or flat number, building and street Enter the house or flat number and street",
    City: "Enter a city",
    State: "Enter a state",
    "Postal code": "6-digit PIN Enter a 6-digit PIN",
  };
  Object.entries(messages).forEach(([label, description]) => {
    expect(field(label)).toHaveAttribute("aria-invalid", "true");
    expect(field(label)).toHaveAccessibleDescription(description);
  });
  expect(field("Address line 2 (optional)")).not.toHaveAttribute("aria-invalid");
  expect(field("Address line 2 (optional)")).toHaveValue("Kept as typed");
  expect(field("First name")).toHaveFocus();
  expect(status()).toHaveTextContent("Fill in the marked fields to save the address.");
  expect(apiService.auth.updateUser).not.toHaveBeenCalled();
  expect(form()).toBeInTheDocument();
});

test("an invalid phone, everything else filled: its message after the hint, focus on it, the phone toast", async () => {
  renderAddresses();
  await press(within(region()).getByRole("button", { name: "Add address" }));
  fillNewAddress({ "Phone number": "12345" });
  await press(saveButton());
  expect(field("Phone number")).toHaveAttribute("aria-invalid", "true");
  expect(field("Phone number")).toHaveAccessibleDescription("10-digit mobile number Enter a 10-digit mobile number");
  expect(field("Phone number")).toHaveFocus();
  expect(status()).toHaveTextContent("Enter a 10-digit mobile number to save the address.");
  expect(apiService.auth.updateUser).not.toHaveBeenCalled();
  // The values stay as typed.
  expect(field("Phone number")).toHaveValue("12345");
  expect(field("City")).toHaveValue("Shillong");
});

test("an empty phone is a required field like the rest (the phone rule, the phone toast)", async () => {
  renderAddresses();
  await press(within(region()).getByRole("button", { name: "Add address" }));
  fillNewAddress({ "Phone number": "   " });
  await press(saveButton());
  expect(field("Phone number")).toHaveAccessibleDescription("10-digit mobile number Enter a phone number");
  expect(status()).toHaveTextContent("Enter a 10-digit mobile number to save the address.");
  expect(apiService.auth.updateUser).not.toHaveBeenCalled();
});

test("several at once: focus goes to the first in form order; the toast is the first rule's", async () => {
  renderAddresses();
  await press(within(region()).getByRole("button", { name: "Add address" }));
  fillNewAddress({ "Phone number": "5555", City: " " });
  await press(saveButton());
  expect(field("Phone number")).toHaveAttribute("aria-invalid", "true");
  expect(field("City")).toHaveAttribute("aria-invalid", "true");
  expect(field("First name")).not.toHaveAttribute("aria-invalid");
  expect(field("Phone number")).toHaveFocus();
  expect(status()).toHaveTextContent("Fill in the marked fields to save the address.");
});

test("typing in a field clears its own message, and only its own", async () => {
  renderAddresses();
  await press(within(region()).getByRole("button", { name: "Add address" }));
  await press(saveButton());
  fill("City", "S");
  expect(field("City")).not.toHaveAttribute("aria-invalid");
  expect(within(form()).queryByText("Enter a city")).not.toBeInTheDocument();
  expect(field("State")).toHaveAttribute("aria-invalid", "true");
});

test("a failing field the sticky header covers is brought back under it, label first", async () => {
  document.documentElement.style.setProperty("--sf-header-height", "64px");
  renderAddresses();
  await press(within(region()).getByRole("button", { name: "Add address" }));
  // eslint-disable-next-line testing-library/no-node-access
  field("First name").closest(".sf-field").getBoundingClientRect = () => ({
    top: 20, bottom: 100, left: 0, right: 600, width: 600, height: 80,
  });
  const scrollY = Object.getOwnPropertyDescriptor(window, "scrollY");
  Object.defineProperty(window, "scrollY", { configurable: true, value: 900 });
  try {
    scrollTo.mockClear();
    await press(saveButton());
    expect(field("First name")).toHaveFocus();
    // 900 + 20 - 64 (the header) - 16 (the gap)
    expect(scrollTo).toHaveBeenCalledWith({ top: 840, behavior: "smooth" });
  } finally {
    Object.defineProperty(window, "scrollY", scrollY);
  }
});

test("a new address: the whole array through updateUser, a canonical row, the form closes, focus on 'Add address'", async () => {
  renderAddresses();
  await press(within(region()).getByRole("button", { name: "Add address" }));
  fillNewAddress({ "First name": "  Asha ", "Last name": " Rao  " });
  await press(saveButton());
  expect(apiService.auth.updateUser).toHaveBeenCalledTimes(1);
  // The whole array, and nothing else, as before.
  expect(apiService.auth.updateUser).toHaveBeenCalledWith({ addresses: expect.any(Array) });
  const addresses = sent();
  expect(addresses).toHaveLength(2);
  expect(addresses[0]).toEqual(HOME);
  expect(Object.keys(addresses[1]).sort()).toEqual(ADDRESS_KEYS);
  expect(addresses[1]).toEqual({
    id: expect.any(String),
    label: "Home",
    firstName: "Asha",
    lastName: "Rao",
    phone: "98765 01234",
    addressLine1: "4 Hill View",
    addressLine2: "Opposite the park",
    city: "Shillong",
    state: "Meghalaya",
    postalCode: "793001",
    country: "India",
    isDefault: false,
  });
  expect(status()).toHaveTextContent("Address saved.");
  expect(queryForm()).not.toBeInTheDocument();
  expect(cards()).toHaveLength(2);
  expect(within(cards()[1]).getByText("4 Hill View, Opposite the park")).toBeInTheDocument();
  await waitFor(() => expect(within(region()).getByRole("button", { name: "Add address" })).toHaveFocus());
  // The stored session follows (a reload keeps it).
  expect(JSON.parse(sessionStorage.getItem("user")).addresses).toHaveLength(2);
});

test("'Set as default address' on a new one makes it the only default", async () => {
  renderAddresses();
  await press(within(region()).getByRole("button", { name: "Add address" }));
  fillNewAddress();
  fireEvent.click(defaultBox());
  await press(saveButton());
  expect(sent().map((a) => a.isDefault)).toEqual([false, true]);
  expect(cardWith("4 Hill View, Opposite the park")).toHaveClass("addressCardDefault");
  expect(cardWith("123 Main Street, Apt 4B")).not.toHaveClass("addressCardDefault");
});

test("the first address: the box shows it will be the default (locked, with a hint), and it is", async () => {
  renderAddresses(JANE);
  await press(within(region()).getByRole("button", { name: "Add your first address" }));
  expect(within(form()).getByRole("heading", { level: 3, name: "Add an address" })).toHaveFocus();
  expect(within(region()).queryByText("No addresses yet.")).not.toBeInTheDocument();
  expect(defaultBox()).toBeChecked();
  expect(defaultBox()).toBeDisabled();
  expect(defaultBox()).toHaveAccessibleDescription("Your only address is always the default.");
  fillNewAddress();
  await press(saveButton());
  expect(sent()).toHaveLength(1);
  expect(sent()[0].isDefault).toBe(true);
  expect(status()).toHaveTextContent("Address saved.");
  // The empty state's button is gone with it: focus goes to "Add address".
  await waitFor(() => expect(within(region()).getByRole("button", { name: "Add address" })).toHaveFocus());
});

test("with a second address the box is free again, unticked", async () => {
  renderAddresses();
  await press(within(region()).getByRole("button", { name: "Add address" }));
  expect(defaultBox()).not.toBeChecked();
  expect(defaultBox()).toBeEnabled();
  expect(defaultBox()).not.toHaveAccessibleDescription();
});

test("Edit: the form filled in, focus on 'Edit address', the row replaced in place, focus back on Edit", async () => {
  renderAddresses(withAddresses(HOME, WORK));
  const work = cardWith("12 Park Avenue");
  await press(cardButton(work, "Edit"));
  expect(within(form()).getByRole("heading", { level: 3, name: "Edit address" })).toHaveFocus();
  expect(radio("Work")).toBeChecked();
  expect(field("First name")).toHaveValue("John");
  expect(field("Address line 1")).toHaveValue("12 Park Avenue");
  expect(field("Postal code")).toHaveValue("411001");
  expect(defaultBox()).not.toBeChecked();
  fill("City", "Pune City");
  await press(saveButton());
  expect(sent()).toEqual([HOME, { ...WORK, city: "Pune City" }]);
  expect(status()).toHaveTextContent("Address updated.");
  expect(queryForm()).not.toBeInTheDocument();
  await waitFor(() => expect(cardButton(cardWith("12 Park Avenue"), "Edit")).toHaveFocus());
});

test("Edit on a legacy row writes the canonical shape back (firstName / lastName / postalCode)", async () => {
  const legacy = { id: 9, label: "Home", fullName: "Ravi Kumar Das", phone: "9876512345", addressLine1: "2 Old Lane", city: "Jorhat", state: "Assam", zipCode: "785001", isDefault: true };
  renderAddresses(withAddresses(legacy));
  await press(cardButton(cards()[0], "Edit"));
  expect(field("First name")).toHaveValue("Ravi");
  expect(field("Last name")).toHaveValue("Kumar Das");
  expect(field("Postal code")).toHaveValue("785001");
  await press(saveButton());
  expect(sent()[0]).toMatchObject({ id: 9, firstName: "Ravi", lastName: "Kumar Das", postalCode: "785001", country: "India" });
});

test("editing the only address: the box is locked on, and it stays the default", async () => {
  renderAddresses();
  await press(cardButton(cards()[0], "Edit"));
  expect(defaultBox()).toBeChecked();
  expect(defaultBox()).toBeDisabled();
  await press(saveButton());
  expect(sent()).toEqual([HOME]);
});

test("unticking the default while editing it among two: the first row becomes the default (as before)", async () => {
  renderAddresses(withAddresses(WORK, { ...HOME, isDefault: true }));
  await press(cardButton(cardWith("123 Main Street, Apt 4B"), "Edit"));
  expect(defaultBox()).toBeChecked();
  fireEvent.click(defaultBox());
  await press(saveButton());
  expect(sent().map((a) => a.isDefault)).toEqual([true, false]);
});

test("Cancel closes the form unsaved and gives focus back to what opened it", async () => {
  renderAddresses(withAddresses(HOME, WORK));
  await press(within(region()).getByRole("button", { name: "Add address" }));
  fill("First name", "Unsaved");
  await press(within(form()).getByRole("button", { name: "Cancel" }));
  expect(queryForm()).not.toBeInTheDocument();
  expect(within(region()).getByRole("button", { name: "Add address" })).toHaveFocus();

  await press(cardButton(cardWith("12 Park Avenue"), "Edit"));
  await press(within(form()).getByRole("button", { name: "Cancel" }));
  expect(cardButton(cardWith("12 Park Avenue"), "Edit")).toHaveFocus();
  expect(apiService.auth.updateUser).not.toHaveBeenCalled();

  // A form opened again starts clean.
  await press(within(region()).getByRole("button", { name: "Add address" }));
  expect(field("First name")).toHaveValue("");
});

test("Cancel with no address: back to 'Add your first address'", async () => {
  renderAddresses(JANE);
  await press(within(region()).getByRole("button", { name: "Add your first address" }));
  await press(within(form()).getByRole("button", { name: "Cancel" }));
  expect(within(region()).getByRole("button", { name: "Add your first address" })).toHaveFocus();
});

test("messages go when the form closes or opens for another address", async () => {
  renderAddresses(withAddresses(HOME, WORK));
  await press(within(region()).getByRole("button", { name: "Add address" }));
  await press(saveButton());
  expect(field("City")).toHaveAttribute("aria-invalid", "true");
  await press(cardButton(cardWith("12 Park Avenue"), "Edit"));
  expect(within(form()).queryAllByText(/^Enter /)).toHaveLength(0);
  fill("City", "");
  await press(saveButton());
  expect(field("City")).toHaveAttribute("aria-invalid", "true");
  await press(within(form()).getByRole("button", { name: "Cancel" }));
  await press(within(region()).getByRole("button", { name: "Add address" }));
  expect(within(form()).queryAllByText(/^Enter /)).toHaveLength(0);
  expect(field("City")).not.toHaveAttribute("aria-invalid");
});

test("Enter in a field submits the form", async () => {
  renderAddresses();
  await press(within(region()).getByRole("button", { name: "Add address" }));
  fillNewAddress();
  // eslint-disable-next-line testing-library/no-unnecessary-act
  await act(async () => {
    fireEvent.submit(field("City").form);
  });
  expect(apiService.auth.updateUser).toHaveBeenCalledTimes(1);
});

test("while saving: 'Saving…', busy but focusable, further presses ignored, Cancel unavailable", async () => {
  let finish;
  apiService.auth.updateUser.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  renderAddresses();
  await press(within(region()).getByRole("button", { name: "Add address" }));
  fillNewAddress();
  const button = saveButton();
  button.focus();
  fireEvent.click(button);
  expect(button).toHaveTextContent("Saving…");
  expect(button).toHaveAttribute("aria-disabled", "true");
  expect(button).toHaveAttribute("data-busy", "true");
  expect(button).toBeEnabled();
  expect(button).toHaveFocus();
  fireEvent.click(button);
  expect(apiService.auth.updateUser).toHaveBeenCalledTimes(1);
  const cancel = within(form()).getByRole("button", { name: "Cancel" });
  expect(cancel).toHaveAttribute("aria-disabled", "true");
  fireEvent.click(cancel);
  expect(form()).toBeInTheDocument();
  // The cards' buttons wait too.
  expect(cardButton(cards()[0], "Edit")).toHaveAttribute("aria-disabled", "true");
  await act(async () => finish({}));
  expect(queryForm()).not.toBeInTheDocument();
});

test("a failed save says so and keeps the form as typed", async () => {
  apiService.auth.updateUser.mockRejectedValue(new Error("Network Error"));
  renderAddresses();
  await press(within(region()).getByRole("button", { name: "Add address" }));
  fillNewAddress();
  await press(saveButton());
  expect(status()).toHaveTextContent("We couldn’t save the address. Try again in a moment.");
  expect(field("City")).toHaveValue("Shillong");
  expect(saveButton()).toHaveTextContent("Save address");
  expect(cards()).toHaveLength(1);
});

// ── Delete ───────────────────────────────────────────────────────────────────

test("Delete asks first, with the danger primitive (no hex colour)", async () => {
  renderAddresses(withAddresses(HOME, WORK));
  await press(cardButton(cardWith("12 Park Avenue"), "Delete"));
  expect(Swal.fire).toHaveBeenCalledTimes(1);
  const options = Swal.fire.mock.calls[0][0];
  expect(options).toMatchObject({
    title: "Delete this address?",
    text: "This address will be removed from your account.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Delete",
    cancelButtonText: "Keep address",
    customClass: { confirmButton: "sf-btn sf-btn--danger" },
    // The page returns focus itself: SweetAlert's late return would land on
    // the Delete button React reuses for the next card.
    returnFocus: false,
  });
  expect(options).not.toHaveProperty("confirmButtonColor");
});

test("confirmed: the rest saved, the toast, focus on the card that took its place", async () => {
  renderAddresses(withAddresses(HOME, WORK, OTHER));
  await press(cardButton(cardWith("12 Park Avenue"), "Delete"));
  expect(sent()).toEqual([HOME, OTHER]);
  expect(status()).toHaveTextContent("Address deleted.");
  expect(cards()).toHaveLength(2);
  expect(cardWith("12 Park Avenue")).toBeUndefined();
  await waitFor(() =>
    expect(within(cardWith("7 Lake Road, Near the temple")).getByRole("heading", { level: 3, name: "Other" })).toHaveFocus()
  );
});

test("deleting the last card in the list moves focus to the one before it", async () => {
  renderAddresses(withAddresses(HOME, WORK));
  await press(cardButton(cardWith("12 Park Avenue"), "Delete"));
  await waitFor(() =>
    expect(within(cardWith("123 Main Street, Apt 4B")).getByRole("heading", { level: 3 })).toHaveFocus()
  );
});

test("deleting the default promotes the next one", async () => {
  renderAddresses(withAddresses(HOME, WORK, OTHER));
  await press(cardButton(cardWith("123 Main Street, Apt 4B"), "Delete"));
  expect(sent()).toEqual([{ ...WORK, isDefault: true }, OTHER]);
  expect(cardWith("12 Park Avenue")).toHaveClass("addressCardDefault");
  await waitFor(() =>
    expect(within(cardWith("12 Park Avenue")).getByRole("heading", { level: 3, name: "Work Default" })).toHaveFocus()
  );
});

test("'Keep' leaves everything as it was, with focus back on that Delete", async () => {
  Swal.fire.mockResolvedValue({ isConfirmed: false, isDismissed: true });
  renderAddresses(withAddresses(HOME, WORK));
  await press(cardButton(cardWith("12 Park Avenue"), "Delete"));
  expect(apiService.auth.updateUser).not.toHaveBeenCalled();
  expect(cards()).toHaveLength(2);
  await waitFor(() => expect(cardButton(cardWith("12 Park Avenue"), "Delete")).toHaveFocus());
});

test("deleting the last address: the empty state, with focus on its line", async () => {
  renderAddresses();
  await press(cardButton(cards()[0], "Delete"));
  expect(sent()).toEqual([]);
  expect(within(region()).queryByRole("list")).not.toBeInTheDocument();
  await waitFor(() => expect(within(region()).getByText("No addresses yet.")).toHaveFocus());
});

test("deleting the address being edited closes its form", async () => {
  renderAddresses(withAddresses(HOME, WORK));
  await press(cardButton(cardWith("12 Park Avenue"), "Edit"));
  await press(cardButton(cardWith("12 Park Avenue"), "Delete"));
  expect(queryForm()).not.toBeInTheDocument();
});

test("deleting an earlier address while a later one is being edited: the save still replaces the right row", async () => {
  renderAddresses(withAddresses(HOME, WORK, OTHER));
  await press(cardButton(cardWith("7 Lake Road, Near the temple"), "Edit"));
  fill("City", "Dispur");
  await press(cardButton(cardWith("12 Park Avenue"), "Delete"));
  expect(within(form()).getByRole("heading", { name: "Edit address" })).toBeInTheDocument();
  expect(field("City")).toHaveValue("Dispur");
  apiService.auth.updateUser.mockClear();
  await press(saveButton());
  expect(sent()).toEqual([HOME, { ...OTHER, city: "Dispur" }]);
  expect(cards()).toHaveLength(2);
});

test("a failed delete says so, keeps the card, and gives focus back to its Delete", async () => {
  apiService.auth.updateUser.mockRejectedValue(new Error("Network Error"));
  renderAddresses(withAddresses(HOME, WORK));
  await press(cardButton(cardWith("12 Park Avenue"), "Delete"));
  expect(status()).toHaveTextContent("We couldn’t delete the address. Try again in a moment.");
  expect(cards()).toHaveLength(2);
  await waitFor(() => expect(cardButton(cardWith("12 Park Avenue"), "Delete")).toHaveFocus());
});

// ── Set as default ───────────────────────────────────────────────────────────

test("'Set as default': one default, saved whole; the button goes and focus moves to the card's heading", async () => {
  renderAddresses(withAddresses(HOME, WORK, OTHER));
  await press(cardButton(cardWith("7 Lake Road, Near the temple"), "Set as default"));
  expect(sent()).toEqual([
    { ...HOME, isDefault: false },
    WORK,
    { ...OTHER, isDefault: true },
  ]);
  expect(status()).toHaveTextContent("Default address updated.");
  const other = cardWith("7 Lake Road, Near the temple");
  expect(other).toHaveClass("addressCardDefault");
  expect(within(other).queryByRole("button", { name: /^Set as default/ })).not.toBeInTheDocument();
  expect(cardButton(cardWith("123 Main Street, Apt 4B"), "Set as default")).toBeInTheDocument();
  await waitFor(() => expect(within(other).getByRole("heading", { level: 3, name: "Other Default" })).toHaveFocus());
});

test("a failed 'Set as default' says so and changes nothing", async () => {
  apiService.auth.updateUser.mockRejectedValue(new Error("Network Error"));
  renderAddresses(withAddresses(HOME, WORK));
  await press(cardButton(cardWith("12 Park Avenue"), "Set as default"));
  expect(status()).toHaveTextContent("We couldn’t change your default address. Try again in a moment.");
  expect(cardWith("123 Main Street, Apt 4B")).toHaveClass("addressCardDefault");
  expect(cardWith("12 Park Avenue")).not.toHaveClass("addressCardDefault");
});

test("while one card's request runs, the others' buttons wait", async () => {
  let finish;
  apiService.auth.updateUser.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  renderAddresses(withAddresses(HOME, WORK, OTHER));
  fireEvent.click(cardButton(cardWith("12 Park Avenue"), "Set as default"));
  const home = cardWith("123 Main Street, Apt 4B");
  expect(cardButton(home, "Delete")).toHaveAttribute("aria-disabled", "true");
  fireEvent.click(cardButton(home, "Delete"));
  fireEvent.click(cardButton(home, "Edit"));
  fireEvent.click(cardButton(cardWith("7 Lake Road, Near the temple"), "Set as default"));
  expect(Swal.fire).not.toHaveBeenCalled();
  expect(queryForm()).not.toBeInTheDocument();
  await act(async () => finish({}));
  expect(apiService.auth.updateUser).toHaveBeenCalledTimes(1);
  expect(cardButton(cardWith("123 Main Street, Apt 4B"), "Delete")).not.toHaveAttribute("aria-disabled");
});
