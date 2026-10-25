import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Message } from "@/lib/types";
import { Composer } from "./Composer";

vi.mock("./chatApi", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./chatApi")>()),
  measureMedia: vi.fn().mockResolvedValue({ width: 640, height: 480 }),
}));

const setup = (editing: Message | null = null) => {
  const onSend = vi.fn();
  const onEdit = vi.fn().mockResolvedValue(undefined);
  const onCancelEdit = vi.fn();
  const utils = render(<Composer recipientName="Tanvir" editing={editing} onSend={onSend} onEdit={onEdit} onCancelEdit={onCancelEdit} />);
  return { ...utils, onSend, onEdit, onCancelEdit, user: userEvent.setup() };
};

describe("Composer", () => {
  beforeEach(() => {
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:preview") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
  });

  it("sends on Enter and clears", async () => {
    const { user, onSend } = setup();
    const box = screen.getByRole("textbox", { name: "Message Tanvir" });
    await user.type(box, "See you at 3{Enter}");
    expect(onSend).toHaveBeenCalledWith({ content: "See you at 3", media: null });
    expect(box).toHaveValue("");
  });

  it("shows the microphone until there is something to send", async () => {
    const { user } = setup();
    expect(screen.getByRole("button", { name: "Record voice message" })).toBeInTheDocument();
    await user.type(screen.getByRole("textbox"), "hi");
    expect(screen.getByRole("button", { name: "Send message" })).toBeInTheDocument();
  });

  it("inserts emoji where the cursor is", async () => {
    const { user } = setup();
    const box = screen.getByRole("textbox");
    await user.type(box, "good luck");
    await user.click(screen.getByRole("button", { name: "Emoji" }));
    await user.type(screen.getByRole("textbox", { name: "Search emoji" }), "clover");
    await user.click(screen.getByRole("button", { name: "🍀" }));
    expect(box).toHaveValue("good luck🍀");
  });

  it("attaches a photo with its size and sends it with the caption", async () => {
    const { user, onSend } = setup();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const photo = new File([new Uint8Array([0xff, 0xd8, 0xff])], "campus.jpg", { type: "image/jpeg" });
    await user.upload(input, photo);
    expect(await screen.findByText("campus.jpg")).toBeInTheDocument();
    await user.type(screen.getByRole("textbox"), "From the lake{Enter}");
    expect(onSend).toHaveBeenCalledWith({ content: "From the lake", media: expect.objectContaining({ file: photo, kind: "image", width: 640, height: 480, previewUrl: "blob:preview" }) });
  });

  it("explains files it cannot send", async () => {
    const { user, onSend } = setup();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, new File([new Uint8Array(11 * 1024 * 1024)], "huge.jpg", { type: "image/jpeg" }));
    expect(await screen.findByText(/up to 10 MB/)).toBeInTheDocument();
    expect(onSend).not.toHaveBeenCalled();
  });

  it("edits a message in place and can be cancelled with Escape", async () => {
    const editing: Message = { id: 3, conversationId: 1, senderId: "me", kind: "text", content: "Helo", sentAt: new Date().toISOString() };
    const { user, onEdit, onCancelEdit, onSend } = setup(editing);
    expect(screen.getByText("Editing message")).toBeInTheDocument();
    const box = screen.getByRole("textbox", { name: "Edit message" });
    expect(box).toHaveValue("Helo");
    await user.clear(box);
    await user.type(box, "Hello{Enter}");
    await waitFor(() => expect(onEdit).toHaveBeenCalledWith("Hello"));
    expect(onSend).not.toHaveBeenCalled();
    await user.type(box, "{Escape}");
    expect(onCancelEdit).toHaveBeenCalled();
  });
});
