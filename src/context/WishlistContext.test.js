import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import apiService from "../services/api";
import { AuthProvider, useAuth } from "./AuthContext";
import { WishlistProvider, useWishlist } from "./WishlistContext";
import db from "../../db.json";

// WishlistContext's merge, against the real AuthProvider and an in-memory
// account list behind the stubbed API. On every sign-in, and on every reload
// with a session, it reads the account's list and uploads the pieces only the
// device holds. A piece is the device's own only while the server has never
// confirmed it (a local id: saved as a guest, or an upload that failed). A
// confirmed piece the account no longer has was removed elsewhere (on
// another device or tab, one by one or with Clear all), and must stay removed.
jest.mock("../services/api", () => ({
  __esModule: true,
  default: {
    auth: { login: jest.fn(), logout: jest.fn() },
    wishlist: { get: jest.fn(), add: jest.fn(), remove: jest.fn() },
  },
  getErrorMessage: (error) => error?.message,
}));
jest.mock("sweetalert2", () => ({ __esModule: true, default: { fire: jest.fn() } }));

const clone = (value) => JSON.parse(JSON.stringify(value));
const withoutPassword = ({ password: _password, ...user }) => user;
// The seeded customer has rows 1–3 (products 48, 31, 37); Jane has none.
const SHOPPER = withoutPassword(db.users[2]);
const JANE = withoutPassword(db.users[1]);
const product = (id) => clone(db.products.find((p) => p.id === id));

// What a heart saves on the device (WishlistContext's buildWishlistItem), with
// a local id: the server has never confirmed it.
let localIds = 0;
const savedRow = (p) => ({
  id: `local-test-${(localIds += 1)}`,
  productId: p.id,
  slug: p.slug || null,
  name: p.name,
  image: p.images?.[0] || p.image,
  price: p.price,
  variants: p.variants,
  stock: p.stock,
  addedAt: "2026-10-01T10:00:00.000Z",
});

// The account lists on the "server", and what a signed-in device keeps of its
// account's list: the rows as the last merge wrote them, server ids included.
let server;
const accountRows = (userId) => clone(server.filter((row) => row.userId === userId));
const deviceCopyOf = (userId) => accountRows(userId);

