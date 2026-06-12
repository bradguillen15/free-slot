import { QueryClient } from "@tanstack/react-query";
import { isGuestQueryKey } from "./queryKeys";

export const defaultQueryClientOptions = {
  queries: {
    staleTime: 30_000,
    retry: 1,
    refetchOnWindowFocus: false,
  },
} as const;

let appQueryClient: QueryClient | null = null;
let guestBridgeCleanup: (() => void) | null = null;

export function createQueryClient(): QueryClient {
  const client = new QueryClient({ defaultOptions: defaultQueryClientOptions });
  appQueryClient = client;
  guestBridgeCleanup?.();
  guestBridgeCleanup = setupGuestQueryInvalidation(client);
  return client;
}

/** Shared app client (set in App.tsx via createQueryClient). */
export function getQueryClient(): QueryClient {
  if (!appQueryClient) {
    throw new Error("QueryClient not initialized — call createQueryClient() in App.tsx first");
  }
  return appQueryClient;
}

/** For tests — inject a client so mutation invalidation works in unit tests. */
export function setQueryClientForTests(client: QueryClient) {
  appQueryClient = client;
}

/** Fresh client per test — no guest bridge (add via setupGuestQueryInvalidation when needed). */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { ...defaultQueryClientOptions.queries, retry: false },
      mutations: { retry: false },
    },
  });
}

export function setupGuestQueryInvalidation(queryClient: QueryClient): () => void {
  if (typeof window === "undefined") return () => {};

  const invalidateGuest = () => {
    queryClient.invalidateQueries({
      predicate: (query) => isGuestQueryKey(query.queryKey),
    });
  };

  window.addEventListener("freeslot:guest-change", invalidateGuest);
  window.addEventListener("storage", invalidateGuest);

  return () => {
    window.removeEventListener("freeslot:guest-change", invalidateGuest);
    window.removeEventListener("storage", invalidateGuest);
  };
}
