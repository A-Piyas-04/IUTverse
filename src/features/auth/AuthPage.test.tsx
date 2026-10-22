import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthPage } from "./AuthPage";

const auth = vi.hoisted(() => ({
  value: {
    loading: false,
    session: null as unknown,
    signIn: vi.fn(),
    signUp: vi.fn(),
    resetPassword: vi.fn(),
  },
}));
const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
const query = vi.hoisted(() => ({ search: "" }));

vi.mock("@/features/auth/AuthProvider", () => ({ useAuth: () => auth.value }));
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams(query.search),
}));

describe("AuthPage", () => {
  beforeEach(() => {
    Object.assign(auth.value, { loading: false, session: null });
    auth.value.signIn.mockReset().mockResolvedValue(undefined);
    auth.value.signUp.mockReset().mockResolvedValue(undefined);
    auth.value.resetPassword.mockReset().mockResolvedValue(undefined);
    router.replace.mockReset();
    query.search = "";
  });

  it("shows the IUT-only login screen and a link to sign up", () => {
    render(<AuthPage mode="login" />);
    expect(screen.getByRole("heading", { name: "IUTVerse" })).toBeInTheDocument();
    expect(screen.getByText("Stay connected. Stay updated. Stay united.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Get started here" })).toHaveAttribute("href", "/signup");
  });

  it("shows the sign-up notice for IUT students only", () => {
    render(<AuthPage mode="signup" />);
    expect(screen.getByText("For IUT students only - Use your IUT email to get started!")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Login here" })).toHaveAttribute("href", "/login");
  });

  it("rejects an email outside the IUT domain without calling the API", async () => {
    const user = userEvent.setup();
    render(<AuthPage mode="login" />);
    await user.type(screen.getByLabelText("IUT Email"), "someone@gmail.com");
    await user.type(screen.getByLabelText("Password"), "secret");
    await user.click(screen.getByRole("button", { name: "Login" }));
    expect(await screen.findByText("Use your IUT email address")).toBeInTheDocument();
    expect(auth.value.signIn).not.toHaveBeenCalled();
  });

  it("signs in and returns to the page the member was heading for", async () => {
    query.search = "next=%2Fmessages%3Fconversation%3D4";
    const user = userEvent.setup();
    render(<AuthPage mode="login" />);
    await user.type(screen.getByLabelText("IUT Email"), "nuren@iut-dhaka.edu");
    await user.type(screen.getByLabelText("Password"), "secret");
    await user.click(screen.getByRole("button", { name: "Login" }));
    await waitFor(() => expect(auth.value.signIn).toHaveBeenCalledWith("nuren@iut-dhaka.edu", "secret"));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/messages?conversation=4"));
  });

  it("ignores a next target that points off-site", async () => {
    query.search = "next=https%3A%2F%2Fevil.example";
    const user = userEvent.setup();
    render(<AuthPage mode="login" />);
    await user.type(screen.getByLabelText("IUT Email"), "nuren@iut-dhaka.edu");
    await user.type(screen.getByLabelText("Password"), "secret");
    await user.click(screen.getByRole("button", { name: "Login" }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/"));
  });

  it("shows the reason when sign-in fails and stays on the page", async () => {
    auth.value.signIn.mockRejectedValue(new Error("Invalid login credentials"));
    const user = userEvent.setup();
    render(<AuthPage mode="login" />);
    await user.type(screen.getByLabelText("IUT Email"), "nuren@iut-dhaka.edu");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: "Login" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Invalid login credentials");
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("leaves the auth pages when a session already exists", async () => {
    auth.value.session = { access_token: "t" };
    query.search = "next=%2Fjobs";
    const { container } = render(<AuthPage mode="login" />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/jobs"));
    expect(container).toBeEmptyDOMElement();
  });

  it("sends a password reset for a valid IUT email", async () => {
    const user = userEvent.setup();
    render(<AuthPage mode="login" />);
    await user.type(screen.getByLabelText("IUT Email"), "nuren@iut-dhaka.edu");
    await user.click(screen.getByRole("button", { name: "Forgot password?" }));
    await waitFor(() => expect(auth.value.resetPassword).toHaveBeenCalledWith("nuren@iut-dhaka.edu"));
    expect(await screen.findByRole("status")).toHaveTextContent("If that account exists");
  });
});
