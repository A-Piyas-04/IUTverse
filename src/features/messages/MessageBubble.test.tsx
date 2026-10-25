import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Message } from "@/lib/types";
import { MessageBubble } from "./MessageBubble";

vi.mock("next/link", () => ({ default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a> }));

const message = (overrides: Partial<Message> = {}): Message => ({
  id: 7,
  conversationId: 1,
  senderId: "me",
  kind: "text",
  content: "Are you coming to the lab?",
  sentAt: "2026-10-24T10:00:00.000Z",
  ...overrides,
});

const renderBubble = (props: Partial<Parameters<typeof MessageBubble>[0]> = {}) =>
  render(<MessageBubble message={message()} own grouped={false} userId="me" {...props} />);

describe("MessageBubble ticks", () => {
  it("shows one tick when sent, two when delivered, two marked read when read", () => {
    const { rerender } = renderBubble();
    expect(screen.getByLabelText(/^Sent/)).toBeInTheDocument();
    rerender(<MessageBubble message={message({ deliveredAt: "2026-10-24T10:00:05Z" })} own grouped={false} userId="me" />);
    expect(screen.getByLabelText(/^Delivered/)).toBeInTheDocument();
    rerender(<MessageBubble message={message({ deliveredAt: "2026-10-24T10:00:05Z", readAt: "2026-10-24T10:02:00Z" })} own grouped={false} userId="me" />);
    expect(screen.getByLabelText(/^Read/)).toBeInTheDocument();
  });

  it("shows ticks only on the member's own messages", () => {
    renderBubble({ own: false, message: message({ senderId: "them" }) });
    expect(screen.queryByLabelText(/^(Sent|Delivered|Read)/)).not.toBeInTheDocument();
  });

  it("shows sending, and a retry when it failed", async () => {
    const onRetry = vi.fn();
    const { rerender } = renderBubble({ pending: "sending" });
    expect(screen.getByLabelText("Sending")).toBeInTheDocument();
    rerender(<MessageBubble message={message()} own grouped={false} userId="me" pending="failed" onRetry={onRetry} />);
    await userEvent.click(screen.getByRole("button", { name: /Retry/ }));
    expect(onRetry).toHaveBeenCalled();
  });
});

describe("MessageBubble content", () => {
  it("labels an edited message", () => {
    renderBubble({ message: message({ editedAt: "2026-10-24T10:03:00Z" }) });
    expect(screen.getByText("edited")).toBeInTheDocument();
  });

  it("draws a voice message as a player with its length", () => {
    renderBubble({ message: message({ kind: "audio", content: "", attachment: { url: "blob:x", durationMs: 7_000, waveform: [10, 90, 40] } }), mediaSrc: "blob:x" });
    expect(screen.getByRole("button", { name: "Play voice message" })).toBeEnabled();
    expect(screen.getByText("0:07")).toBeInTheDocument();
  });

  it("links a shared post, or says it is gone", () => {
    const { rerender } = renderBubble({ message: message({ kind: "post", content: "", sharedPost: { id: 5, available: true, content: "Exam routine is out", author: { id: "a", displayName: "Ayesha" } } }) });
    const card = screen.getByRole("link", { name: /Exam routine is out/ });
    expect(card).toHaveAttribute("href", "/posts/5");
    expect(within(card).getByText("Ayesha")).toBeInTheDocument();
    rerender(<MessageBubble message={message({ kind: "post", content: "", sharedPost: { id: null, available: false } })} own grouped={false} userId="me" />);
    expect(screen.getByText("This post is no longer available.")).toBeInTheDocument();
  });

  it("opens photos full size", async () => {
    const onOpenMedia = vi.fn();
    renderBubble({ message: message({ kind: "image", content: "", attachment: { url: "https://s/x.jpg", width: 800, height: 600 } }), mediaSrc: "https://s/x.jpg", onOpenMedia });
    await userEvent.click(screen.getByRole("button", { name: "Open photo" }));
    expect(onOpenMedia).toHaveBeenCalledWith({ kind: "image", url: "https://s/x.jpg" });
  });
});

describe("MessageBubble reactions", () => {
  it("groups reactions with counts and names, and toggles the member's own", async () => {
    const onReact = vi.fn();
    renderBubble({
      own: false,
      message: message({ senderId: "them", reactions: [{ emoji: "😂", userId: "them" }, { emoji: "😂", userId: "me" }] }),
      names: new Map([["them", "Tanvir"]]),
      onReact,
    });
    const chip = screen.getByRole("button", { name: "😂 2, Tanvir, You" });
    await userEvent.click(chip);
    expect(onReact).toHaveBeenCalledWith("😂");
  });

  it("offers quick reactions from the react button", async () => {
    const onReact = vi.fn();
    renderBubble({ own: false, message: message({ senderId: "them" }), onReact });
    await userEvent.click(screen.getByRole("button", { name: "React" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "React ❤️" }));
    expect(onReact).toHaveBeenCalledWith("❤️");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("offers Edit only when allowed", async () => {
    const onEdit = vi.fn();
    const { rerender } = renderBubble({ canEdit: true, onEdit, onReact: vi.fn() });
    await userEvent.click(screen.getByRole("button", { name: "Edit message" }));
    expect(onEdit).toHaveBeenCalled();
    rerender(<MessageBubble message={message()} own grouped={false} userId="me" canEdit={false} onReact={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Edit message" })).not.toBeInTheDocument();
  });
});
