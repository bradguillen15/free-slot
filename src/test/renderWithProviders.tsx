import type { ReactElement, ReactNode } from "react";
import { render } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { createTestQueryClient } from "@/lib/queryClient";

type Options = {
  route?: string;
  queryClient?: ReturnType<typeof createTestQueryClient>;
};

/** Wrap component tests that consume dataStore hooks or React Router links. */
export function renderWithProviders(ui: ReactElement, options: Options = {}) {
  const queryClient = options.queryClient ?? createTestQueryClient();

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <MemoryRouter initialEntries={[options.route ?? "/"]}>{ui}</MemoryRouter>
        </TooltipProvider>
      </QueryClientProvider>,
    ),
  };
}

export function createHookWrapper(queryClient = createTestQueryClient()) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}
