"use client";

import { RoleProtected } from "@/components/shell/Protected";
import { ModerationPage } from "@/features/moderation/ModerationPage";

export default function Page() {
  return (
    <RoleProtected>
      <ModerationPage />
    </RoleProtected>
  );
}
