"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button, Field, Input } from "@/components/ui/Ui";
import { useAuth } from "@/features/auth/AuthProvider";
import { brand } from "@/content/siteContent";
import { AuthScene } from "./AuthScene";
import { enabledOAuthProviders, OAUTH_PROVIDERS, type OAuthProvider } from "@/lib/oauth";
import { safeDestination } from "@/lib/redirect";
import styles from "./AuthPage.module.css";

const email = z
  .string()
  .email()
  .regex(/@iut-dhaka\.edu$/i, "Use your IUT email address");
const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required"),
});
const signupSchema = z.object({
  name: z.string().min(2, "Enter your display name"),
  email,
  password: z.string().min(8, "Use at least 8 characters"),
});
type LoginData = z.infer<typeof loginSchema>;
type SignupData = z.infer<typeof signupSchema>;

export function AuthPage({ mode }: { mode: "login" | "signup" }) {
  const auth = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const destination = safeDestination(params.get("next"));
  const [message, setMessage] = useState(() =>
    params.get("reset") === "success" ? "Password updated. Log in with your new password." : "",
  );
  const [resetting, setResetting] = useState(false);
  const [redirecting, setRedirecting] = useState<OAuthProvider | null>(null);
  const oauthProviders = enabledOAuthProviders();
  const login = useForm<LoginData>({ resolver: zodResolver(loginSchema) });
  const signup = useForm<SignupData>({ resolver: zodResolver(signupSchema) });
  const signedIn = !auth.loading && Boolean(auth.session);
  useEffect(() => {
    if (signedIn) router.replace(destination);
  }, [signedIn, destination, router]);
  if (signedIn) return null;
  const isLogin = mode === "login";
  const submitLogin = login.handleSubmit(async (data) => {
    setMessage("");
    try {
      await auth.signIn(data.email, data.password);
      router.replace(destination);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to log in.");
    }
  });
  const submitSignup = signup.handleSubmit(async (data) => {
    setMessage("");
    try {
      await auth.signUp(data.email, data.password, data.name);
      setMessage(
        "Account created! Check your email if confirmation is enabled.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to create account.",
      );
    }
  });
  const continueWith = async (provider: OAuthProvider) => {
    setMessage("");
    setRedirecting(provider);
    try {
      // Navigates away on success; returning here means the redirect never started.
      await auth.signInWithProvider(provider, destination);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to start sign-in.");
      setRedirecting(null);
    }
  };
  const reset = async () => {
    const value = login.getValues("email");
    const parsed = email.safeParse(value);
    if (!parsed.success) {
      login.setError("email", { message: "Enter your IUT email first" });
      return;
    }
    setResetting(true);
    try {
      await auth.resetPassword(value);
      setMessage(
        "If that account exists, a password reset email has been sent.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to request a reset.",
      );
    } finally {
      setResetting(false);
    }
  };
  return (
    <main className={styles.page}>
      <AuthScene
        lead={isLogin ? brand.loginLead : brand.signupLead}
        line={isLogin ? brand.loginSlogan : brand.signupBody}
        notice={isLogin ? undefined : brand.signupNotice}
      />
      <section className={styles.formSide}>
        <div className={styles.panel}>
          <p className={styles.kicker}>Verified IUT members only</p>
          <h2>{isLogin ? "Login" : "Get Started"}</h2>
          <p>
            {isLogin
              ? "Welcome back to your campus network."
              : "Create your IUTverse account with your IUT email."}
          </p>
          {oauthProviders.length > 0 && (
            <div className={styles.oauth}>
              {oauthProviders.map((provider) => (
                <Button
                  key={provider}
                  variant="secondary"
                  onClick={() => void continueWith(provider)}
                  disabled={redirecting !== null}
                >
                  {provider === "google" && <GoogleMark />}
                  {redirecting === provider
                    ? "Redirecting…"
                    : `Continue with ${OAUTH_PROVIDERS[provider].label}`}
                </Button>
              ))}
              <div className={styles.divider}>or use your password</div>
            </div>
          )}
          {isLogin ? (
            <form className={styles.form} onSubmit={submitLogin} noValidate>
              <Field
                label="IUT Email"
                error={login.formState.errors.email?.message}
              >
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="yourname@iut-dhaka.edu"
                  {...login.register("email")}
                />
              </Field>
              <Field
                label="Password"
                error={login.formState.errors.password?.message}
              >
                <Input
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  {...login.register("password")}
                />
              </Field>
              {message && (
                <div className={styles.message} role="status">
                  {message}
                </div>
              )}
              <Button type="submit" disabled={login.formState.isSubmitting}>
                {login.formState.isSubmitting ? "Logging in…" : "Login"}
              </Button>
              <button
                type="button"
                className={styles.link}
                onClick={() => void reset()}
                disabled={resetting}
              >
                {resetting ? "Sending reset email…" : "Forgot password?"}
              </button>
            </form>
          ) : (
            <form className={styles.form} onSubmit={submitSignup} noValidate>
              <Field
                label="Display Name"
                error={signup.formState.errors.name?.message}
              >
                <Input
                  autoComplete="name"
                  placeholder="Your name"
                  {...signup.register("name")}
                />
              </Field>
              <Field
                label="IUT Email Address"
                error={signup.formState.errors.email?.message}
              >
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="yourname@iut-dhaka.edu"
                  {...signup.register("email")}
                />
              </Field>
              <Field
                label="Password"
                error={signup.formState.errors.password?.message}
              >
                <Input
                  type="password"
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  {...signup.register("password")}
                />
              </Field>
              {message && (
                <div className={styles.message} role="status">
                  {message}
                </div>
              )}
              <Button type="submit" disabled={signup.formState.isSubmitting}>
                {signup.formState.isSubmitting
                  ? "Creating Account…"
                  : "Create Account"}
              </Button>
            </form>
          )}
          <div className={styles.switch}>
            {isLogin ? (
              <>
                Don’t have a password yet?{" "}
                <Link href="/signup">Get started here</Link>
              </>
            ) : (
              <>
                Already have an account? <Link href="/login">Login here</Link>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

// Google's "G", as its sign-in branding guidelines ask for on this button.
function GoogleMark() {
  return (
    <svg className={styles.providerMark} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
