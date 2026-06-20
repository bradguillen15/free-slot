import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import "@/i18n";
import { RecurringNoteEditor } from "./RecurringNoteEditor";

type EditorMock = {
  getJSON: ReturnType<typeof vi.fn>;
  commands: { setContent: ReturnType<typeof vi.fn> };
  isEmpty: boolean;
  isActive: ReturnType<typeof vi.fn>;
  chain: ReturnType<typeof vi.fn>;
  _opts?: { onUpdate?: (arg: { editor: EditorMock }) => void };
};

vi.mock("@tiptap/react", () => {
  const editorInstance: EditorMock = {
    getJSON: vi.fn(() => ({ type: "doc", content: [] })),
    commands: { setContent: vi.fn() },
    isEmpty: true,
    isActive: vi.fn(() => false),
    chain: vi.fn(() => ({ focus: () => ({ toggleBold: () => ({ run: vi.fn() }) }) })),
  };
  return {
    useEditor: vi.fn((opts: EditorMock["_opts"]) => {
      editorInstance._opts = opts;
      return editorInstance;
    }),
    EditorContent: ({ editor }: { editor: EditorMock | null }) =>
      editor ? <div data-testid="recurring-editor-content" /> : null,
  };
});

vi.mock("@tiptap/starter-kit", () => ({ default: {} }));

describe("RecurringNoteEditor", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the editor", () => {
    render(
      <RecurringNoteEditor
        date="2026-06-20"
        initialContent={null}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByTestId("recurring-editor-content")).toBeTruthy();
  });

  it("shows carried-from label when carriedFrom prop is set", () => {
    render(
      <RecurringNoteEditor
        date="2026-06-20"
        initialContent={null}
        carriedFrom="2026-06-18"
        onChange={vi.fn()}
      />
    );
    expect(screen.getAllByText(/2026-06-18/).length).toBeGreaterThan(0);
  });

  it("renders the formatting toolbar", () => {
    render(
      <RecurringNoteEditor
        date="2026-06-20"
        initialContent={null}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "Bold" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Italic" })).toBeTruthy();
  });
});
