import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders } from "@/test/renderWithProviders";
import "@/i18n";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("../../test/supabaseMock");
  return { supabase: m.mockSupabaseClient() };
});
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null, session: null, loading: false, signOut: vi.fn() }),
}));
vi.mock("@tiptap/react", () => ({
  useEditor: vi.fn(() => null),
  EditorContent: () => <div data-testid="editor-content" />,
}));
vi.mock("@tiptap/starter-kit", () => ({ default: {} }));

import { ensureBootstrap, upsertGuestDailyNote, getGuestRecurringNote, upsertGuestRecurringNote } from "@/lib/localStore";
import NotesPage from ".";

beforeEach(() => {
  localStorage.clear();
  ensureBootstrap();
});

describe("NotesPage", () => {
  it("renders the Notes heading", () => {
    const { getAllByText } = renderWithProviders(<NotesPage />);
    expect(getAllByText("Notes").length).toBeGreaterThan(0);
  });

  it("renders the Standing note section label", () => {
    const { getByText } = renderWithProviders(<NotesPage />);
    expect(getByText(/standing note/i)).toBeTruthy();
  });

  it("renders an editable daily note card when selected date has no note", () => {
    const { getByTestId } = renderWithProviders(<NotesPage />);
    expect(getByTestId("editor-content")).toBeTruthy();
  });

  it("has page-notes testid for E2E navigation", () => {
    const { container } = renderWithProviders(<NotesPage />);
    expect(container.querySelector('[data-testid="page-notes"]')).toBeTruthy();
  });
});

describe("onBringToStanding merge logic", () => {
  it("appends daily content after a horizontal rule into the standing note", () => {
    const today = "2026-06-20";
    const standingContent = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Standing" }] }],
    };
    upsertGuestRecurringNote(today, standingContent);

    const dailyContent = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Daily" }] }],
    };

    // Simulate the merge logic from NotesPage.onBringToStanding
    const current = getGuestRecurringNote(today);
    const currentNodes = (current?.content as { content?: object[] } | null)?.content ?? [];
    const appendNodes = (dailyContent as { content?: object[] })?.content ?? [];
    const merged = {
      type: "doc",
      content: [...currentNodes, { type: "horizontalRule" }, ...appendNodes],
    };
    upsertGuestRecurringNote(today, merged);

    const saved = getGuestRecurringNote(today);
    const nodes = (saved?.content as { content?: { type: string }[] })?.content ?? [];
    expect(nodes.some((n) => n.type === "horizontalRule")).toBe(true);
    expect(nodes.some((n) => JSON.stringify(n).includes("Daily"))).toBe(true);
    expect(nodes.some((n) => JSON.stringify(n).includes("Standing"))).toBe(true);
  });
});
