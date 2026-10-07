import React from "react";
import { MemoryRouter } from "react-router-dom";
import { act, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useReducedMotion } from "framer-motion";
import { HERO_HEADLINES, HERO_SUPPORT_LINES } from "../../content/brandContent";
import { PLACEHOLDER_IMG } from "../../utils/helpers";
import HeroSection from "./HeroSection";

jest.mock("framer-motion", () => ({
  ...jest.requireActual("framer-motion"),
  useReducedMotion: jest.fn(() => false),
}));

// Each test can swap the hero content; by default it is the real module.
const { HERO: REAL_HERO } = jest.requireActual("../../content/homeContent");
let mockHero = REAL_HERO;
jest.mock("../../content/homeContent", () => ({
  get HERO() {
    return mockHero;
  },
}));

const withMedia = (media) => ({ ...REAL_HERO, media: { ...REAL_HERO.media, ...media } });
const FILM = { src: "/media/hero-film.mp4", poster: "/media/hero-poster.jpg" };

// jsdom has no media playback: keep a playing flag and fire the events.
// (CRA resets mock implementations before every test, so the spies are set
// up in beforeEach.)
const pausedDescriptor = Object.getOwnPropertyDescriptor(window.HTMLMediaElement.prototype, "paused");
beforeAll(() => {
  Object.defineProperty(window.HTMLMediaElement.prototype, "paused", {
    configurable: true,
    get() {
      return !this.mockPlaying;
    },
  });
});
beforeEach(() => {
  jest.spyOn(window.HTMLMediaElement.prototype, "play").mockImplementation(function play() {
    this.mockPlaying = true;
    this.dispatchEvent(new Event("play"));
    return Promise.resolve();
  });
  jest.spyOn(window.HTMLMediaElement.prototype, "pause").mockImplementation(function pause() {
    this.mockPlaying = false;
    this.dispatchEvent(new Event("pause"));
  });
});
afterEach(() => {
  mockHero = REAL_HERO;
  useReducedMotion.mockReturnValue(false);
  jest.restoreAllMocks();
});
afterAll(() => {
  Object.defineProperty(window.HTMLMediaElement.prototype, "paused", pausedDescriptor);
});

const renderHero = () =>
  render(
    <MemoryRouter>
      <HeroSection />
    </MemoryRouter>
  );

const plain = (text) => text.replace(/\*/g, "");

test("the headline is the only h1, with the accent word in italic, and names the section", () => {
  renderHero();
  const h1 = screen.getByRole("heading", { level: 1 });
  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  // In reading order, without the *markers* (jsdom's name computation pads
  // the inline <em> with spaces, so compare the text itself).
  expect(h1.textContent).toBe(plain(HERO_HEADLINES[0]));
  expect(h1.querySelector("em")).toHaveTextContent("live");
  const region = screen.getByRole("region");
  expect(region).toHaveAttribute("aria-labelledby", h1.id);
  expect(region).toContainElement(h1);
});

test("shows the eyebrow and the support line from the content module", () => {
  renderHero();
  expect(screen.getByText(REAL_HERO.eyebrow)).toHaveClass("sf-eyebrow");
  expect(screen.getByText(HERO_SUPPORT_LINES[0])).toBeInTheDocument();
  expect(REAL_HERO.support).toBe(HERO_SUPPORT_LINES[0]);
});

test("both CTAs are router links, primary first", () => {
  renderHero();
  const links = screen.getAllByRole("link");
  expect(links.map((link) => link.textContent)).toEqual(["Shop the collection", "Our story"]);
  expect(links[0]).toHaveAttribute("href", "/products");
  expect(links[0]).toHaveClass("sf-btn", "sf-btn--paper");
  expect(links[1]).toHaveAttribute("href", "/about");
  expect(links[1]).toHaveClass("sf-btn", "sf-btn--paper-ghost");
});

test("leaves out the optional eyebrow and secondary CTA", () => {
  mockHero = { ...REAL_HERO, eyebrow: "", secondaryCta: null };
  renderHero();
  expect(screen.queryByText(REAL_HERO.eyebrow)).not.toBeInTheDocument();
  expect(screen.getAllByRole("link")).toHaveLength(1);
});

test("the photograph loads eagerly at high priority with its size reserved", () => {
  renderHero();
  const img = screen.getByRole("img", { name: REAL_HERO.media.image.alt });
  expect(img).toHaveAttribute("src", REAL_HERO.media.image.src);
  expect(img).toHaveAttribute("width", "2400");
  expect(img).toHaveAttribute("height", "1350");
  expect(img).toHaveAttribute("loading", "eager");
  expect(img).toHaveAttribute("fetchpriority", "high");
  expect(img).toHaveAttribute("decoding", "async");
  expect(img).not.toHaveAttribute("srcset");
  expect(img.style.objectPosition).toBe(REAL_HERO.media.focalPoint);
});

test("swapping the photograph is a content change", () => {
  mockHero = withMedia({
    image: { ...REAL_HERO.media.image, src: "/media/hero.jpg", srcSet: "/media/hero-1200.jpg 1200w, /media/hero.jpg 2400w" },
  });
  renderHero();
  const img = screen.getByRole("img", { name: REAL_HERO.media.image.alt });
  expect(img).toHaveAttribute("src", "/media/hero.jpg");
  expect(img).toHaveAttribute("srcset", "/media/hero-1200.jpg 1200w, /media/hero.jpg 2400w");
  expect(img).toHaveAttribute("sizes", "100vw");
});

