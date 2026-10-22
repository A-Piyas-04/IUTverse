import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NavLink } from "./NavLink";

const route = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => route.pathname }));

const renderLink = (href: string, props: { end?: boolean } = {}) =>
  render(<NavLink href={href} className={({ isActive }) => (isActive ? "on" : "off")} {...props}>Link</NavLink>);

describe("NavLink", () => {
  beforeEach(() => { route.pathname = "/"; });

  it("is active on its own path and marks it as the current page", () => {
    route.pathname = "/jobs";
    renderLink("/jobs");
    const link = screen.getByRole("link", { name: "Link" });
    expect(link).toHaveClass("on");
    expect(link).toHaveAttribute("aria-current", "page");
  });

  it("is active below its path but not on a sibling that shares a prefix", () => {
    route.pathname = "/profile/abc";
    renderLink("/profile");
    expect(screen.getByRole("link")).toHaveClass("on");

    route.pathname = "/profile-reference";
    const { container } = renderLink("/profile");
    expect(container.querySelector("a")).toHaveClass("off");
  });

  it("keeps Home active only on the home page", () => {
    route.pathname = "/community";
    renderLink("/", { end: true });
    expect(screen.getByRole("link")).toHaveClass("off");
    expect(screen.getByRole("link")).not.toHaveAttribute("aria-current");
  });

  it("with end, ignores nested paths", () => {
    route.pathname = "/jobs/4";
    renderLink("/jobs", { end: true });
    expect(screen.getByRole("link")).toHaveClass("off");
  });
});
