import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button, Field, Input } from "@/components/ui/Ui";
import { useAuth } from "@/features/auth/AuthProvider";
import { brand } from "@/content/legacy";
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
  const navigate = useNavigate();
  const location = useLocation();
  const [message, setMessage] = useState("");
  const [resetting, setResetting] = useState(false);
  const login = useForm<LoginData>({ resolver: zodResolver(loginSchema) });
  const signup = useForm<SignupData>({ resolver: zodResolver(signupSchema) });
  if (!auth.loading && auth.session)
    return <Navigate to={(location.state as any)?.from || "/"} replace />;
  const isLogin = mode === "login";
  const submitLogin = login.handleSubmit(async (data) => {
    setMessage("");
    try {
      await auth.signIn(data.email, data.password);
      navigate((location.state as any)?.from || "/", { replace: true });
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
      <section className={styles.story}>
        <div className={styles.brand}>{brand.name} / IUT community</div>
        <div className={styles.copy}>
          <h1>{brand.loginTitle}</h1>
          <p>{isLogin ? brand.loginLead : brand.signupLead}</p>
          <p>{isLogin ? brand.loginSlogan : brand.signupBody}</p>
          {!isLogin && <p>{brand.signupNotice}</p>}
        </div>
        <small>Verified IUT members only</small>
      </section>
      <section className={styles.formSide}>
        <div className={styles.panel}>
          <h2>{isLogin ? "Login" : "Get Started"}</h2>
          <p>
            {isLogin
              ? "Welcome back to your campus network."
              : "Create your IUTverse account with your IUT email."}
          </p>
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
                <Link to="/signup">Get started here</Link>
              </>
            ) : (
              <>
                Already have an account? <Link to="/login">Login here</Link>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
