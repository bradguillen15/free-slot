// Guest-mode behavior of the redesigned labels editor: collapsible type columns,
// a hidden-labels section, and inline editing controls.
import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient, setQueryClientForTests } from "@/lib/queryClient";
import "@/i18n";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("../../test/supabaseMock");
  return { supabase: m.mockSupabaseClient() };
});
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null, session: null, loading: false, signOut: vi.fn() }),
}));

import { ensureBootstrap, listCategories } from "@/lib/localStore";
import { LabelsEditor } from "./LabelsEditor";

function renderEditor() {
  const queryClient = createTestQueryClient();
  setQueryClientForTests(queryClient);
  return render(
    <QueryClientProvider client={queryClient}>
      <LabelsEditor />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  ensureBootstrap();
  setQueryClientForTests(createTestQueryClient());
});

describe("LabelsEditor — guest mode", () => {
  it("renders the three type columns and the hidden section", async () => {
    renderEditor();
    await waitFor(() => expect(screen.getByTestId("label-column-productive")).toBeInTheDocument());
    expect(screen.getByTestId("label-column-essential")).toBeInTheDocument();
    expect(screen.getByTestId("label-column-unproductive")).toBeInTheDocument();
    expect(screen.getByTestId("labels-hidden-section")).toBeInTheDocument();
  });

  it("shows a productive default label inside the productive column", async () => {
    renderEditor();
    const deep = listCategories().find((c) => c.name === "Deep work")!;
    await waitFor(() => expect(screen.getByTestId(`label-row-${deep.id}`)).toBeInTheDocument());
    expect(screen.getByDisplayValue("Deep work")).toBeInTheDocument();
    // Its inline type select reflects the stored type.
    expect(within(screen.getByTestId(`label-type-${deep.id}`)).getByText("Productive")).toBeInTheDocument();
  });

  it("hides a label into the hidden section and restores it", async () => {
    const user = userEvent.setup();
    renderEditor();
    const deep = listCategories().find((c) => c.name === "Deep work")!;
    const row = await screen.findByTestId(`label-row-${deep.id}`);

    await user.click(within(row).getByRole("button", { name: /Hide/ }));

    await waitFor(() => expect(listCategories().find((c) => c.id === deep.id)?.hidden).toBe(true));
    expect(screen.queryByTestId(`label-row-${deep.id}`)).not.toBeInTheDocument();

    // The hidden section is collapsed by default — expand it to reveal disabled labels.
    await user.click(screen.getByTestId("labels-hidden-section"));
    await waitFor(() => expect(screen.getByTestId(`label-hidden-${deep.id}`)).toBeInTheDocument());

    await user.click(screen.getByTestId(`label-restore-${deep.id}`));

    await waitFor(() => expect(listCategories().find((c) => c.id === deep.id)?.hidden).toBe(false));
    await waitFor(() => expect(screen.getByTestId(`label-row-${deep.id}`)).toBeInTheDocument());
  });
});
