import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { useEditor } from "@tiptap/react";
import { RichTextEditor } from "./RichTextEditor";

type EditorMock = {
  getJSON: ReturnType<typeof vi.fn>;
  commands: { setContent: ReturnType<typeof vi.fn> };
  isEmpty: boolean;
  isActive: ReturnType<typeof vi.fn>;
  chain: ReturnType<typeof vi.fn>;
  _opts?: {
    onUpdate?: (arg: { editor: EditorMock }) => void;
    editorProps?: { attributes?: { class?: string } };
  };
};

vi.mock("@tiptap/react", () => {
  const editorInstance: EditorMock = {
    getJSON: vi.fn(() => ({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "hello" }] }],
    })),
    commands: { setContent: vi.fn() },
    isEmpty: false,
    isActive: vi.fn(() => false),
    chain: vi.fn(() => ({
      focus: () => ({
        toggleBold: () => ({ run: vi.fn() }),
        toggleItalic: () => ({ run: vi.fn() }),
        toggleHeading: () => ({ run: vi.fn() }),
        toggleBulletList: () => ({ run: vi.fn() }),
        toggleOrderedList: () => ({ run: vi.fn() }),
      }),
    })),
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

describe("RichTextEditor", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("applies tiptap list styling classes on the ProseMirror root", () => {
    render(
      <RichTextEditor
        contentKey="2026-06-19"
        initialContent={null}
        onChange={vi.fn()}
      />
    );

    const call = vi.mocked(useEditor).mock.calls.at(-1)?.[0];
    const attrs = call?.editorProps?.attributes;
    const className = attrs && typeof attrs === "object" && "class" in attrs ? attrs.class : "";
    expect(className).toContain("tiptap");
    expect(className).toContain("text-sm");
  });

  it("calls onChange with Tiptap JSON after 300ms debounce", () => {
    const onChange = vi.fn();
    render(
      <RichTextEditor
        contentKey="2026-06-19"
        initialContent={null}
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByTestId("editor-content"));
    expect(onChange).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(300));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ type: "doc" }));
  });
});