test("a photograph that fails to load falls back to the placeholder", () => {
  renderHero();
  const img = screen.getByRole("img", { name: REAL_HERO.media.image.alt });
  fireEvent.error(img);
  expect(img).toHaveAttribute("src", PLACEHOLDER_IMG);
});

test("without a film there is no video and no play control", () => {
  const { container } = renderHero();
  expect(container.querySelector("video")).toBeNull();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

test("a film plays muted and looping over the photograph, with a pause control", () => {
  mockHero = withMedia({ video: FILM });
  const { container } = renderHero();
  const video = container.querySelector("video");
  expect(video).toHaveAttribute("src", FILM.src);
  expect(video).toHaveAttribute("poster", FILM.poster);
  expect(video).toHaveAttribute("autoplay");
  expect(video).toHaveAttribute("loop");
  expect(video).toHaveAttribute("playsinline");
  expect(video).toHaveAttribute("preload", "metadata");
  expect(video).toHaveAttribute("aria-hidden", "true");
  expect(video.muted).toBe(true);
  // The photograph stays underneath as the fallback.
  expect(screen.getByRole("img", { name: REAL_HERO.media.image.alt })).toBeInTheDocument();

  // Not playing yet (autoplay has not started): the control offers Play.
  const toggle = screen.getByRole("button", { name: "Play background video" });
  act(() => {
    video.play();
  });
  expect(toggle).toHaveAccessibleName("Pause background video");
  fireEvent.click(toggle);
  expect(window.HTMLMediaElement.prototype.pause).toHaveBeenCalledTimes(1);
  expect(toggle).toHaveAccessibleName("Play background video");
  fireEvent.click(toggle);
  expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2);
  expect(toggle).toHaveAccessibleName("Pause background video");
});

test("the poster defaults to the photograph", () => {
  mockHero = withMedia({ video: { src: FILM.src, poster: null } });
  const { container } = renderHero();
  expect(container.querySelector("video")).toHaveAttribute("poster", REAL_HERO.media.image.src);
});

test("a film that fails to load leaves the photograph", () => {
  mockHero = withMedia({ video: FILM });
  const { container } = renderHero();
  fireEvent.error(container.querySelector("video"));
  expect(container.querySelector("video")).toBeNull();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  expect(screen.getByRole("img", { name: REAL_HERO.media.image.alt })).toBeInTheDocument();
});

test("on mount the copy starts hidden and risen, and the media slightly enlarged", () => {
  const { container } = renderHero();
  const eyebrow = screen.getByText(REAL_HERO.eyebrow);
  expect(eyebrow.style.opacity).toBe("0");
  expect(eyebrow.style.transform).toContain("translateY(20px)");
  const media = container.querySelector("img").parentElement;
  expect(media.style.transform).toContain("scale(1.04)");
});

describe("waiting for the copy's web fonts", () => {
  const withFonts = (fonts) => {
    Object.defineProperty(document, "fonts", { configurable: true, value: fonts });
  };
  afterEach(() => {
    delete document.fonts;
    jest.useRealTimers();
  });

  const copyOf = () => screen.getByRole("heading", { level: 1 }).parentElement;

  test("keeps the copy hidden until the fonts load, then shows it", async () => {
    let loaded;
    const ready = new Promise((resolve) => {
      loaded = resolve;
    });
    const load = jest.fn(() => ready);
    withFonts({ check: () => false, load });
    renderHero();
    expect(copyOf()).toHaveClass("waiting");
    expect(load).toHaveBeenCalledWith(expect.stringContaining("Playfair Display"));
    expect(load).toHaveBeenCalledWith(expect.stringMatching(/^italic .*Playfair Display/));
    expect(load).toHaveBeenCalledWith(expect.stringContaining("Inter"));
    await act(async () => loaded([]));
    expect(copyOf()).not.toHaveClass("waiting");
  });

  test("shows the copy after at most a second when the fonts are slow", () => {
    jest.useFakeTimers();
    withFonts({ check: () => false, load: () => new Promise(() => {}) });
    renderHero();
    expect(copyOf()).toHaveClass("waiting");
    act(() => {
      jest.advanceTimersByTime(999);
    });
    expect(copyOf()).toHaveClass("waiting");
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(copyOf()).not.toHaveClass("waiting");
  });

  test("does not wait when the fonts are already loaded", () => {
    const load = jest.fn();
    withFonts({ check: () => true, load });
    renderHero();
    expect(copyOf()).not.toHaveClass("waiting");
    expect(load).not.toHaveBeenCalled();
  });
});

test("reduced motion: no entrance, no parallax, and the film does not autoplay", () => {
  useReducedMotion.mockReturnValue(true);
  mockHero = withMedia({ video: FILM });
  const { container } = renderHero();
  const eyebrow = screen.getByText(REAL_HERO.eyebrow);
  expect(eyebrow.style.opacity).not.toBe("0");
  expect(eyebrow.style.transform || "none").not.toContain("translateY(20px)");
  const media = container.querySelector("img").parentElement;
  expect(media.style.transform || "none").not.toContain("scale");
  const video = container.querySelector("video");
  expect(video).not.toHaveAttribute("autoplay");
  expect(window.HTMLMediaElement.prototype.pause).toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Play background video" })).toBeInTheDocument();
});
