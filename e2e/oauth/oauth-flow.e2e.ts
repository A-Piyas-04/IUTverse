import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

// Full OAuth round trips through the real login page, Supabase Auth (GoTrue) and
// the IUTverse API, with mock-oidc.mjs standing in for the identity provider.
const SUPABASE_URL = process.env.OAUTH_E2E_SUPABASE_URL ?? "http://localhost:28000";
const DB_CONTAINER = process.env.OAUTH_E2E_DB_CONTAINER ?? "iutverse-oauth-db-1";
// Supabase's published demo anon key for local stacks (docker-compose.yml).
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

// Unique addresses per run, so the test can be repeated against the same stack.
const run = Date.now().toString(36);
const address = (name: string, domain = "iut-dhaka.edu") => `${name}.${run}@${domain}`;

const sql = (query: string) =>
  execFileSync("docker", ["exec", DB_CONTAINER, "psql", "-U", "postgres", "-d", "postgres", "-tAc", query], { encoding: "utf8" }).trim();
const literal = (value: string) => `'${value.replace(/'/g, "''")}'`;

const storedSession = (page: Page) =>
  page.evaluate(() => {
    const key = Object.keys(localStorage).find((name) => name.endsWith("-auth-token"));
    return key ? (JSON.parse(localStorage.getItem(key) as string) as { access_token: string; user: { id: string } }) : null;
  });

/** Clicks the SSO button and approves on the mock provider's sign-in page. */
const signInWithProvider = async (page: Page, email: string, name = "") => {
  await page.getByRole("button", { name: "Continue with single sign-on" }).click();
  await page.waitForURL(/^http:\/\/oidc-mock:29090\//);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Full name").fill(name);
  await page.getByRole("button", { name: "Sign in" }).click();
};

// The page's own message; Next's route announcer is also role="alert".
const errorMessage = (page: Page) => page.getByRole("alert").and(page.locator(":not(#__next-route-announcer__)"));

const me = async (page: Page) => {
  const session = await storedSession(page);
  const response = await page.request.get("/api/auth/me", { headers: { Authorization: `Bearer ${session!.access_token}` } });
  return { status: response.status(), body: await response.json() };
};

test("the login and sign-up pages offer the enabled providers", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with single sign-on" })).toBeVisible();
  await page.goto("/signup");
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
});

test("Google: the button goes through Supabase to Google with PKCE and the IUT hints", async ({ page }) => {
  // Stop before Google: the test has no real Google client. Supabase's redirect is
  // read outside the browser, which then gets a stand-in page instead of Google.
  let toSupabase: URL | null = null;
  let toGoogle: URL | null = null;
  await page.route(
    (url) => url.href.startsWith(`${SUPABASE_URL}/auth/v1/authorize`),
    async (route) => {
      toSupabase = new URL(route.request().url());
      const response = await route.fetch({ maxRedirects: 0 });
      toGoogle = new URL(response.headers()["location"]);
      await route.fulfill({ status: 200, contentType: "text/html", body: "<title>Stopped before Google</title>" });
    },
  );
  await page.goto("/login");
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect(page).toHaveTitle("Stopped before Google");

  expect(toSupabase!.searchParams.get("provider")).toBe("google");
  expect(toSupabase!.searchParams.get("code_challenge_method")).toBe("s256");
  expect(toSupabase!.searchParams.get("code_challenge")).toMatch(/^[A-Za-z0-9_-]{43}$/);
  // One fixed address, so an exact entry on Supabase's redirect allowlist matches it.
  expect(toSupabase!.searchParams.get("redirect_to")).toBe("http://localhost:28080/auth/callback");
  // The verifier that matches the challenge stays in this browser, on the app's origin.
  await page.goto("/login");
  const verifiers = await page.evaluate(() => Object.keys(localStorage).filter((key) => key.endsWith("-code-verifier")));
  expect(verifiers.length).toBeGreaterThan(0);

  expect(`${toGoogle!.origin}${toGoogle!.pathname}`).toBe("https://accounts.google.com/o/oauth2/v2/auth");
  expect(toGoogle!.searchParams.get("client_id")).toBe("iutverse-e2e-placeholder.apps.googleusercontent.com");
  expect(toGoogle!.searchParams.get("redirect_uri")).toBe(`${SUPABASE_URL}/auth/v1/callback`);
  expect(toGoogle!.searchParams.get("hd")).toBe("iut-dhaka.edu");
  expect(toGoogle!.searchParams.get("prompt")).toBe("select_account");
  expect(toGoogle!.searchParams.get("scope")).toContain("email");
  expect(toGoogle!.searchParams.get("state")).toBeTruthy();
});

test("a new IUT member signs in, gets an account, and returns to the page they asked for", async ({ page }) => {
  const email = address("new.student");
  const visited: string[] = [];
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) visited.push(frame.url());
  });

  await page.goto("/events");
  await page.waitForURL(/\/login\?next=%2Fevents$/);
  await signInWithProvider(page, email, "New Student");
  await page.waitForURL(/\/events$/);

  // PKCE: the browser saw a one-time code, never a token.
  expect(visited.some((url) => /\/auth\/callback\?code=[^&]+/.test(url))).toBe(true);
  expect(visited.filter((url) => /access_token|refresh_token/.test(url))).toEqual([]);

  const session = await storedSession(page);
  expect(session?.user.id).toMatch(/^[0-9a-f-]{36}$/);
  const profile = await me(page);
  expect(profile.status).toBe(200);
  expect(profile.body.data).toMatchObject({ email, displayName: "New Student", role: "user", membershipStatus: "active" });

  expect(sql(`select provider from auth.identities where user_id = ${literal(session!.user.id)}`)).toBe("keycloak");
  expect(sql(`select source from public.memberships where user_id = ${literal(session!.user.id)}`)).toBe("iut_domain");
});

