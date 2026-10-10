import React from "react";
import { act, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import LazyPageBoundary, { PageFallback, isChunkLoadError } from "./LazyPage";

// Where a page fetched on its first visit waits (Prompt 32): a quiet,
// aria-busy skeleton while it loads; a retry inside the shell when its chunk
// cannot load; every other error passed on to the app's ErrorBoundary.

let navigate;
const NavigateProbe = () => {
  navigate = useNavigate();
  return null;
};

class Outer extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    return this.state.error ? <p>Outer caught: {this.state.error.message}</p> : this.props.children;
  }
}

const chunkError = () => {
  const error = new Error("Loading chunk page-checkout failed.\n(error: /static/js/page-checkout.chunk.js)");
  error.name = "ChunkLoadError";
  return error;
};

const Throws = ({ error }) => {
  throw error;
};

const renderInBoundary = (child) =>
  render(
    <MemoryRouter initialEntries={["/checkout"]}>
      <Outer>
        <LazyPageBoundary>{child}</LazyPageBoundary>
      </Outer>
      <NavigateProbe />
    </MemoryRouter>
  );

let consoleError;
beforeEach(() => {
  // React logs the errors the boundaries catch; the tests assert what shows.
  consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => consoleError.mockRestore());

/* eslint-disable testing-library/no-container, testing-library/no-node-access -- the skeleton blocks are hidden from assistive technology, so no query can reach them */
test("the fallback is a busy, page-shaped skeleton with a status for screen readers", () => {
  const { container } = render(<PageFallback />);
  const region = container.firstChild;
  expect(region).toHaveAttribute("aria-busy", "true");
  expect(screen.getByRole("status")).toHaveTextContent("Loading the page");
  const skeletons = container.querySelectorAll(".sf-skeleton");
  expect(skeletons.length).toBeGreaterThanOrEqual(6);
  skeletons.forEach((block) => expect(block.closest('[aria-hidden="true"]')).not.toBeNull());
});
/* eslint-enable testing-library/no-container, testing-library/no-node-access */

test("a page that is still loading shows the fallback, then the page", async () => {
  let resolve;
  const Page = React.lazy(
    () =>
      new Promise((done) => {
        resolve = () => done({ default: () => <h1>Checkout</h1> });
      })
  );
  renderInBoundary(<Page />);
  expect(screen.getByRole("status")).toHaveTextContent("Loading the page");
  await act(async () => resolve());
  expect(await screen.findByRole("heading", { name: "Checkout" })).toBeInTheDocument();
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

test("a chunk that cannot load shows a retry inside the shell", () => {
  const reload = jest.fn();
  const original = window.location;
  delete window.location;
  window.location = { ...original, reload };
  try {
    renderInBoundary(<Throws error={chunkError()} />);
    expect(screen.getByRole("alert")).toHaveTextContent("We couldn’t load this page.");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("We couldn’t load this page.");
    screen.getByRole("button", { name: "Try again" }).click();
    expect(reload).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Outer caught/)).not.toBeInTheDocument();
  } finally {
    window.location = original;
  }
});

test("any other error goes on to the app's error boundary, as before", () => {
  renderInBoundary(<Throws error={new Error("Something broke")} />);
  expect(screen.getByText("Outer caught: Something broke")).toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test("going to another page clears the failure", () => {
  const ByPath = () => {
    const { pathname } = useLocation();
    if (pathname === "/checkout") throw chunkError();
    return <p>Home</p>;
  };
  renderInBoundary(<ByPath />);
  expect(screen.getByRole("alert")).toBeInTheDocument();
  act(() => navigate("/"));
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.getByText("Home")).toBeInTheDocument();
});

test("isChunkLoadError knows webpack's script and stylesheet failures", () => {
  expect(isChunkLoadError(chunkError())).toBe(true);
  const css = new Error("Loading CSS chunk 123 failed.\n(/static/css/page-help.css)");
  css.code = "CSS_CHUNK_LOAD_FAILED";
  expect(isChunkLoadError(css)).toBe(true);
  expect(isChunkLoadError(new Error("Loading chunk page-help failed."))).toBe(true);
  expect(isChunkLoadError(new TypeError("x is undefined"))).toBe(false);
  expect(isChunkLoadError(null)).toBe(false);
});
