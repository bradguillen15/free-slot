import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatCard } from "./StatCard";

describe("StatCard", () => {
  it("renders label and value", () => {
    render(<StatCard label="Productive" value="2h 30m" />);
    expect(screen.getByText("Productive")).toBeInTheDocument();
    expect(screen.getByText("2h 30m")).toBeInTheDocument();
  });

  it("applies ring class from tone", () => {
    const { container } = render(<StatCard label="L" value="V" tone="primary" />);
    expect((container.firstChild as HTMLElement).className).toContain("ring-primary");
  });

  it("defaults to muted tone ring", () => {
    const { container } = render(<StatCard label="L" value="V" />);
    expect((container.firstChild as HTMLElement).className).toContain("ring-border");
  });

  it("renders icon badge when icon is provided", () => {
    const { container } = render(<StatCard label="L" value="V" tone="accent" icon={<span data-testid="ico" />} />);
    expect(container.querySelector("[data-testid='ico']")).toBeInTheDocument();
  });

  it("does not render icon badge when icon is omitted", () => {
    const { container } = render(<StatCard label="L" value="V" />);
    expect(container.querySelector("[data-testid='ico']")).not.toBeInTheDocument();
  });

  it("passes through className", () => {
    const { container } = render(<StatCard label="L" value="V" className="extra" />);
    expect((container.firstChild as HTMLElement).className).toContain("extra");
  });
});
