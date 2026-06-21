import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import "@/i18n";

const mockGetGuestDailyNote = vi.hoisted(() => vi.fn(() => null));

vi.mock("@tiptap/react", () => ({
  useEditor: vi.fn(() => null),
  EditorContent: () => <div data-testid="editor-content" />,
}));
vi.mock("@tiptap/starter-kit", () => ({ default: {} }));
vi.mock("@/lib/localStore", () => ({
  getGuestDailyNote: mockGetGuestDailyNote,
  upsertGuestDailyNote: vi.fn(),
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
  mockGetGuestDailyNote.mockReturnValue(null);
});

describe("NotesCarousel", () => {
  it("renders the date navigation carousel", () => {
    renderCarousel([]);
    expect(screen.getByTestId("notes-carousel")).toBeTruthy();
  });

  it("shows empty state when selected date has no note", () => {
    renderCarousel([]);
    expect(screen.getByTestId("notes-carousel-empty")).toBeTruthy();
    expect(screen.getByText(/no note for this day/i)).toBeTruthy();
  });

  it("shows prev/next day navigation buttons", () => {
    renderCarousel([]);
    expect(screen.getByRole("button", { name: /previous day/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /next day/i })).toBeTruthy();
  });

  it("shows DailyNoteCard when today has a note", () => {
    const today = todayKey();
    mockGetGuestDailyNote.mockReturnValue({ date: today, content: { type: "doc", content: [] } });
    renderCarousel([today], today);
    expect(screen.getByTestId("editor-content")).toBeTruthy();
  });
});
