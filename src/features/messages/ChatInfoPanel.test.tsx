import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Conversation } from "@/lib/types";
import { ChatInfoPanel, mutedLabel } from "./ChatInfoPanel";
import * as api from "./chatApi";

vi.mock("next/link", () => ({ default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a> }));
vi.mock("./chatApi", () => ({
  updateChatSettings: vi.fn().mockResolvedValue({ success: true, data: {} }),
  clearChat: vi.fn().mockResolvedValue({ success: true }),
  setBlocked: vi.fn().mockResolvedValue({ success: true }),
  searchChat: vi.fn().mockResolvedValue({ success: true, data: [{ id: 33, conversationId: 1, senderId: "them", kind: "text", content: "Lab moved to room 304", sentAt: "2026-10-20T10:00:00Z" }] }),
  chatMedia: vi.fn().mockResolvedValue({ success: true, data: [] }),
}));

const conversation = (overrides: Partial<Conversation> = {}): Conversation => ({
  id: 1,
  otherUser: { id: "them", displayName: "Tanvir Hasan", department: "CSE", batch: 22 },
  participants: [
    { userId: "me", user: { id: "me", displayName: "Ayesha" } },
    { userId: "them", nickname: null, user: { id: "them", displayName: "Tanvir Hasan" } },
  ],
  settings: { muted: false, mutedUntil: null, markedUnread: false, clearedAt: null },
  blocked: { byMe: false, byThem: false },
  ...overrides,
});

const setup = (value = conversation()) => {
  const props = { onClose: vi.fn(), onLeave: vi.fn(), onJumpTo: vi.fn(), onOpenMedia: vi.fn() };
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><ChatInfoPanel conversation={value} userId="me" {...props} /></QueryClientProvider>);
  return { ...props, user: userEvent.setup() };
};

describe("ChatInfoPanel", () => {
  beforeEach(() => vi.clearAllMocks());

  it("introduces the person with a link to their profile", () => {
    setup();
    expect(screen.getByRole("heading", { name: "Tanvir Hasan" })).toBeInTheDocument();
    expect(screen.getByText("CSE · Batch 22")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Profile/ })).toHaveAttribute("href", "/profile/them");
  });

  it("mutes for a chosen time, and unmutes", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Mute" }));
    await user.click(screen.getByRole("menuitem", { name: "For 8 hours" }));
    expect(api.updateChatSettings).toHaveBeenCalledWith(1, { mute: "8h" });
  });

  it("offers Unmute when muted", async () => {
    const { user } = setup(conversation({ settings: { muted: true, mutedUntil: "9999-12-31T00:00:00.000Z", markedUnread: false, clearedAt: null } }));
    expect(screen.getByText("Muted", { selector: "span" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Unmute" }));
    expect(api.updateChatSettings).toHaveBeenCalledWith(1, { mute: "off" });
  });

  it("sets a nickname", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Edit nicknames" }));
    await user.type(screen.getByRole("textbox", { name: "Nickname for Tanvir Hasan" }), "Robo");
    await user.click(screen.getAllByRole("button", { name: "Save" })[1]);
    expect(api.updateChatSettings).toHaveBeenCalledWith(1, { nickname: { userId: "them", value: "Robo" } });
  });

  it("finds a message and jumps to it", async () => {
    const { user, onJumpTo, onClose } = setup();
    await user.click(screen.getByRole("button", { name: "Search" }));
    await user.type(screen.getByRole("textbox", { name: "Search in conversation" }), "room");
    await user.click(await screen.findByRole("button", { name: /Lab moved to room 304/ }));
    expect(api.searchChat).toHaveBeenCalledWith(1, "room", expect.anything());
    expect(onJumpTo).toHaveBeenCalledWith(33);
    expect(onClose).toHaveBeenCalled();
  });

  it("blocks only after confirming", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Block" }));
    expect(api.setBlocked).not.toHaveBeenCalled();
    await user.click(within(screen.getByRole("dialog", { name: "Block Tanvir Hasan?" })).getByRole("button", { name: "Block" }));
    await waitFor(() => expect(api.setBlocked).toHaveBeenCalledWith("them", true));
  });

  it("marks as unread and leaves the chat", async () => {
    const { user, onLeave } = setup();
    await user.click(screen.getByRole("button", { name: "Mark as unread" }));
    await waitFor(() => expect(onLeave).toHaveBeenCalled());
    expect(api.updateChatSettings).toHaveBeenCalledWith(1, { markedUnread: true });
  });

  it("deletes the chat after confirming", async () => {
    const { user, onLeave } = setup();
    await user.click(screen.getByRole("button", { name: "Delete chat" }));
    await user.click(screen.getAllByRole("button", { name: "Delete chat" }).at(-1)!);
    await waitFor(() => expect(api.clearChat).toHaveBeenCalledWith(1));
    expect(onLeave).toHaveBeenCalled();
  });

  it("describes how long a chat is muted", () => {
    expect(mutedLabel("9999-12-31T00:00:00.000Z")).toBe("Muted");
    expect(mutedLabel(new Date(Date.now() + 3600_000).toISOString())).toMatch(/^Muted until /);
    expect(mutedLabel(null)).toBe("");
  });
});
