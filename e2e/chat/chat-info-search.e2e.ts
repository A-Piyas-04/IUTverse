import { randomUUID } from "node:crypto";
import path from "node:path";
import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";

// The chat info panel (nicknames, mute, search, media, block, delete) and
// site-wide search, with two members in two browsers on the Docker stack.
const SUPABASE_URL = process.env.CHAT_E2E_SUPABASE_URL ?? "http://localhost:28000";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const PHOTO = path.join(__dirname, "../../public/images/iut-lake-auditorium.jpg");
const run = Date.now().toString(36);

interface Member { name: string; context: BrowserContext; page: Page }

const createMember = async (browser: Browser, name: string): Promise<Member> => {
  const email = `${name.toLowerCase().replace(/\s+/g, ".")}@iut-dhaka.edu`;
  const password = `pw-${randomUUID()}`;
  const context = await browser.newContext();
  const page = await context.newPage();
  const signup = await page.request.post(`${SUPABASE_URL}/auth/v1/signup`, { headers: { apikey: ANON_KEY }, data: { email, password, data: { display_name: name } } });
  expect(signup.ok(), await signup.text()).toBe(true);
  await page.goto("/login");
  await page.getByLabel("IUT Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Login" }).click();
  await page.waitForURL((url) => url.pathname === "/");
  return { name, context, page };
};

const token = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find((key) => key.endsWith("-auth-token"))!)!).access_token as string);
const composer = (page: Page) => page.getByRole("textbox", { name: /^Message / });
const say = async (page: Page, text: string) => {
  await composer(page).fill(text);
  await composer(page).press("Enter");
  await expect(page.locator("[class*='row']").filter({ hasText: text }).last()).toBeVisible();
};
const openInfo = (page: Page) => page.getByRole("button", { name: /^Chat info for / }).click();
const info = (page: Page) => page.getByRole("complementary", { name: /^About / });
const messagesBadge = (page: Page) => page.getByRole("complementary", { name: "Primary navigation" }).getByRole("link", { name: /Messages/ }).getByLabel(/unread$/);

let a: Member;
let b: Member;
let conversationId: number;

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ browser }) => {
  a = await createMember(browser, `Nadia ${run}`);
  b = await createMember(browser, `Imran ${run}`);
});

test.afterAll(async () => {
  await a?.context.close();
  await b?.context.close();
});

test("the navbar search finds people and posts, grouped, with a full results page", async () => {
  const created = await a.page.request.post("/api/posts", {
    headers: { Authorization: `Bearer ${await token(a.page)}` },
    multipart: { content: `Quadcopter workshop ${run} on Friday`, category: "discussion", isAnonymous: "false" },
  });
  expect(created.ok()).toBe(true);

  const box = a.page.getByRole("combobox", { name: "Search IUTverse" });
  await box.fill(`Imran ${run}`);
  const people = a.page.getByRole("region", { name: "People" });
  await expect(people.getByRole("link", { name: new RegExp(`Imran`) })).toBeVisible();

  await box.fill(`Quadcopter workshop ${run}`);
  const posts = a.page.getByRole("region", { name: "Posts" });
  await expect(posts.getByRole("link").first()).toHaveAttribute("href", /\/posts\/\d+$/);
  await a.page.getByRole("button", { name: /See all results for/ }).click();
  await a.page.waitForURL(/\/search\?q=/);
  await expect(a.page.getByRole("heading", { name: new RegExp(`Results for`) })).toBeVisible();
  await a.page.getByRole("button", { name: "Posts", exact: true }).click();
  await a.page.waitForURL(/type=posts/);
  await expect(a.page.getByRole("link", { name: /workshop/ })).toBeVisible();

  // Opening a person from search goes to their profile.
  await box.fill(`Imran ${run}`);
  await a.page.getByRole("region", { name: "People" }).getByRole("link").first().click();
  await a.page.waitForURL(/\/profile\/[0-9a-f-]{36}$/);
});

