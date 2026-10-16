import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./api";
import { supabase } from "./supabase";
import { uploadDirect } from "./uploads";

vi.mock("./api", async importOriginal => {
  const original = await importOriginal<typeof import("./api")>();
  return { ...original, apiRequest: vi.fn() };
});
const uploadToSignedUrl = vi.fn();
vi.mock("./supabase", () => ({ supabase: { storage: { from: vi.fn(() => ({ uploadToSignedUrl })) } } }));

describe("uploadDirect", () => {
  beforeEach(() => {
    vi.mocked(apiRequest).mockReset();
    uploadToSignedUrl.mockReset();
    vi.mocked(apiRequest).mockResolvedValue({ success: true, data: { bucket: "chat-attachments", path: "me/message-1-2.pdf", token: "t0k" } });
    uploadToSignedUrl.mockResolvedValue({ data: { path: "me/message-1-2.pdf" }, error: null });
  });

  it("asks the API for an intent, uploads to the signed URL and returns the server-chosen path", async () => {
    const file = new File([new Uint8Array(16)], "notes.pdf", { type: "application/pdf" });
    await expect(uploadDirect("chat", file, { conversationId: 9 })).resolves.toBe("me/message-1-2.pdf");

    const [path, init] = vi.mocked(apiRequest).mock.calls[0];
    expect(path).toBe("/uploads");
    expect(JSON.parse(String(init?.body))).toEqual({ purpose: "chat", mimeType: "application/pdf", size: 16, conversationId: 9 });
    expect(supabase.storage.from).toHaveBeenCalledWith("chat-attachments");
    expect(uploadToSignedUrl).toHaveBeenCalledWith("me/message-1-2.pdf", "t0k", file, { contentType: "application/pdf" });
  });

  it("surfaces a Storage rejection instead of returning a path", async () => {
    uploadToSignedUrl.mockResolvedValue({ data: null, error: { message: "mime type image/svg+xml is not supported" } });
    const file = new File(["<svg/>"], "x.svg", { type: "image/svg+xml" });
    await expect(uploadDirect("post", file)).rejects.toThrow("mime type image/svg+xml is not supported");
  });
});
