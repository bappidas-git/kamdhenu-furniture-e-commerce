import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useReducedMotion } from "framer-motion";
import { HERO } from "../../content/homeContent";
import { HERO_HEADLINES, HERO_SUPPORT_LINES } from "../../content/brandContent";
import HeroSection from "./HeroSection";

jest.mock("framer-motion", () => ({
  ...jest.requireActual("framer-motion"),
  useReducedMotion: jest.fn(() => false),
}));

afterEach(() => useReducedMotion.mockReturnValue(false));

const renderHero = (content) =>
  render(
    <MemoryRouter>
      <HeroSection content={content} />
    </MemoryRouter>
  );

test("renders the content module: one h1 with the accent word, support line and CTAs", () => {
  renderHero();
  const h1 = screen.getByRole("heading", { level: 1 });
  expect(h1).toHaveTextContent("Seating for the way you live.");
  expect(h1.querySelector("em")).toHaveTextContent("live");
  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  expect(HERO.headline).toBe(HERO_HEADLINES[0]);
  expect(screen.getByText(HERO_SUPPORT_LINES[0])).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Shop the collection" })).toHaveAttribute("href", "/products");
  expect(screen.getByRole("link", { name: "Our story" })).toHaveAttribute("href", "/about");
});

test("renders a high-priority image with its intrinsic size and focal point", () => {
  renderHero();
  const img = screen.getByRole("img", { name: HERO.media.image.alt });
  expect(img).toHaveAttribute("src", HERO.media.image.src);
  expect(img).toHaveAttribute("width", "2400");
  expect(img).toHaveAttribute("height", "1350");
  expect(img).toHaveAttribute("loading", "eager");
  expect(img).toHaveAttribute("fetchpriority", "high");
  expect(img).toHaveAttribute("decoding", "async");
  expect(img.style.objectPosition).toBe("50% 60%");
  expect(document.querySelector("video")).toBeNull();
});

test("switches to a muted looping video when a source is set", () => {
  const content = {
    ...HERO,
    secondaryCta: undefined,
    media: { ...HERO.media, video: { src: "/hero.mp4", poster: "/poster.jpg" } },
  };
  const { container } = renderHero(content);
  const video = container.querySelector("video");
  expect(video).toHaveAttribute("poster", "/poster.jpg");
  expect(video).toHaveAttribute("preload", "metadata");
  expect(video.muted).toBe(true);
  expect(video.autoplay).toBe(true);
  expect(video.loop).toBe(true);
  expect(container.querySelector("source")).toHaveAttribute("src", "/hero.mp4");
  expect(screen.queryByRole("link", { name: "Our story" })).not.toBeInTheDocument();
});

test("with reduced motion the video does not autoplay and the text starts visible", () => {
  useReducedMotion.mockReturnValue(true);
  const content = { ...HERO, media: { ...HERO.media, video: { src: "/hero.mp4", poster: "/p.jpg" } } };
  const { container } = renderHero(content);
  expect(container.querySelector("video").autoplay).toBe(false);
  expect(screen.getByRole("heading", { level: 1 }).style.opacity).not.toBe("0");
});