test("signing in again with the same account reuses it", async ({ browser }) => {
  const email = address("returning");
  const ids: string[] = [];
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/login");
    await signInWithProvider(page, email, "Returning Student");
    await page.waitForURL((url) => url.pathname === "/");
    ids.push((await storedSession(page))!.user.id);
    await context.close();
  }
  expect(ids[1]).toBe(ids[0]);
  expect(sql(`select count(*) from auth.users where email = ${literal(email)}`)).toBe("1");
});

test("an account outside @iut-dhaka.edu is refused and never created", async ({ page }) => {
  const email = address("outsider", "gmail.com");
  await page.goto("/login");
  await signInWithProvider(page, email, "Outsider");
  await page.waitForURL(/\/auth\/callback/);
  await expect(errorMessage(page)).toContainText("Only verified IUT email addresses may create an account.");
  expect(await storedSession(page)).toBeNull();
  expect(sql(`select count(*) from auth.users where email = ${literal(email)}`)).toBe("0");
  await page.getByRole("link", { name: "Back to login" }).click();
  await page.waitForURL(/\/login$/);
});

test("cancelling at the provider returns to a clear message", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Continue with single sign-on" }).click();
  await page.waitForURL(/^http:\/\/oidc-mock:29090\//);
  await page.getByRole("button", { name: "Cancel" }).click();
  await page.waitForURL(/\/auth\/callback/);
  await expect(errorMessage(page)).toBeVisible();
  expect(await storedSession(page)).toBeNull();
});

test("an existing password account is linked, not duplicated", async ({ page }) => {
  const email = address("password.first");
  const password = `pw-${randomUUID()}`;
  const signup = await page.request.post(`${SUPABASE_URL}/auth/v1/signup`, {
    headers: { apikey: ANON_KEY },
    data: { email, password, data: { display_name: "Password First" } },
  });
  expect(signup.ok()).toBe(true);
  const passwordUserId = (await signup.json()).user?.id ?? (await signup.json()).id;

  await page.goto("/login");
  await signInWithProvider(page, email, "Password First");
  await page.waitForURL((url) => url.pathname === "/");
  expect((await storedSession(page))!.user.id).toBe(passwordUserId);
  expect(sql(`select string_agg(provider, ',' order by provider) from auth.identities where user_id = ${literal(passwordUserId)}`)).toBe("email,keycloak");
  expect(sql(`select count(*) from auth.users where email = ${literal(email)}`)).toBe("1");
});

test("a suspended member is turned away and left signed out", async ({ browser }) => {
  const email = address("suspended");
  const first = await browser.newContext();
  const firstPage = await first.newPage();
  await firstPage.goto("/login");
  await signInWithProvider(firstPage, email);
  await firstPage.waitForURL((url) => url.pathname === "/");
  await first.close();

  sql(`update public.memberships set status = 'suspended' where user_id = (select id from auth.users where email = ${literal(email)})`);
  const page = await browser.newPage();
  await page.goto("/login");
  await signInWithProvider(page, email);
  await page.waitForURL(/\/auth\/callback/);
  await expect(errorMessage(page)).toContainText(/membership/i);
  await expect.poll(() => storedSession(page)).toBeNull();
  await page.close();
});

test("a stolen callback code is useless in another browser", async ({ browser }) => {
  const email = address("victim");
  const victim = await browser.newContext();
  const victimPage = await victim.newPage();
  let stolen = "";
  // Approve at the provider, then follow the redirects outside the victim's browser to
  // learn where Supabase would send it, without letting the victim's browser use the code.
  await victimPage.route("http://oidc-mock:29090/realms/iut/login", async (route) => {
    const approved = await route.fetch({ url: "http://127.0.0.1:29090/realms/iut/login", maxRedirects: 0 });
    const toSupabase = await victimPage.request.get(approved.headers()["location"], { maxRedirects: 0 });
    stolen = toSupabase.headers()["location"];
    await route.abort();
  });
  await victimPage.goto("/login");
  await signInWithProvider(victimPage, email);
  await expect.poll(() => stolen).toMatch(/^http:\/\/localhost:28080\/auth\/callback\?code=/);

  const attacker = await browser.newContext();
  const attackerPage = await attacker.newPage();
  await attackerPage.goto(stolen);
  await expect(errorMessage(attackerPage)).toBeVisible();
  expect(await storedSession(attackerPage)).toBeNull();
  await attacker.close();

  // The code itself was good: the victim's browser, which holds the verifier, can use it.
  await victimPage.goto(stolen);
  await victimPage.waitForURL((url) => url.pathname === "/");
  expect((await me(victimPage)).body.data.email).toBe(email);
  await victim.close();
});

test("password-reset links that fail still go to the reset page; OAuth failures do not", async ({ page }) => {
  await page.goto("/login#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired");
  await page.waitForURL(/\/reset-password/);
  await expect(page.getByText("Email link is invalid or has expired")).toBeVisible();

  await page.goto("/auth/callback#error=access_denied&error_description=Provider+said+no");
  await expect(errorMessage(page)).toContainText("Provider said no");
  expect(new URL(page.url()).pathname).toBe("/auth/callback");
});
