import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Post, PostReaction } from "@/lib/types";
import { PostCard, PostComposer, ReactorsDialog, summarizeReactions } from "./FeedPage";
import { apiRequest } from "@/lib/api";
import { uploadDirect } from "@/lib/uploads";

vi.mock("@/lib/api", async importOriginal => {
  const original = await importOriginal<typeof import("@/lib/api")>();
  return { ...original, apiRequest: vi.fn() };
});
vi.mock("@/lib/uploads", () => ({ uploadDirect: vi.fn() }));
const navigation = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => navigation,
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/community",
  useParams: () => ({}),
}));
const authState = vi.hoisted(() => ({ userId: "owner" }));
vi.mock("@/features/auth/AuthProvider", () => ({ useAuth: () => ({ user: { id: authState.userId, displayName: "Owner" } }) }));
vi.mock("@/components/shell/AppShell", () => ({ PageFrame: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));

const renderWithProviders = (node: React.ReactNode) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{node}</QueryClientProvider>);

describe("post interactions", () => {
  beforeEach(() => {
    authState.userId = "owner";
    vi.mocked(apiRequest).mockReset();
    vi.mocked(apiRequest).mockResolvedValue({ success: true, data: {} });
    vi.mocked(uploadDirect).mockReset();
    vi.mocked(uploadDirect).mockResolvedValue("owner/post-1-2.jpg");
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:preview") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
  });

  it("summarizes reaction objects as numeric counts", () => {
    const reactions = [
      { id: 1, postId: 2, userId: "a", reactionType: "like" },
      { id: 2, postId: 2, userId: "b", reactionType: "funny" },
      { id: 3, postId: 2, userId: "c", reactionType: "like" },
    ] satisfies PostReaction[];
    expect(summarizeReactions(reactions)).toMatchObject({ like: 2, funny: 1, helpful: 0 });
    expect(String(Object.values(summarizeReactions(reactions)).reduce((sum, value) => sum + value, 0))).toBe("3");
  });

  it("uploads an image-only post straight to Storage and sends only its path", async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(<PostComposer />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const image = new File([new Uint8Array([0xff, 0xd8, 0xff])], "campus.jpg", { type: "image/jpeg" });
    await user.upload(input, image);
    expect(screen.getByAltText("Selected post attachment preview")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Post" }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("/posts", expect.objectContaining({ method: "POST", body: expect.any(FormData) })));
    const options = vi.mocked(apiRequest).mock.calls.find(call => call[0] === "/posts")?.[1];
    expect(uploadDirect).toHaveBeenCalledWith("post", image);
    expect((options?.body as FormData).get("uploadPath")).toBe("owner/post-1-2.jpg");
    expect((options?.body as FormData).get("image")).toBeNull();
  });

  it("rejects an unsupported post attachment before submission", async () => {
    const { container } = renderWithProviders(<PostComposer />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(["notes"], "notes.txt", { type: "text/plain" })] } });
    expect(screen.getByText("Choose a JPEG, PNG, WebP, or GIF image.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Post" })).toBeDisabled();
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it("exposes delete only to the owner and calls the protected endpoint after confirmation", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PostCard post={{ id: 12, authorId: "owner", content: "Owned post", createdAt: new Date().toISOString(), reactions: [] }} />);
    await user.click(screen.getByRole("button", { name: "Post options" }));
    await user.click(screen.getByRole("menuitem", { name: "Delete post" }));
    await user.click(screen.getByRole("button", { name: "Delete post" }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("/posts/12", { method: "DELETE" }));
  });

  it("does not expose delete to a non-owner", async () => {
    authState.userId = "someone-else";
    const user = userEvent.setup();
    renderWithProviders(<PostCard post={{ id: 13, authorId: "owner", content: "Someone else's post", createdAt: new Date().toISOString(), reactions: [] }} />);
    await user.click(screen.getByRole("button", { name: "Post options" }));
    expect(screen.queryByRole("menuitem", { name: "Delete post" })).not.toBeInTheDocument();
  });

  it("lists who reacted, newest first, and filters by reaction", async () => {
    const user = userEvent.setup();
    const reactions = [
      { id: 1, postId: 7, userId: "u1", reactionType: "like", user: { id: "u1", displayName: "Ayesha Rahman", department: "CSE", batch: 22 } },
      { id: 3, postId: 7, userId: "u3", reactionType: "funny", user: { id: "u3", displayName: "Tanvir Hasan" } },
      { id: 2, postId: 7, userId: "u2", reactionType: "like", user: { id: "u2", displayName: "Nabila Karim" } },
    ] satisfies PostReaction[];
    renderWithProviders(<ReactorsDialog reactions={reactions} open onClose={() => {}} />);

    const names = () => screen.getAllByRole("link").map(link => link.querySelector("strong")?.textContent);
    expect(names()).toEqual(["Tanvir Hasan", "Nabila Karim", "Ayesha Rahman"]);
    expect(screen.getByRole("link", { name: /Ayesha Rahman/ })).toHaveAttribute("href", "/profile/u1");
    expect(screen.getByText("CSE 22")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "All 3" })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "Like, 2" }));
    expect(names()).toEqual(["Nabila Karim", "Ayesha Rahman"]);
    expect(screen.getByRole("link", { name: /Nabila Karim/ })).toHaveTextContent("reacted Like");
    expect(screen.queryByRole("button", { name: /Relatable/ })).not.toBeInTheDocument();
  });

  it("opens the reactor list from the post's reaction count", async () => {
    const user = userEvent.setup();
    const post = {
      id: 7, content: "Hello", createdAt: new Date().toISOString(), reactionCount: 1,
      reactions: [{ id: 1, postId: 7, userId: "u1", reactionType: "like", user: { id: "u1", displayName: "Ayesha Rahman" } }],
    } as unknown as Post;
    renderWithProviders(<PostCard post={post} />);
    await user.click(screen.getByRole("button", { name: "1 reaction, see who reacted" }));
    expect(screen.getByRole("dialog", { name: "Reactions" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ayesha Rahman/ })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not offer a reactor list for a post nobody reacted to", () => {
    const post = { id: 8, content: "Quiet", createdAt: new Date().toISOString(), reactionCount: 0, reactions: [] } as unknown as Post;
    renderWithProviders(<PostCard post={post} />);
    expect(screen.getByRole("button", { name: "No reactions yet" })).toBeDisabled();
  });
});
