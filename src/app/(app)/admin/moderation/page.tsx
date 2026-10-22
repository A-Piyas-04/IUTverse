"use client";

import { RoleProtected } from "@/components/shell/Protected";
import { ModerationPage } from "@/views/ModerationPage";

export default function Page() {
  return (
    <RoleProtected>
      <ModerationPage />
    </RoleProtected>
  );
}
