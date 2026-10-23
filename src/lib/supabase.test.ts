import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const created = vi.hoisted(() => [] as Array<{ options: any; signInWithOAuth: ReturnType<typeof vi.fn> }>);
const oauth = vi.hoisted(() => ({ error: null as Error | null }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: (_url: string, _key: string, options: any) => {
    const signInWithOAuth = vi.fn().mockResolvedValue({ data: {}, error: oauth.error });
    created.push({ options, signInWithOAuth });
    return { auth: { signInWithOAuth } };
  },
}));

const load = async () => {
  vi.resetModules();
  return import("./supabase");
};

describe("redirectToOAuthProvider", () => {
  beforeEach(() => {
    created.length = 0;
    oauth.error = null;
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:8000");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    window.localStorage.clear();
  });

  it("starts the provider redirect with PKCE while the main client keeps the implicit flow", async () => {
    const { redirectToOAuthProvider } = await load();
    const options = { redirectTo: "http://localhost:3000/auth/callback", queryParams: { hd: "iut-dhaka.edu" } };
    await redirectToOAuthProvider("google", options);

    const [main, pkce] = created;
    expect(main.options.auth.flowType).toBeUndefined();
    expect(main.options.auth.detectSessionInUrl).toBe(true);
    expect(pkce.options.auth).toMatchObject({ flowType: "pkce", autoRefreshToken: false, detectSessionInUrl: false });
    expect(pkce.signInWithOAuth).toHaveBeenCalledWith({ provider: "google", options });
  });

  it("lets the PKCE client store its code verifier and nothing else", async () => {
    const { redirectToOAuthProvider } = await load();
    await redirectToOAuthProvider("google", { redirectTo: "http://localhost:3000/auth/callback" });
    const storage = created[1].options.auth.storage;
    window.localStorage.setItem("sb-localhost-auth-token", "the main client's session");

    expect(storage.getItem("sb-localhost-auth-token")).toBeNull();
    storage.setItem("sb-localhost-auth-token", "overwritten");
    storage.removeItem("sb-localhost-auth-token");
    expect(window.localStorage.getItem("sb-localhost-auth-token")).toBe("the main client's session");

    storage.setItem("sb-localhost-auth-token-flow-0123abcd-code-verifier", "verifier");
    expect(window.localStorage.getItem("sb-localhost-auth-token-flow-0123abcd-code-verifier")).toBe("verifier");
    expect(storage.getItem("sb-localhost-auth-token-flow-0123abcd-code-verifier")).toBe("verifier");
    storage.removeItem("sb-localhost-auth-token-flow-0123abcd-code-verifier");
    expect(window.localStorage.getItem("sb-localhost-auth-token-flow-0123abcd-code-verifier")).toBeNull();
  });

  it("surfaces an error when the redirect cannot start", async () => {
    const { redirectToOAuthProvider } = await load();
    oauth.error = new Error("Unsupported provider: provider is not enabled");
    await expect(redirectToOAuthProvider("google", { redirectTo: "x" })).rejects.toThrow("provider is not enabled");
  });

  it("refuses when Supabase is not configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    const { redirectToOAuthProvider } = await load();
    await expect(redirectToOAuthProvider("google", { redirectTo: "x" })).rejects.toThrow("Supabase is not configured");
    expect(created).toHaveLength(0);
  });
});
