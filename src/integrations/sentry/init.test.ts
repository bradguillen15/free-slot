import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockInit = vi.fn();
const mockRouterIntegration = vi.fn((_options?: unknown) => ({
  name: "router-tracing",
}));
const mockReplayIntegration = vi.fn((_options?: unknown) => ({
  name: "replay",
}));

vi.mock("@sentry/react", () => ({
  init: (options: unknown) => mockInit(options),
  reactRouterBrowserTracingIntegration: (options: unknown) =>
    mockRouterIntegration(options),
  replayIntegration: (options: unknown) => mockReplayIntegration(options),
}));

import { initSentry } from "./init";

const VALID_DSN = "https://examplePublicKey@o0.ingest.sentry.io/0";

describe("initSentry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not initialize outside production", () => {
    vi.stubEnv("PROD", false);
    vi.stubEnv("VITE_SENTRY_DSN", VALID_DSN);

    initSentry();

    expect(mockInit).not.toHaveBeenCalled();
  });

  it("does not initialize when the DSN is missing in production", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_SENTRY_DSN", "");

    initSentry();

    expect(mockInit).not.toHaveBeenCalled();
  });

  it("initializes once in production with a DSN using free-tier sampling", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("MODE", "production");
    vi.stubEnv("VITE_SENTRY_DSN", VALID_DSN);

    initSentry();

    expect(mockInit).toHaveBeenCalledTimes(1);
    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: VALID_DSN,
        environment: "production",
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 1.0,
      }),
    );
  });

  it("defaults the traces sample rate to 0.1 when unset", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_SENTRY_DSN", VALID_DSN);
    vi.stubEnv("VITE_SENTRY_TRACES_SAMPLE_RATE", "");

    initSentry();

    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({ tracesSampleRate: 0.1 }),
    );
  });

  it("reads the traces sample rate from the environment when provided", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_SENTRY_DSN", VALID_DSN);
    vi.stubEnv("VITE_SENTRY_TRACES_SAMPLE_RATE", "0.5");

    initSentry();

    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({ tracesSampleRate: 0.5 }),
    );
  });
});
