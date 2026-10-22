import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResetPasswordPage } from "./ResetPasswordPage";

const auth = vi.hoisted(() => ({
  value: {
    loading: false,
    session: { access_token: "t" } as unknown,
    changePassword: vi.fn(),
    signOut: vi.fn(),
  },
}));
const router = vi.hoisted(() => ({ replace: vi.fn() }));
const link = vi.hoisted(() => ({ error: null as string | null }));

vi.mock("@/features/auth/AuthProvider", () => ({ useAuth: () => auth.value }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/supabase", () => ({ authLinkIntent: { recovery: false, get error() { return link.error; } } }));

const fill = async (password: string, confirm: string) => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("New password"), password);
  await user.type(screen.getByLabelText("Confirm new password"), confirm);
  await user.click(screen.getByRole("button", { name: "Set new password" }));
};

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    Object.assign(auth.value, { loading: false, session: { access_token: "t" } });
    auth.value.changePassword.mockReset().mockResolvedValue(undefined);
    auth.value.signOut.mockReset().mockResolvedValue(undefined);
    router.replace.mockReset();
    link.error = null;
  });

  it("saves the new password, ends the recovery session and sends the member to log in", async () => {
    render(<ResetPasswordPage />);
    await fill("a-new-password", "a-new-password");
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login?reset=success"));
    expect(auth.value.changePassword).toHaveBeenCalledWith("a-new-password");
    expect(auth.value.signOut).toHaveBeenCalledTimes(1);
  });

  it("rejects short passwords and mismatches before calling the API", async () => {
    render(<ResetPasswordPage />);
    await fill("short", "short");
    expect(await screen.findByText("Use at least 8 characters")).toBeInTheDocument();
    expect(auth.value.changePassword).not.toHaveBeenCalled();
  });

  it("requires the confirmation to match", async () => {
    render(<ResetPasswordPage />);
    await fill("a-new-password", "a-different-one");
    expect(await screen.findByText("Passwords do not match")).toBeInTheDocument();
    expect(auth.value.changePassword).not.toHaveBeenCalled();
  });

  it("shows Supabase's error and stays on the page when the update fails", async () => {
    auth.value.changePassword.mockRejectedValue(new Error("New password should be different from the old password."));
    render(<ResetPasswordPage />);
    await fill("a-new-password", "a-new-password");
    expect(await screen.findByRole("alert")).toHaveTextContent("New password should be different from the old password.");
    expect(auth.value.signOut).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("explains an invalid or expired link when there is no session", () => {
    auth.value.session = null;
    link.error = "Email link is invalid or has expired";
    render(<ResetPasswordPage />);
    expect(screen.getByText("Email link is invalid or has expired")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to login" })).toHaveAttribute("href", "/login");
    expect(screen.queryByLabelText("New password")).not.toBeInTheDocument();
  });

  it("waits while the session is still loading", () => {
    auth.value.loading = true;
    auth.value.session = null;
    render(<ResetPasswordPage />);
    expect(screen.getByText("Checking your reset link…")).toBeInTheDocument();
  });
});
