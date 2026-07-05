import { describe, it, expect, vi } from "vitest";
import { cloneElement } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { isCategoryVisible, DEFAULT_VISIBLE_CAP } from "./ActivityTrendChart";

vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactElement }) =>
      cloneElement(children, { width: 800, height: 400 } as never),
  };
});

import { ActivityTrendChart } from "./ActivityTrendChart";
import type { CategoryMeta, TrendRow } from "@/pages/DashboardPage/useDashboardStats";

function makeCategories(n: number): CategoryMeta[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `c${i}`,
    name: `Cat ${i}`,
    color: "#333",
    totalMinutes: (n - i) * 10,
  }));
}

const trendData: TrendRow[] = [{ date: "2026-06-15", c0: 60 }];
const plannedData: TrendRow[] = [{ date: "2026-06-15", c0: 120 }];

describe("isCategoryVisible", () => {
  it("is visible by default within the top-N cap", () => {
    expect(isCategoryVisible(0, DEFAULT_VISIBLE_CAP, new Set(), new Set(), "c0")).toBe(true);
  });

  it("is hidden by default beyond the cap", () => {
    expect(isCategoryVisible(DEFAULT_VISIBLE_CAP, DEFAULT_VISIBLE_CAP, new Set(), new Set(), "c6")).toBe(false);
  });

  it("respects an explicit hide within the cap", () => {
    expect(isCategoryVisible(0, DEFAULT_VISIBLE_CAP, new Set(["c0"]), new Set(), "c0")).toBe(false);
  });

  it("respects an explicit show beyond the cap", () => {
    expect(isCategoryVisible(DEFAULT_VISIBLE_CAP, DEFAULT_VISIBLE_CAP, new Set(), new Set(["c6"]), "c6")).toBe(true);
  });
});

describe("ActivityTrendChart", () => {
  it("renders a legend entry for every category", () => {
    const categories = makeCategories(3);
    render(<ActivityTrendChart trendData={trendData} plannedData={plannedData} categories={categories} />);
    expect(screen.getByText("Cat 0")).toBeInTheDocument();
    expect(screen.getByText("Cat 1")).toBeInTheDocument();
    expect(screen.getByText("Cat 2")).toBeInTheDocument();
  });

  it("caps default visible lines at 6 when more categories exist", () => {
    const categories = makeCategories(8);
    render(<ActivityTrendChart trendData={trendData} plannedData={plannedData} categories={categories} />);
    const legend = screen.getByTestId("trend-legend");
    const buttons = legend.querySelectorAll("button");
    const pressed = [...buttons].filter((b) => b.getAttribute("aria-pressed") === "true");
    expect(pressed).toHaveLength(6);
  });

  it("clicking a visible legend entry hides it", () => {
    const categories = makeCategories(2);
    render(<ActivityTrendChart trendData={trendData} plannedData={plannedData} categories={categories} />);
    expect(screen.getByText("Cat 0").closest("button")).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByText("Cat 0").closest("button")!);
    expect(screen.getByText("Cat 0").closest("button")).toHaveAttribute("aria-pressed", "false");
  });

  it("clicking a hidden legend entry shows it again", () => {
    const categories = makeCategories(2);
    render(<ActivityTrendChart trendData={trendData} plannedData={plannedData} categories={categories} />);
    fireEvent.click(screen.getByText("Cat 0").closest("button")!);
    fireEvent.click(screen.getByText("Cat 0").closest("button")!);
    expect(screen.getByText("Cat 0").closest("button")).toHaveAttribute("aria-pressed", "true");
  });

  it("toggles the show-planned switch", () => {
    const categories = makeCategories(1);
    render(<ActivityTrendChart trendData={trendData} plannedData={plannedData} categories={categories} />);
    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });
});
