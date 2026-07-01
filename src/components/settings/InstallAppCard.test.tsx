import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@/i18n";
import { InstallAppCard } from "./InstallAppCard";

const pwaState = vi.hoisted(() => ({
  canInstall: false,
  isInstalled: false,
  isIos: false,
  install: vi.fn().mockResolvedValue("accepted"),
}));

vi.mock("@/hooks/usePwaInstall", () => ({
  usePwaInstall: () => pwaState,
}));

describe("InstallAppCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pwaState.canInstall = false;
    pwaState.isInstalled = false;
    pwaState.isIos = false;
    pwaState.install.mockResolvedValue("accepted");
  });

  it("shows installed copy in standalone mode", () => {
    pwaState.isInstalled = true;
    render(<InstallAppCard />);
    expect(screen.getByText("FreeSlot is installed on this device.")).toBeInTheDocument();
  });

  it("shows an install button when the browser exposes the install prompt", async () => {
    const user = userEvent.setup();
    pwaState.canInstall = true;
    render(<InstallAppCard />);

    const button = screen.getByTestId("install-app-button");
    expect(button).toHaveTextContent("Install FreeSlot");

    await user.click(button);
    expect(pwaState.install).toHaveBeenCalledTimes(1);
  });

  it("shows iOS manual instructions when on iOS without a deferred prompt", () => {
    pwaState.isIos = true;
    render(<InstallAppCard />);

    expect(screen.getByText(/Tap the Share button in Safari/)).toBeInTheDocument();
    expect(screen.getByText(/Add to Home Screen/)).toBeInTheDocument();
  });

  it("shows unsupported copy when install is unavailable and not iOS", () => {
    render(<InstallAppCard />);
    expect(screen.getByText(/Your browser does not support one-tap install/)).toBeInTheDocument();
  });
});