test("the chat header opens the info panel, with a link to the profile", async () => {
  await a.page.goto("/messages");
  await a.page.getByRole("button", { name: "New message" }).click();
  await a.page.getByPlaceholder("Enter name or email…").fill(b.name);
  await a.page.getByRole("dialog").getByText(b.name, { exact: true }).click();
  await a.page.waitForURL(/conversation=\d+/);
  conversationId = Number(new URL(a.page.url()).searchParams.get("conversation"));
  await say(a.page, "Hi Imran, is the lab open?");

  await openInfo(a.page);
  await expect(info(a.page).getByRole("heading", { name: b.name })).toBeVisible();
  await expect(info(a.page).getByRole("link", { name: /Profile/ })).toHaveAttribute("href", /\/profile\//);
});

test("a nickname replaces the name for everyone in the chat", async () => {
  await info(a.page).getByRole("button", { name: "Edit nicknames" }).click();
  await info(a.page).getByRole("textbox", { name: `Nickname for ${b.name}` }).fill("Lab buddy");
  await info(a.page).getByRole("button", { name: "Save" }).nth(1).click();
  await info(a.page).getByRole("button", { name: "Close chat info" }).click();
  await expect(a.page.getByRole("button", { name: "Chat info for Lab buddy" })).toBeVisible();
  await expect(a.page.getByLabel("Conversations").getByText("Lab buddy")).toBeVisible();
});

test("unread messages show on the Messages badge, and muting leaves them out", async () => {
  await a.page.goto("/");
  await b.page.goto(`/messages?conversation=${conversationId}`);
  await say(b.page, "Yes, room 304 until 6pm");
  await say(b.page, "Bring the soldering kit");
  await expect(messagesBadge(a.page)).toHaveText("2");
  await expect(a.page).toHaveTitle(/^\(2\) /);

  await a.page.goto(`/messages?conversation=${conversationId}`);
  await openInfo(a.page);
  await info(a.page).getByRole("button", { name: "Mute", exact: true }).click();
  await info(a.page).getByRole("menuitem", { name: "Until I turn it back on" }).click();
  await expect(info(a.page).getByText("Muted", { exact: true })).toBeVisible();
  await info(a.page).getByRole("button", { name: "Close chat info" }).click();
  await a.page.goto("/");
  await say(b.page, "Also the multimeter");
  await expect(a.page.getByRole("complementary", { name: "Recent messages" }).getByText("Also the multimeter")).toBeVisible();
  await expect(messagesBadge(a.page)).toHaveCount(0);
  await expect(a.page).not.toHaveTitle(/^\(\d+\) /);
});

test("searching the conversation jumps to the message", async () => {
  await a.page.goto(`/messages?conversation=${conversationId}`);
  await openInfo(a.page);
  await info(a.page).getByRole("button", { name: "Search" }).click();
  await info(a.page).getByRole("textbox", { name: "Search in conversation" }).fill("room 304");
  await info(a.page).getByRole("button", { name: /room 304 until 6pm/ }).click();
  const target = a.page.locator("[id^='message-']").filter({ hasText: "room 304 until 6pm" });
  await expect(target).toHaveClass(/rowHighlight/);
});

test("the media tab collects photos sent in the chat", async () => {
  await a.page.locator('input[type="file"]').setInputFiles(PHOTO);
  await composer(a.page).fill("The lab from outside");
  await composer(a.page).press("Enter");
  await expect(a.page.locator("[class*='row']").filter({ hasText: "The lab from outside" }).getByRole("img", { name: "iut-lake-auditorium.jpg" }).last()).toBeVisible();
  // Wait until it is saved, not just shown from the local preview.
  await expect(a.page.locator("[class*='row']").filter({ hasText: "The lab from outside" }).last().getByLabel(/^(Sent|Delivered|Read)/)).toBeVisible();
  await openInfo(a.page);
  await info(a.page).getByRole("button", { name: "Media", exact: true }).click();
  await expect(info(a.page).getByRole("button", { name: "Open photo" })).toHaveCount(1);
  await info(a.page).getByRole("button", { name: "Open photo" }).click();
  await expect(a.page.getByRole("dialog", { name: "Photo" })).toBeVisible();
  await a.page.keyboard.press("Escape");
  await a.page.keyboard.press("Escape");
});

test("blocking stops messages both ways until unblocked", async () => {
  await a.page.goto(`/messages?conversation=${conversationId}`);
  await openInfo(a.page);
  await info(a.page).getByRole("button", { name: "Block", exact: true }).click();
  await a.page.getByRole("dialog", { name: /^Block / }).getByRole("button", { name: "Block" }).click();
  await expect(a.page.getByText(/You blocked Lab buddy/)).toBeVisible();
  await expect(composer(a.page)).toHaveCount(0);

  await b.page.reload();
  await expect(b.page.getByText("You can’t reply to this conversation.")).toBeVisible();
  const sneak = await b.page.request.post("/api/chat/messages", { headers: { Authorization: `Bearer ${await token(b.page)}` }, multipart: { conversationId: String(conversationId), content: "sneaky" } });
  expect(sneak.status()).toBe(403);

  await info(a.page).getByRole("button", { name: "Close chat info" }).click();
  await a.page.getByRole("status").filter({ hasText: "You blocked" }).getByRole("button", { name: "Unblock" }).click();
  await expect(composer(a.page)).toBeVisible();
  await b.page.reload();
  await expect(composer(b.page)).toBeVisible();
});

test("deleting the chat clears it for me only, and it returns with new messages", async () => {
  await a.page.goto(`/messages?conversation=${conversationId}`);
  await openInfo(a.page);
  await info(a.page).getByRole("button", { name: "Delete chat" }).click();
  await a.page.getByRole("dialog", { name: "Delete this chat?" }).getByRole("button", { name: "Delete chat" }).click();
  await expect(a.page.getByLabel("Conversations").getByText("Lab buddy")).toHaveCount(0);

  // B still has the whole history.
  await b.page.reload();
  await expect(b.page.locator("[class*='row']").filter({ hasText: "Hi Imran, is the lab open?" })).toBeVisible();

  await say(b.page, "Are you still coming?");
  await a.page.goto("/messages");
  await expect(a.page.getByLabel("Conversations").getByText("Lab buddy")).toBeVisible();
  await a.page.getByLabel("Conversations").getByText("Lab buddy").click();
  await expect(a.page.locator("[class*='row']").filter({ hasText: "Are you still coming?" })).toBeVisible();
  await expect(a.page.locator("[class*='row']").filter({ hasText: "Hi Imran, is the lab open?" })).toHaveCount(0);
});
