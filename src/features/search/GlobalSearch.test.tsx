import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/lib/api";
import { GlobalSearch } from "./GlobalSearch";

vi.mock("@/lib/api", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/api")>()), apiRequest: vi.fn() }));
const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/" }));
vi.mock("next/link", () => ({ default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a> }));

const results = {
  query: "robo",
  type: "all",
  groups: {
    people: { items: [{ id: "u1", displayName: "Robin Ahmed", department: "EEE", batch: 21 }], hasMore: false },
    posts: { items: [{ id: 9, content: "Robotics club meets Thursday", isAnonymous: true, author: null, imageUrl: null, reactionCount: 2, commentCount: 1, createdAt: new Date().toISOString() }], hasMore: true },
    events: { items: [], hasMore: false },
    jobs: { items: [{ id: 3, title: "Robotics intern", type: "Internship", organization: "Walton", description: "" }], hasMore: false },
    resources: { items: [], hasMore: false },
    lostFound: { items: [], hasMore: false },
  },
};

const setup = () => {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><GlobalSearch /></QueryClientProvider>);
  return userEvent.setup();
};

describe("GlobalSearch", () => {
  beforeEach(() => {
    vi.mocked(apiRequest).mockReset().mockResolvedValue({ success: true, data: results });
    router.push.mockReset();
    localStorage.clear();
  });

  it("groups results by kind as you type, linking each to its page", async () => {
    const user = setup();
    await user.type(screen.getByRole("combobox", { name: "Search IUTverse" }), "robo");
    expect(await screen.findByRole("region", { name: "People" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Robin Ahmed/ })).toHaveAttribute("href", "/profile/u1");
    expect(screen.getByRole("link", { name: /Robo\s*tics club meets Thursday/ })).toHaveAttribute("href", "/posts/9");
    expect(screen.getByRole("link", { name: /Robo\s*tics intern/ })).toHaveAttribute("href", "/jobs?q=Robotics%20intern");
    expect(screen.queryByRole("region", { name: "Events" })).not.toBeInTheDocument();
    expect(screen.getByText(/Anonymous/)).toBeInTheDocument();
    expect(vi.mocked(apiRequest).mock.calls.at(-1)?.[0]).toBe("/search?q=robo&type=all&page=1");
  });

  it("opens the highlighted result with the arrow keys and Enter", async () => {
    const user = setup();
    const box = screen.getByRole("combobox", { name: "Search IUTverse" });
    await user.type(box, "robo");
    await screen.findByRole("region", { name: "People" });
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    expect(router.push).toHaveBeenCalledWith("/posts/9");
  });

  it("goes to all results on Enter, and remembers the search", async () => {
    const user = setup();
    await user.type(screen.getByRole("combobox", { name: "Search IUTverse" }), "robo{Enter}");
    expect(router.push).toHaveBeenCalledWith("/search?q=robo");
    await user.click(screen.getByRole("combobox", { name: "Search IUTverse" }));
    await user.clear(screen.getByRole("combobox", { name: "Search IUTverse" }));
    expect(await screen.findByText("Recent searches")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "robo" })).toBeInTheDocument();
  });
});
