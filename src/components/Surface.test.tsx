import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Surface } from "./Surface";

describe("Surface", () => {
  it("defaults to solid elevation, 2xl radius, no padding", () => {
    const { container } = render(<Surface />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("bg-surface");
    expect(el.className).toContain("rounded-2xl");
    expect(el.className).not.toContain("p-3");
    expect(el.className).not.toContain("p-4");
    expect(el.className).not.toContain("p-6");
  });

  it("solid elevation applies bg-surface and border-border", () => {
    const { container } = render(<Surface elevation="solid" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("bg-surface");
    expect(el.className).toContain("border-border");
  });

  it("muted elevation applies bg-card/40 without backdrop-blur", () => {
    const { container } = render(<Surface elevation="muted" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("bg-card/40");
    expect(el.className).not.toContain("backdrop-blur");
  });

  it("glass elevation applies bg-card/40 and backdrop-blur-sm", () => {
    const { container } = render(<Surface elevation="glass" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("bg-card/40");
    expect(el.className).toContain("backdrop-blur-sm");
  });

  it("radius prop maps to rounded class", () => {
    expect((render(<Surface radius="lg" />).container.firstChild as HTMLElement).className).toContain("rounded-lg");
    expect((render(<Surface radius="xl" />).container.firstChild as HTMLElement).className).toContain("rounded-xl");
    expect((render(<Surface radius="2xl" />).container.firstChild as HTMLElement).className).toContain("rounded-2xl");
  });

  it("padding prop maps to tailwind p-* class", () => {
    expect((render(<Surface padding="sm" />).container.firstChild as HTMLElement).className).toContain("p-3");
    expect((render(<Surface padding="md" />).container.firstChild as HTMLElement).className).toContain("p-4");
    expect((render(<Surface padding="lg" />).container.firstChild as HTMLElement).className).toContain("p-6");
  });

  it("passes through className and html attributes", () => {
    const { container } = render(<Surface className="extra" data-testid="s" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("extra");
    expect(el.getAttribute("data-testid")).toBe("s");
  });

  it("renders children", () => {
    const { getByText } = render(<Surface>hello</Surface>);
    expect(getByText("hello")).toBeInTheDocument();
  });
});
