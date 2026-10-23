import { render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OAuthCallbackPage } from "./OAuthCallbackPage";

const auth = vi.hoisted(() => ({ value: { completeOAuthSignIn: vi.fn() } }));
const router = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("@/features/auth/AuthProvider", () => ({ useAuth: () => auth.value }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/supabase", () => ({ authLinkHash: "" }));

const visit = (url: string) => window.history.replaceState(null, "", url);

describe("OAuthCallbackPage", () => {
  beforeEach(() => {
    auth.value.completeOAuthSignIn.mockReset().mockResolvedValue(undefined);
    router.replace.mockReset();
  });
  afterEach(() => {
    window.sessionStorage.clear();
    visit("/");
  });

  it("exchanges the code once and continues to the remembered page", async () => {
    window.sessionStorage.setItem("iutverse-oauth-next", "/events");
    visit("/auth/callback?code=one-time-code&sb_flow_id=abcdef12");
    render(<StrictMode><OAuthCallbackPage /></StrictMode>);
    expect(screen.getByRole("status")).toHaveTextContent("Finishing sign-in");
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/events"));
    expect(auth.value.completeOAuthSignIn).toHaveBeenCalledTimes(1);
    expect(auth.value.completeOAuthSignIn).toHaveBeenCalledWith("one-time-code");
  });

  it("goes home when no page was remembered", async () => {
    visit("/auth/callback?code=one-time-code");
    render(<OAuthCallbackPage />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/"));
  });

  it("shows why Supabase refused the sign-in without exchanging anything", async () => {
    visit("/auth/callback?error=access_denied&error_description=Only+verified+IUT+email+addresses+may+create+an+account.");
    render(<OAuthCallbackPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Only verified IUT email addresses may create an account.");
    expect(screen.getByRole("link", { name: "Back to login" })).toHaveAttribute("href", "/login");
    expect(auth.value.completeOAuthSignIn).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("reports a missing code", async () => {
    visit("/auth/callback");
    render(<OAuthCallbackPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("invalid or has expired");
  });

  it("reports an account without active membership and stays put", async () => {
    auth.value.completeOAuthSignIn.mockRejectedValue(new Error("This account does not have active IUTverse membership."));
    visit("/auth/callback?code=one-time-code");
    render(<OAuthCallbackPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("active IUTverse membership");
    expect(router.replace).not.toHaveBeenCalled();
  });
});
