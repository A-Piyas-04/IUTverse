import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ModerationPage } from "./ModerationPage";
import { apiPage, apiRequest } from "@/lib/api";

vi.mock("@/lib/api", async importOriginal => {
  const original = await importOriginal<typeof import("@/lib/api")>();
  return { ...original, apiPage: vi.fn(), apiRequest: vi.fn() };
});
vi.mock("@/components/shell/AppShell", () => ({
  PageFrame: ({ tabs, children }: { tabs?: React.ReactNode; children: React.ReactNode }) => <div>{tabs}{children}</div>,
}));

const report = { id: 7, entityKind: "job", entityId: 3, reason: "spam", status: "pending" };
const renderPage = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><ModerationPage /></QueryClientProvider>);

describe("moderation decisions", () => {
  beforeEach(() => {
    vi.mocked(apiPage).mockReset();
    vi.mocked(apiRequest).mockReset();
    vi.mocked(apiPage).mockResolvedValue({ success: true, data: [report], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } } as never);
    vi.mocked(apiRequest).mockResolvedValue({ success: true, data: {} });
  });

  it("labels the status filter group", async () => {
    renderPage();
    expect(screen.getByRole("group", { name: "Report status" })).toBeInTheDocument();
  });

  it("asks for confirmation before archiving and sends only the decision", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: "Archive" }));

    expect(screen.getByRole("dialog", { name: "Archive this content?" })).toBeInTheDocument();
    expect(apiRequest).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(apiRequest).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Archive" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Archive" }));

    await waitFor(() => expect(apiRequest).toHaveBeenCalledTimes(1));
    const [path, init] = vi.mocked(apiRequest).mock.calls[0];
    expect(path).toBe("/reports/7");
    expect(JSON.parse(String(init?.body))).toEqual({ decision: "archive" });
  });
});
