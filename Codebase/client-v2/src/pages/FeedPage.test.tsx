import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PostReaction } from "@/lib/types";
import { PostCard, PostComposer, summarizeReactions } from "./FeedPage";
import { apiRequest } from "@/lib/api";

vi.mock("@/lib/api", async importOriginal => {
  const original = await importOriginal<typeof import("@/lib/api")>();
  return { ...original, apiRequest: vi.fn() };
});
const authState = vi.hoisted(() => ({ userId: "owner" }));
vi.mock("@/features/auth/AuthProvider", () => ({ useAuth: () => ({ user: { id: authState.userId, displayName: "Owner" } }) }));
vi.mock("@/components/shell/AppShell", () => ({ PageFrame: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));

const renderWithProviders = (node: React.ReactNode) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter>{node}</MemoryRouter></QueryClientProvider>);

describe("post interactions", () => {
  beforeEach(() => {
    authState.userId = "owner";
    vi.mocked(apiRequest).mockReset();
    vi.mocked(apiRequest).mockResolvedValue({ success: true, data: {} });
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

  it("submits an image-only post under the image multipart field", async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(<PostComposer />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const image = new File([new Uint8Array([0xff, 0xd8, 0xff])], "campus.jpg", { type: "image/jpeg" });
    await user.upload(input, image);
    expect(screen.getByAltText("Selected post attachment preview")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Post" }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("/posts", expect.objectContaining({ method: "POST", body: expect.any(FormData) })));
    const options = vi.mocked(apiRequest).mock.calls.find(call => call[0] === "/posts")?.[1];
    expect((options?.body as FormData).get("image")).toBe(image);
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
});
