import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Protected, RoleProtected } from "./Protected";

const auth = vi.hoisted(() => ({ value: { loading: false, session: null as unknown, user: null as unknown } }));
const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
const location = vi.hoisted(() => ({ pathname: "/jobs", search: "" }));

vi.mock("@/features/auth/AuthProvider", () => ({ useAuth: () => auth.value }));
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => location.pathname,
  useSearchParams: () => new URLSearchParams(location.search),
}));

describe("Protected", () => {
  beforeEach(() => {
    router.replace.mockReset();
    location.pathname = "/jobs";
    location.search = "";
    auth.value = { loading: false, session: null, user: null };
  });

  it("shows a loading state, not the page, while the session is being read", () => {
    auth.value = { loading: true, session: null, user: null };
    render(<Protected><p>Members only</p></Protected>);
    expect(screen.getByText("Loading IUTverse…")).toBeInTheDocument();
    expect(screen.queryByText("Members only")).not.toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("sends a visitor to login and remembers where they were going", async () => {
    location.pathname = "/messages";
    location.search = "conversation=4";
    render(<Protected><p>Members only</p></Protected>);
    expect(screen.queryByText("Members only")).not.toBeInTheDocument();
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login?next=%2Fmessages%3Fconversation%3D4"));
  });

  it("renders the page for a signed-in member", () => {
    auth.value = { loading: false, session: { access_token: "t" }, user: { id: "u1", role: "user" } };
    render(<Protected><p>Members only</p></Protected>);
    expect(screen.getByText("Members only")).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });
});

describe("RoleProtected", () => {
  beforeEach(() => router.replace.mockReset());

  it("lets administrators and moderators in", () => {
    for (const role of ["admin", "mod"]) {
      auth.value = { loading: false, session: {}, user: { id: "u", role } };
      const { unmount } = render(<RoleProtected><p>Moderation</p></RoleProtected>);
      expect(screen.getByText("Moderation")).toBeInTheDocument();
      unmount();
    }
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("sends everyone else home", async () => {
    auth.value = { loading: false, session: {}, user: { id: "u", role: "user" } };
    render(<RoleProtected><p>Moderation</p></RoleProtected>);
    expect(screen.queryByText("Moderation")).not.toBeInTheDocument();
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/"));
  });
});
