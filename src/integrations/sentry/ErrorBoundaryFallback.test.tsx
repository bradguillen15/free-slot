import { render, screen } from "@testing-library/react";
import { ErrorBoundary } from "@sentry/react";
import { describe, expect, it, vi } from "vitest";
import { ErrorBoundaryFallback } from "./ErrorBoundaryFallback";

describe("ErrorBoundaryFallback", () => {
  it("renders the translated fallback with a reload action", () => {
    render(<ErrorBoundaryFallback />);

    expect(screen.getByTestId("error-boundary-fallback")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Reload page" }),
    ).toBeInTheDocument();
  });

  it("is shown by Sentry.ErrorBoundary when a child throws, without Sentry initialized", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const Boom = () => {
      throw new Error("render failure");
    };

    render(
      <ErrorBoundary fallback={<ErrorBoundaryFallback />}>
        <Boom />
      </ErrorBoundary>,
    );

    expect(screen.getByTestId("error-boundary-fallback")).toBeInTheDocument();

    consoleError.mockRestore();
  });
});
