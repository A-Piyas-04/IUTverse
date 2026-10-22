"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MouseEventHandler, ReactNode } from "react";

interface NavLinkProps {
  href: string;
  /** Active only on an exact match, not on nested paths. */
  end?: boolean;
  className?: string | ((state: { isActive: boolean }) => string);
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  children: ReactNode;
}

/** The active-state link the old router provided: active on the path itself or anything below it. */
export function NavLink({ href, end = false, className, onClick, children }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || (!end && pathname.startsWith(href) && pathname.charAt(href.length) === "/");
  return (
    <Link href={href} className={typeof className === "function" ? className({ isActive }) : className} aria-current={isActive ? "page" : undefined} onClick={onClick}>
      {children}
    </Link>
  );
}
