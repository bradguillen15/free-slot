import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const authState = vi.hoisted(() => ({
  user: null as { id: string } | null,
  loading: false,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: authState.user,
    session: null,
    loading: authState.loading,
    signOut: vi.fn(),
  }),
}));

import { ProtectedRoute } from "./ProtectedRoute";

function renderProtected() {
  return render(
    <MemoryRouter initialEntries={["/app/settings"]}>
      <ProtectedRoute>
        <div data-testid="gated-content">secret</div>
      </ProtectedRoute>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  it("shows the Forbidden page to guests instead of the gated content", () => {
    authState.user = null;
    authState.loading = false;

    renderProtected();

    expect(screen.getByTestId("forbidden-page")).toBeInTheDocument();
    expect(screen.queryByTestId("gated-content")).not.toBeInTheDocument();
  });

  it("renders the gated content for an authenticated user", () => {
    authState.user = { id: "user-1" };
    authState.loading = false;

    renderProtected();

    expect(screen.getByTestId("gated-content")).toBeInTheDocument();
    expect(screen.queryByTestId("forbidden-page")).not.toBeInTheDocument();
  });
});
