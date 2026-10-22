"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button, Field, Input } from "@/components/ui/Ui";
import { useAuth } from "@/features/auth/AuthProvider";
import { brand } from "@/content/siteContent";
import { authLinkIntent } from "@/lib/supabase";
import styles from "./AuthPage.module.css";

// Same bounds the API enforces for password changes.
const schema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters").max(128, "Use at most 128 characters"),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, { path: ["confirm"], message: "Passwords do not match" });
type ResetData = z.infer<typeof schema>;

export function ResetPasswordPage() {
  const auth = useAuth();
  const router = useRouter();
  const [message, setMessage] = useState("");
  const form = useForm<ResetData>({ resolver: zodResolver(schema) });

  const submit = form.handleSubmit(async (data) => {
    setMessage("");
    try {
      await auth.changePassword(data.password);
      // End the temporary recovery session so the new password is what signs them in.
      await auth.signOut();
      router.replace("/login?reset=success");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update the password.");
    }
  });

  let panel;
  if (auth.loading) {
    panel = <p>Checking your reset link…</p>;
  } else if (!auth.session) {
    panel = (
      <>
        <p>{authLinkIntent.error ?? "This reset link is invalid or has expired."}</p>
        <div className={styles.message} role="alert">
          Request a new link with “Forgot password?” on the login page.
        </div>
        <div className={styles.switch}>
          <Link href="/login">Back to login</Link>
        </div>
      </>
    );
  } else {
    panel = (
      <>
        <p>Choose a new password for your IUTverse account.</p>
        <form className={styles.form} onSubmit={submit} noValidate>
          <Field label="New password" error={form.formState.errors.password?.message}>
            <Input type="password" autoComplete="new-password" placeholder="At least 8 characters" {...form.register("password")} />
          </Field>
          <Field label="Confirm new password" error={form.formState.errors.confirm?.message}>
            <Input type="password" autoComplete="new-password" placeholder="Repeat the password" {...form.register("confirm")} />
          </Field>
          {message && (
            <div className={styles.message} role="alert">
              {message}
            </div>
          )}
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving…" : "Set new password"}
          </Button>
        </form>
      </>
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.story}>
        <div className={styles.brand}>{brand.name} / IUT community</div>
        <div className={styles.copy}>
          <h1>{brand.loginTitle}</h1>
          <p>{brand.loginLead}</p>
        </div>
        <small>Verified IUT members only</small>
      </section>
      <section className={styles.formSide}>
        <div className={styles.panel}>
          <h2>Reset password</h2>
          {panel}
        </div>
      </section>
    </main>
  );
}
