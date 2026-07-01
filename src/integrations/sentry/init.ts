import { useEffect } from "react";
import {
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from "react-router-dom";
import {
  init,
  reactRouterBrowserTracingIntegration,
  replayIntegration,
} from "@sentry/react";

const DEFAULT_TRACES_SAMPLE_RATE = 0.1;

const resolveTracesSampleRate = (): number => {
  const raw = import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE;
  if (raw === undefined || raw === "") return DEFAULT_TRACES_SAMPLE_RATE;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1
    ? parsed
    : DEFAULT_TRACES_SAMPLE_RATE;
};

const shouldInitializeSentry = (): boolean => {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!import.meta.env.PROD || !dsn) return false;

  const vercelEnv = import.meta.env.VERCEL_ENV;
  if (vercelEnv === "preview" || vercelEnv === "development") return false;

  return true;
};

export const initSentry = (): void => {
  if (!shouldInitializeSentry()) return;

  const dsn = import.meta.env.VITE_SENTRY_DSN;

  init({
    dsn,
    environment: import.meta.env.MODE,
    integrations: [
      reactRouterBrowserTracingIntegration({
        useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
      replayIntegration(),
    ],
    tracesSampleRate: resolveTracesSampleRate(),
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
  });
};
