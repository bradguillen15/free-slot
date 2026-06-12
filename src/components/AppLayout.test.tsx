import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null, session: null, loading: false, signOut: vi.fn() }),
}));

import { AppLayout } from "./AppLayout";

describe("AppLayout — viewport shell", () => {
  it("uses a fixed h-dvh shell with a single internal scroll region", () => {
    const { container } = render(
      <MemoryRouter>
        <AppLayout>
          <div>Page content</div>
        </AppLayout>
      </MemoryRouter>
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toMatch(/\bh-dvh\b/);
    expect(root.className).toMatch(/\boverflow-hidden\b/);
    expect(root.className).not.toMatch(/\bmin-h-screen\b/);

    const scrollRegions = screen.getAllByTestId("app-scroll-region");
    expect(scrollRegions).toHaveLength(1);
    expect(scrollRegions[0].className).toMatch(/\boverflow-y-auto\b/);
  });
});
