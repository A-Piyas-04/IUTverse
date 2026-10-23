import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiPage, apiRequest } from "@/lib/api";
import { AppShell } from "./AppShell";

vi.mock("@/lib/api", async importOriginal => {
  const original = await importOriginal<typeof import("@/lib/api")>();
  return { ...original, apiPage: vi.fn(), apiRequest: vi.fn() };
});
const navigation = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => navigation.pathname }));
vi.mock("@/features/auth/AuthProvider", () => ({
  useAuth: () => ({ user: { id: "me", displayName: "Nuren Fahmid", email: "nuren@iut-dhaka.edu", role: "user" }, signOut: vi.fn() }),
}));
vi.mock("@/features/theme/ThemeProvider", () => ({ useTheme: () => ({ theme: "light", toggleTheme: vi.fn() }) }));

const renderShell = () =>
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><AppShell><p>Page</p></AppShell></QueryClientProvider>);

describe("AppShell sidebar", () => {
  beforeEach(() => {
    navigation.pathname = "/";
    vi.mocked(apiPage).mockResolvedValue({ success: true, data: [], pagination: { page: 1, limit: 4, total: 0, totalPages: 0 } });
    vi.mocked(apiRequest).mockResolvedValue({ success: true, data: { id: "me", displayName: "Nuren Fahmid", profilePictureUrl: "https://cdn.example/avatars/me.jpg" } });
  });

  it("reaches the profile through one card with the member's photo, name and email", async () => {
    renderShell();
    const sidebar = screen.getByRole("complementary", { name: "Primary navigation" });
    const card = within(sidebar).getByRole("link", { name: /Nuren Fahmid/ });
    expect(card).toHaveAttribute("href", "/profile");
    expect(card).toHaveTextContent("nuren@iut-dhaka.edu");
    expect(await within(card).findByRole("presentation", { hidden: true })).toHaveAttribute("src", "https://cdn.example/avatars/me.jpg");
    expect(apiRequest).toHaveBeenCalledWith("/profile/me", {}, expect.anything());
    // No second, separate "Profile" entry in the navigation groups.
    expect(within(sidebar).queryAllByRole("link", { name: /^profile$/i })).toHaveLength(0);
    expect(within(sidebar).getAllByRole("link").filter(link => link.getAttribute("href") === "/profile")).toEqual([card]);
  });

  it("marks the card as the current page on the profile", () => {
    navigation.pathname = "/profile";
    renderShell();
    const sidebar = screen.getByRole("complementary", { name: "Primary navigation" });
    expect(within(sidebar).getByRole("link", { name: /Nuren Fahmid/ })).toHaveAttribute("aria-current", "page");
  });

  it("keeps Profile in the phone navigation bar", () => {
    renderShell();
    const mobile = screen.getByRole("navigation", { name: "Mobile navigation" });
    expect(within(mobile).getByRole("link", { name: "Profile" })).toHaveAttribute("href", "/profile");
  });
});
