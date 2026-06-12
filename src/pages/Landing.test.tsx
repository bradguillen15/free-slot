import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@/i18n";
import Landing from "./Landing";

describe("Landing — viewport shell", () => {
  it("fits one viewport with internal scroll fallback", () => {
    const { container } = render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toMatch(/\bh-dvh\b/);
    expect(root.className).toMatch(/\bflex-col\b/);

    const hero = container.querySelector("section");
    expect(hero?.className).not.toMatch(/\bpt-20\b/);
    expect(hero?.className).not.toMatch(/\bpb-28\b/);

    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.className).not.toMatch(/\btext-7xl\b/);
  });
});
