import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { BrandLogo } from "./BrandLogo";

describe("BrandLogo", () => {
  it("renders an svg with the accessible app name", () => {
    const { container } = render(<BrandLogo />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("role", "img");
    expect(svg).toHaveAttribute("aria-label", "FreeSlot");
  });

  it("defaults to 32px and accepts a custom size", () => {
    const { container, rerender } = render(<BrandLogo />);
    const svg = () => container.querySelector("svg")!;
    expect(svg()).toHaveAttribute("width", "32");
    expect(svg()).toHaveAttribute("height", "32");
    rerender(<BrandLogo size={28} />);
    expect(svg()).toHaveAttribute("width", "28");
    expect(svg()).toHaveAttribute("height", "28");
  });

  it("forwards className to the svg element", () => {
    const { container } = render(<BrandLogo className="shadow-glow" />);
    expect(container.querySelector("svg")).toHaveClass("shadow-glow");
  });

  it("uses unique gradient ids so multiple instances can coexist", () => {
    const { container } = render(
      <>
        <BrandLogo />
        <BrandLogo />
      </>
    );
    const ids = Array.from(container.querySelectorAll("linearGradient")).map((g) => g.id);
    expect(ids).toHaveLength(4);
    expect(new Set(ids).size).toBe(4);
  });
});
