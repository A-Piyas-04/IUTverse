import { Suspense } from "react";
import { AuthPage } from "@/views/AuthPage";

export default function SignupPage() {
  return (
    <Suspense>
      <AuthPage mode="signup" />
    </Suspense>
  );
}