const deferred = () => {
  let resolve;
  const promise = new Promise((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

const latest = {};
const Probe = () => {
  latest.wishlist = useWishlist();
  latest.auth = useAuth();
  const { wishlistItems, isLoading } = latest.wishlist;
  return (
    <p data-testid="rows">
      {isLoading
        ? "loading"
        : wishlistItems.map((row) => `${row.productId}:${row.id}`).join(" ") || "none"}
    </p>
  );
};

const renderProviders = ({ user = null, deviceRows = null } = {}) => {
  if (user) {
    sessionStorage.setItem("user", JSON.stringify(user));
    sessionStorage.setItem("token", `mock-token-${user.id}`);
  }
  if (deviceRows) localStorage.setItem("wishlist", JSON.stringify(deviceRows));
  return render(
    <AuthProvider>
      <WishlistProvider>
        <Probe />
      </WishlistProvider>
    </AuthProvider>
  );
};

const shown = () => screen.getByTestId("rows").textContent;
const stored = () =>
  JSON.parse(localStorage.getItem("wishlist") || "[]").map((row) => `${row.productId}:${row.id}`);
const signInAs = async (user) => {
  apiService.auth.login.mockResolvedValue(user);
  await act(async () => {
    await latest.auth.login({ email: user.email, password: "secret" });
  });
};

let nextId;
beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  server = clone(db.wishlist);
  nextId = 1000;
  apiService.wishlist.get.mockImplementation((userId) => Promise.resolve(accountRows(userId)));
  apiService.wishlist.add.mockImplementation((row) => {
    const saved = { ...row, id: (nextId += 1) };
    server.push(saved);
    return Promise.resolve(clone(saved));
  });
  apiService.wishlist.remove.mockImplementation((id) => {
    server = server.filter((row) => row.id !== id);
    return Promise.resolve({});
  });
});

describe("the merge on a reload with a session", () => {
  test("a piece removed on another device stays removed", async () => {
    const deviceCopy = deviceCopyOf(SHOPPER.id);
    // Device B removes the Bentwood chair (row 3) while this device keeps its copy.
    server = server.filter((row) => row.id !== 3);
    renderProviders({ user: SHOPPER, deviceRows: deviceCopy });

    await waitFor(() => expect(shown()).toBe("48:1 31:2"));
    await waitFor(() => expect(stored()).toEqual(["48:1", "31:2"]));
    expect(apiService.wishlist.add).not.toHaveBeenCalled();
    expect(accountRows(SHOPPER.id).map((row) => row.id)).toEqual([1, 2]);
  });

  test("Clear all on another device: nothing comes back", async () => {
    const deviceCopy = deviceCopyOf(SHOPPER.id);
    server = server.filter((row) => row.userId !== SHOPPER.id);
    renderProviders({ user: SHOPPER, deviceRows: deviceCopy });

    await waitFor(() => expect(shown()).toBe("none"));
    await waitFor(() => expect(stored()).toEqual([]));
    expect(apiService.wishlist.add).not.toHaveBeenCalled();
    expect(accountRows(SHOPPER.id)).toEqual([]);
  });

  test("an upload that fails stays on the device with its local id, and is retried on the next load", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    apiService.wishlist.add.mockRejectedValueOnce(new Error("Network Error"));
    const view = renderProviders({
      user: SHOPPER,
      deviceRows: [...deviceCopyOf(SHOPPER.id), savedRow(product(9))],
    });

    await waitFor(() => expect(shown()).toMatch(/^48:1 31:2 37:3 9:local-test-\d+$/));
    expect(consoleError).toHaveBeenCalledWith("Error syncing wishlist item:", expect.any(Error));
    consoleError.mockRestore();
    await waitFor(() => expect(stored()).toHaveLength(4));
    view.unmount();

    renderProviders({ user: SHOPPER });
    await waitFor(() => expect(shown()).toBe("48:1 31:2 37:3 9:1001"));
    expect(apiService.wishlist.add).toHaveBeenCalledTimes(2);
    expect(accountRows(SHOPPER.id).map((row) => row.productId)).toEqual([48, 31, 37, 9]);
  });

  test("a piece saved while the account's list is being read stays, and is uploaded once", async () => {
    const read = deferred();
    apiService.wishlist.get.mockReturnValueOnce(read.promise);
    renderProviders({ user: SHOPPER, deviceRows: deviceCopyOf(SHOPPER.id) });
    expect(shown()).toBe("loading");

    // Saved (and confirmed: row 1001) before the read's answer arrives, which
    // the server gave before the save landed.
    const answer = accountRows(SHOPPER.id);
    const save = deferred();
    const post = apiService.wishlist.add.getMockImplementation();
    apiService.wishlist.add.mockImplementationOnce((row) => save.promise.then(() => post(row)));
    let saving;
    act(() => {
      saving = latest.wishlist.addToWishlist(product(4));
    });
    expect(shown()).toBe("loading");
    await act(async () => {
      save.resolve();
      await saving;
    });
    await act(async () => {
      read.resolve(answer);
    });

    await waitFor(() => expect(shown()).toBe("48:1 31:2 37:3 4:1001"));
    expect(apiService.wishlist.add).toHaveBeenCalledTimes(1);
    expect(accountRows(SHOPPER.id).map((row) => row.productId)).toEqual([48, 31, 37, 4]);
  });
});

describe("the merge on a sign-in", () => {
  test("pieces saved as a guest are uploaded to the account, which keeps its own", async () => {
    renderProviders({ deviceRows: [savedRow(product(4)), savedRow(product(9))] });
    await waitFor(() => expect(shown()).toMatch(/^4:local-test-\d+ 9:local-test-\d+$/));

    await signInAs(SHOPPER);

    await waitFor(() => expect(shown()).toBe("48:1 31:2 37:3 4:1001 9:1002"));
    const uploaded = apiService.wishlist.add.mock.calls.map(([row]) => [row.productId, row.userId]);
    expect(uploaded).toEqual([
      [4, SHOPPER.id],
      [9, SHOPPER.id],
    ]);
    apiService.wishlist.add.mock.calls.forEach(([row]) => expect(row).not.toHaveProperty("id"));
  });

  test("pieces confirmed on another account are not copied into the one signing in", async () => {
    // The customer's session ended without signing out (a session lasts as
    // long as its tab), so the device still holds that account's list.
    renderProviders({ deviceRows: [...deviceCopyOf(SHOPPER.id), savedRow(product(4))] });
    await waitFor(() => expect(shown()).toMatch(/^48:1 31:2 37:3 4:local-test-\d+$/));

    await signInAs(JANE);

    // Only the piece saved on the device itself joins Jane's list.
    await waitFor(() => expect(shown()).toBe("4:1001"));
    expect(apiService.wishlist.add).toHaveBeenCalledTimes(1);
    expect(accountRows(JANE.id).map((row) => row.productId)).toEqual([4]);
    expect(accountRows(SHOPPER.id).map((row) => row.id)).toEqual([1, 2, 3]);
  });
});
