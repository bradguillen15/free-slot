import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@/i18n";
import { toast } from "sonner";
import { SampleDataBanner } from "./SampleDataBanner";

const mockMutateAsync = vi.fn().mockResolvedValue(undefined);

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/dataStore", () => ({
  useClearExampleDataMutation: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
}));

describe("SampleDataBanner", () => {
  beforeEach(() => {
    mockMutateAsync.mockReset();
  });

  it("renders nothing when not visible", () => {
    render(<SampleDataBanner visible={false} />);
    expect(screen.queryByTestId("sample-data-banner")).not.toBeInTheDocument();
  });

  it("shows the banner when visible", () => {
    render(<SampleDataBanner visible={true} />);
    expect(screen.getByTestId("sample-data-banner")).toBeInTheDocument();
  });

  it("clears example data only after confirming", async () => {
    mockMutateAsync.mockResolvedValueOnce(undefined);
    render(<SampleDataBanner visible={true} />);
    fireEvent.click(screen.getByTestId("sample-data-clear-cta"));
    expect(mockMutateAsync).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("sample-data-confirm-clear"));
    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalled());
  });

  it("keeps the confirm dialog open and shows an error toast when clearing fails", async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error("network down"));
    render(<SampleDataBanner visible={true} />);
    fireEvent.click(screen.getByTestId("sample-data-clear-cta"));
    fireEvent.click(screen.getByTestId("sample-data-confirm-clear"));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("network down"));
    expect(screen.getByTestId("sample-data-confirm-clear")).toBeInTheDocument();
  });
});
