import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

type EditorMock = {
  getJSON: ReturnType<typeof vi.fn>;
  commands: { setContent: ReturnType<typeof vi.fn> };
  isActive: ReturnType<typeof vi.fn>;
  chain: ReturnType<typeof vi.fn>;
  _opts?: { onUpdate?: (arg: { editor: EditorMock }) => void };
};

vi.mock("@tiptap/react", () => {
  const editorInstance: EditorMock = {
    getJSON: vi.fn(() => ({ type: "doc", content: [] })),
    commands: { setContent: vi.fn() },
    isActive: vi.fn(() => false),
    chain: vi.fn(() => ({ focus: () => ({ toggleBold: () => ({ run: vi.fn() }) }) })),
  };
  return {
    useEditor: vi.fn((opts: EditorMock["_opts"]) => {
      editorInstance._opts = opts;
      return editorInstance;
    }),
    EditorContent: ({ editor }: { editor: EditorMock | null }) =>
      editor ? <div data-testid="editor-content" /> : null,
  };
});
vi.mock("@tiptap/starter-kit", () => ({ default: {} }));

vi.mock("@/lib/localStore", () => ({
  upsertGuestDailyNote: vi.fn(),
}));

import { DailyNoteCard } from "./DailyNoteCard";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DailyNoteCard", () => {
  const content = { type: "doc", content: [{ type: "paragraph" }] };

  it("renders the editor content", () => {
    render(<DailyNoteCard date="2026-06-20" initialContent={content} />);
    expect(screen.getByTestId("editor-content")).toBeTruthy();
  });

  it("shows the formatting toolbar", () => {
    render(<DailyNoteCard date="2026-06-20" initialContent={content} />);
    expect(screen.getByRole("button", { name: "Bold" })).toBeTruthy();
  });
});
