import { Suspense } from "react";
import { AuthPage } from "@/views/AuthPage";

export default function LoginPage() {
  return (
    <Suspense>
      <AuthPage mode="login" />
    </Suspense>
  );
}
