import { afterEach, describe, expect, it } from "vitest";
import { enabledOAuthProviders, readOAuthCallback, rememberOAuthDestination, takeOAuthDestination } from "./oauth";

describe("enabledOAuthProviders", () => {
  it("reads a comma-separated list, ignoring case, spaces and repeats", () => {
    expect(enabledOAuthProviders(" Google , keycloak,google ")).toEqual(["google", "keycloak"]);
  });

  it("drops providers the login page does not know", () => {
    expect(enabledOAuthProviders("github,google,constructor,__proto__")).toEqual(["google"]);
  });

  it("offers none when unset", () => {
    expect(enabledOAuthProviders(undefined)).toEqual([]);
    expect(enabledOAuthProviders("")).toEqual([]);
  });
});

describe("readOAuthCallback", () => {
  it("returns the one-time code from a successful redirect", () => {
    expect(readOAuthCallback("?code=4f1c&sb_flow_id=abcdef12", "")).toEqual({ code: "4f1c", error: null });
  });

  it("reports a refusal from the query", () => {
    const search = "?error=access_denied&error_code=signup_disabled&error_description=Only+verified+IUT+email+addresses+may+create+an+account.";
    expect(readOAuthCallback(search, "")).toEqual({
      code: null,
      error: "Only verified IUT email addresses may create an account.",
    });
  });

  it("reports a refusal from the fragment and never trusts a code next to it", () => {
    expect(readOAuthCallback("?code=4f1c", "#error=server_error&error_description=Unable%20to%20exchange")).toEqual({
      code: null,
      error: "Unable to exchange",
    });
  });

  it("falls back to a generic reason when none is given", () => {
    expect(readOAuthCallback("?error=access_denied", "").error).toBe("Sign-in was cancelled or refused.");
  });

  it("finds nothing on a bare visit", () => {
    expect(readOAuthCallback("", "")).toEqual({ code: null, error: null });
  });
});

describe("OAuth destination", () => {
  afterEach(() => window.sessionStorage.clear());

  it("returns to the remembered page once", () => {
    rememberOAuthDestination("/messages?conversation=4");
    expect(takeOAuthDestination()).toBe("/messages?conversation=4");
    expect(takeOAuthDestination()).toBe("/");
  });

  it("never returns off-site, even if storage was tampered with", () => {
    rememberOAuthDestination("https://evil.example");
    expect(takeOAuthDestination()).toBe("/");
    window.sessionStorage.setItem("iutverse-oauth-next", "//evil.example");
    expect(takeOAuthDestination()).toBe("/");
  });
});
