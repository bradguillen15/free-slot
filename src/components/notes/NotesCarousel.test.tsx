import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import "@/i18n";

const mockUseDailyNote = vi.hoisted(() => vi.fn(() => ({ data: null })));
const mockMutate = vi.hoisted(() => vi.fn());

vi.mock("@tiptap/react", () => ({
  useEditor: vi.fn(() => null),
  EditorContent: () => <div data-testid="editor-content" />,
}));
vi.mock("@tiptap/starter-kit", () => ({ default: {} }));
vi.mock("@/lib/dataStore", () => ({
  useDailyNote: mockUseDailyNote,
  useUpsertDailyNote: () => ({ mutate: mockMutate }),
}));

import { NotesCarousel } from "./NotesCarousel";

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function renderCarousel(dates: string[], selectedISO = todayKey()) {
  return render(<NotesCarousel dates={dates} selectedISO={selectedISO} onSelectDate={vi.fn()} />);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseDailyNote.mockReturnValue({ data: null });
});

describe("NotesCarousel", () => {
  it("renders the date navigation carousel", () => {
    renderCarousel([]);
    expect(screen.getByTestId("notes-carousel")).toBeTruthy();
  });

  it("shows an editable daily note card when selected date has no note", () => {
    renderCarousel([]);
    expect(screen.getByTestId("editor-content")).toBeTruthy();
  });

  it("shows prev/next day navigation buttons", () => {
    renderCarousel([]);
    expect(screen.getByRole("button", { name: /previous day/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /next day/i })).toBeTruthy();
  });

  it("shows DailyNoteCard when today has a note", () => {
    const today = todayKey();
    mockUseDailyNote.mockReturnValue({ data: { date: today, content: { type: "doc", content: [] } } });
    renderCarousel([today], today);
    expect(screen.getByTestId("editor-content")).toBeTruthy();
  });
});
