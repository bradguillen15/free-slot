import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import "@/i18n";
import { LabelFilter } from "./LabelFilter";

const categories = [
  { id: "c1", name: "Deep work", color: "#3b82f6" },
  { id: "c2", name: "Sleep", color: "#6366f1" },
];

function renderFilter(selectedIds: string[] = [], excludedIds: string[] = []) {
  const onChange = vi.fn();
  const onExcludedChange = vi.fn();
  render(
    <LabelFilter
      categories={categories}
      selectedIds={selectedIds}
      excludedIds={excludedIds}
      onChange={onChange}
      onExcludedChange={onExcludedChange}
    />
  );
  return { onChange, onExcludedChange };
}

describe("LabelFilter (three-state)", () => {
  it("neutral chip becomes included on click", () => {
    const { onChange, onExcludedChange } = renderFilter();
    fireEvent.click(screen.getByTestId("label-filter-c1"));
    expect(onChange).toHaveBeenCalledWith(["c1"]);
    expect(onExcludedChange).not.toHaveBeenCalled();
  });

  it("included chip becomes excluded on click", () => {
    const { onChange, onExcludedChange } = renderFilter(["c1"], []);
    fireEvent.click(screen.getByTestId("label-filter-c1"));
    expect(onChange).toHaveBeenCalledWith([]);
    expect(onExcludedChange).toHaveBeenCalledWith(["c1"]);
  });

  it("excluded chip returns to neutral on click", () => {
    const { onChange, onExcludedChange } = renderFilter([], ["c1"]);
    fireEvent.click(screen.getByTestId("label-filter-c1"));
    expect(onExcludedChange).toHaveBeenCalledWith([]);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("marks excluded chips via data-state", () => {
    renderFilter([], ["c2"]);
    expect(screen.getByTestId("label-filter-c2")).toHaveAttribute("data-state", "excluded");
    expect(screen.getByTestId("label-filter-c1")).toHaveAttribute("data-state", "neutral");
  });

  it("'All' resets both sets", () => {
    const { onChange, onExcludedChange } = renderFilter(["c1"], ["c2"]);
    fireEvent.click(screen.getByTestId("label-filter-all"));
    expect(onChange).toHaveBeenCalledWith([]);
    expect(onExcludedChange).toHaveBeenCalledWith([]);
  });
});
