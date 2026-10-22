import { describe, expect, it } from "vitest";
import { readAuthLinkIntent } from "./authLink";

describe("readAuthLinkIntent", () => {
  it("recognizes a password-recovery link", () => {
    const hash = "#access_token=abc&expires_in=3600&refresh_token=def&token_type=bearer&type=recovery";
    expect(readAuthLinkIntent(hash)).toEqual({ recovery: true, error: null });
  });

  it("does not treat other sign-in links as recovery", () => {
    expect(readAuthLinkIntent("#access_token=abc&type=signup").recovery).toBe(false);
    expect(readAuthLinkIntent("#type=recovery").recovery).toBe(false);
  });

  it("reports why Supabase rejected the link", () => {
    const hash = "#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired";
    expect(readAuthLinkIntent(hash)).toEqual({ recovery: false, error: "Email link is invalid or has expired" });
  });

  it("falls back to a generic message when no description is given", () => {
    expect(readAuthLinkIntent("#error=access_denied").error).toBe("This link is invalid or has expired.");
  });

  it("ignores ordinary pages", () => {
    expect(readAuthLinkIntent("")).toEqual({ recovery: false, error: null });
    expect(readAuthLinkIntent("#section-2")).toEqual({ recovery: false, error: null });
  });
});
