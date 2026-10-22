import { afterEach, describe, expect, it, vi } from "vitest";
import * as response from "@/server/http/responses";

const read = async (res: Response) => ({ status: res.status, body: await res.json() });

afterEach(() => vi.unstubAllEnvs());

describe("response helpers", () => {
  it("sends the standard success envelope with extras", async () => {
    const res = response.success([{ id: 1 }], null, { pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } });
    expect(await read(res)).toEqual({
      status: 200,
      body: { success: true, data: [{ id: 1 }], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } },
    });
  });

  it("omits data when there is none and keeps an explicit null", async () => {
    expect((await read(response.success())).body).toEqual({ success: true });
    expect((await read(response.success(null, "Done"))).body).toEqual({ success: true, message: "Done", data: null });
    expect((await read(response.created({ id: 2 }))).status).toBe(201);
  });

  it("provides a standard error envelope for each status helper", async () => {
    expect(await read(response.forbidden("Nope"))).toEqual({ status: 403, body: { success: false, message: "Nope" } });
    expect((await read(response.unauthorized())).status).toBe(401);
    expect((await read(response.notFound())).status).toBe(404);
    expect((await read(response.conflict())).status).toBe(409);
    expect((await read(response.payloadTooLarge())).status).toBe(413);
    expect((await read(response.badRequest("Bad", { validTags: ["a"] })))).toEqual({ status: 400, body: { success: false, message: "Bad", validTags: ["a"] } });
  });

  it("hides internal detail by default", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("EXPOSE_ERRORS", "");
    expect(await read(response.serverError("Unexpected server error", "boom"))).toEqual({ status: 500, body: { success: false, message: "Unexpected server error" } });
  });

  it("includes internal detail only when EXPOSE_ERRORS=true outside production", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("EXPOSE_ERRORS", "true");
    expect((await read(response.serverError("Unexpected server error", "boom"))).body).toEqual({ success: false, message: "Unexpected server error", error: "boom" });

    vi.stubEnv("NODE_ENV", "production");
    expect((await read(response.serverError("Unexpected server error", "boom"))).body).toEqual({ success: false, message: "Unexpected server error" });
  });

  it("redirects with 302 like Express did", () => {
    const res = response.redirect("https://storage.example/object");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://storage.example/object");
  });
});
