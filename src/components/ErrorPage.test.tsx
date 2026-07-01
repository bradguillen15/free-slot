import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ErrorPage } from "./ErrorPage";

describe("ErrorPage", () => {
  it("renders the title, message, actions, and testId", () => {
    render(
      <ErrorPage
        testId="sample-error"
        title="Boom"
        message="It broke"
        actions={<button type="button">Retry</button>}
      />,
    );

    const container = screen.getByTestId("sample-error");
    expect(container).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Boom" })).toBeInTheDocument();
    expect(screen.getByText("It broke")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("exposes an alert role when requested", () => {
    render(<ErrorPage role="alert" title="Boom" message="It broke" />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("uses embedded layout without full-viewport height", () => {
    render(
      <ErrorPage
        layout="embedded"
        testId="embedded-error"
        title="Blocked"
        message="Sign in required"
      />,
    );

    const container = screen.getByTestId("embedded-error");
    expect(container).toHaveAttribute("data-layout", "embedded");
    expect(container.className).not.toContain("h-dvh");
  });
});
