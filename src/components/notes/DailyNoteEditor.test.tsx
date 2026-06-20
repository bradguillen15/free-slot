import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { DailyNoteEditor } from "./DailyNoteEditor";

type EditorMock = {
  getJSON: ReturnType<typeof vi.fn>;
  commands: { setContent: ReturnType<typeof vi.fn> };
  isEmpty: boolean;
  _opts?: { onUpdate?: (arg: { editor: EditorMock }) => void };
};

vi.mock("@tiptap/react", () => {
  const editorInstance: EditorMock = {
    getJSON: vi.fn(() => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "hello" }] }] })),
    commands: { setContent: vi.fn() },
    isEmpty: false,
  };
  return {
    useEditor: vi.fn((opts: EditorMock["_opts"]) => {
      editorInstance._opts = opts;
      return editorInstance;
    }),
    EditorContent: ({ editor }: { editor: EditorMock | null }) =>
      editor ? (
        <div
          data-testid="editor-content"
          onClick={() => editor._opts?.onUpdate?.({ editor })}
        />
      ) : null,
  };
});

vi.mock("@tiptap/starter-kit", () => ({ default: {} }));

describe("DailyNoteEditor", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders collapsed when initialContent is null", () => {
    render(<DailyNoteEditor date="2026-06-19" initialContent={null} onChange={vi.fn()} />);
    expect(screen.getByLabelText("Add a note for this day")).toBeTruthy();
    expect(screen.queryByTestId("editor-content")).toBeNull();
  });

  it("expands when the placeholder is clicked", () => {
    render(<DailyNoteEditor date="2026-06-19" initialContent={null} onChange={vi.fn()} />);
    fireEvent.click(screen.getByLabelText("Add a note for this day"));
    expect(screen.getByTestId("editor-content")).toBeTruthy();
  });

  it("calls onChange with Tiptap JSON after 300ms debounce", () => {
    const onChange = vi.fn();
    const content = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "hi" }] }] };
    render(<DailyNoteEditor date="2026-06-19" initialContent={content} onChange={onChange} />);
    fireEvent.click(screen.getByTestId("editor-content"));
    expect(onChange).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(300));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ type: "doc" }));
  });
});
