import { randomUUID } from "node:crypto";
import path from "node:path";
import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";

// Two members chatting in two browsers through the real app, Supabase Auth,
// Realtime and Storage: receipts, edits, reactions, photos, videos, voice
// messages, GIF setup and sharing a post.
const SUPABASE_URL = process.env.CHAT_E2E_SUPABASE_URL ?? "http://localhost:28000";
// Supabase's published demo anon key for local stacks (docker-compose.yml).
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const PHOTO = path.join(__dirname, "../../public/images/iut-lake-auditorium.jpg");
const VIDEO = path.join(__dirname, "fixtures/clip.mp4");

const run = Date.now().toString(36);
interface Member { email: string; password: string; name: string; context: BrowserContext; page: Page }

const createMember = async (browser: Browser, name: string): Promise<Member> => {
  const email = `${name.toLowerCase().replace(/\s+/g, ".")}.${run}@iut-dhaka.edu`;
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
  return { email, password, name, context, page };
};

const token = (page: Page) =>
  page.evaluate(() => {
    const key = Object.keys(localStorage).find((name) => name.endsWith("-auth-token"))!;
    return JSON.parse(localStorage.getItem(key)!).access_token as string;
  });

/** Starts (or opens) a direct chat from the New message dialog; returns its id. */
const openChatWith = async (page: Page, other: string) => {
  await page.goto("/messages");
  await page.getByRole("button", { name: "New message" }).click();
  await page.getByPlaceholder("Enter name or email…").fill(other);
  await page.getByRole("dialog").getByText(other, { exact: true }).click();
  await page.waitForURL(/conversation=\d+/);
  return Number(new URL(page.url()).searchParams.get("conversation"));
};

const bubble = (page: Page, text: string) => page.locator("[class*='row']").filter({ hasText: text }).last();
const composer = (page: Page) => page.getByRole("textbox", { name: /^Message / });

let a: Member;
let b: Member;
let conversationId: number;

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ browser }) => {
  a = await createMember(browser, `Ayesha ${run}`);
  b = await createMember(browser, `Tanvir ${run}`);
});

test.afterAll(async () => {
  await a?.context.close();
  await b?.context.close();
});

test("a new chat names the other member before any message is sent", async () => {
  // B leaves the app for now, so A's message cannot be delivered yet.
  await b.page.goto("about:blank");
  conversationId = await openChatWith(a.page, b.name);
  await expect(a.page.locator("header strong", { hasText: b.name })).toBeVisible();
  await expect(composer(a.page)).toHaveAttribute("placeholder", `Message ${b.name}…`);
});

test("receipts go sent, delivered when B's app is open, read when B opens the chat", async () => {
  await composer(a.page).fill("Hello from the lab");
  await composer(a.page).press("Enter");
  const mine = bubble(a.page, "Hello from the lab");
  await expect(mine.getByLabel(/^Sent/)).toBeVisible();

  // B opens IUTverse anywhere: the message reaches their app.
  await b.page.goto("/");
  await expect(mine.getByLabel(/^Delivered/)).toBeVisible();
  await expect(b.page.getByRole("complementary", { name: "Recent messages" }).getByText("Hello from the lab")).toBeVisible();

  // B opens the chat: read.
  await b.page.goto(`/messages?conversation=${conversationId}`);
  await expect(bubble(b.page, "Hello from the lab")).toBeVisible();
  await expect(mine.getByLabel(/^Read/)).toBeVisible();
});

test("A edits the message within 10 minutes and B sees it change, marked edited", async () => {
  const mine = bubble(a.page, "Hello from the lab");
  await mine.hover();
  await mine.getByRole("button", { name: "Edit message" }).click();
  const box = a.page.getByRole("textbox", { name: "Edit message" });
  await expect(box).toHaveValue("Hello from the lab");
  await box.fill("Hello from the robotics lab");
  await box.press("Enter");
  const theirs = bubble(b.page, "Hello from the robotics lab");
  await expect(theirs).toBeVisible();
  await expect(theirs.getByText("edited")).toBeVisible();
});

test("B reacts with an emoji and A sees it live; choosing it again removes it", async () => {
  const theirs = bubble(b.page, "Hello from the robotics lab");
  await theirs.hover();
  await theirs.getByRole("button", { name: "React" }).click();
  await b.page.getByRole("menuitem", { name: "React ❤️" }).click();
  const chip = bubble(a.page, "Hello from the robotics lab").getByRole("button", { name: new RegExp(`^❤️ 1, ${b.name}`) });
  await expect(chip).toBeVisible();

  await bubble(b.page, "Hello from the robotics lab").getByRole("button", { name: /^❤️ 1, You/ }).click();
  await expect(chip).toHaveCount(0);
});

test("emoji from the picker go into the text", async () => {
  await composer(a.page).fill("Good luck ");
  await a.page.getByRole("button", { name: "Emoji" }).click();
  await a.page.getByRole("textbox", { name: "Search emoji" }).fill("clover");
  await a.page.getByRole("button", { name: "🍀" }).click();
  await expect(composer(a.page)).toHaveValue("Good luck 🍀");
  await composer(a.page).press("Enter");
  await expect(bubble(b.page, "Good luck 🍀")).toBeVisible();
});

test("a photo with a caption arrives and opens full size", async () => {
  await a.page.locator('input[type="file"]').setInputFiles(PHOTO);
  await expect(a.page.getByText("iut-lake-auditorium.jpg")).toBeVisible();
  await composer(a.page).fill("The lake this evening");
  await composer(a.page).press("Enter");
  const received = bubble(b.page, "The lake this evening");
  const image = received.getByRole("img", { name: "iut-lake-auditorium.jpg" });
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(1000);
  await received.getByRole("button", { name: "Open photo" }).click();
  await expect(b.page.getByRole("dialog", { name: "Photo" })).toBeVisible();
  await b.page.keyboard.press("Escape");
});

test("a video arrives and is playable", async () => {
  await a.page.locator('input[type="file"]').setInputFiles(VIDEO);
  await expect(a.page.getByText("clip.mp4")).toBeVisible();
  await composer(a.page).fill("Robot demo");
  await composer(a.page).press("Enter");
  const video = bubble(b.page, "Robot demo").locator("video");
  await expect(video).toBeVisible();
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.readyState)).toBeGreaterThanOrEqual(1);
  expect(await video.evaluate((element: HTMLVideoElement) => element.videoWidth)).toBe(320);
});

test("a voice message records, sends with its waveform, and plays for B", async () => {
  await a.page.getByRole("button", { name: "Record voice message" }).click();
  await expect(a.page.getByRole("status", { name: "Recording a voice message" })).toBeVisible();
  await a.page.waitForTimeout(2200);
  await a.page.getByRole("button", { name: "Send voice message" }).click();

  const player = b.page.getByRole("button", { name: "Play voice message" }).last();
  await expect(player).toBeVisible();
  const row = b.page.locator("[class*='row']").filter({ has: player }).last();
  await expect(row.getByText(/^0:0[2-3]$/)).toBeVisible();
  const audio = row.locator("audio");
  await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.readyState)).toBeGreaterThanOrEqual(1);
  expect(await row.locator("[class*='wave'] span").count()).toBe(40);
  await expect(b.page.getByRole("complementary", { name: "Recent messages" }).or(b.page.getByLabel("Conversations")).getByText(/Voice message/).first()).toBeVisible();
});

test("the GIF picker says when GIFs are not set up", async () => {
  await a.page.getByRole("button", { name: "GIF" }).click();
  await expect(a.page.getByPlaceholder("Search KLIPY")).toBeVisible();
  await expect(a.page.getByText("GIFs aren’t set up on this site yet.")).toBeVisible();
  await a.page.keyboard.press("Escape");
});

test("a post shared from the feed lands in B's chat as a card", async () => {
  const created = await a.page.request.post("/api/posts", {
    headers: { Authorization: `Bearer ${await token(a.page)}` },
    multipart: { content: `Robotics club meets Thursday ${run}`, category: "discussion", isAnonymous: "false" },
  });
  expect(created.ok(), await created.text()).toBe(true);
  const postId = (await created.json()).data.id as number;

  await a.page.goto(`/posts/${postId}`);
  await a.page.getByRole("button", { name: "Share" }).first().click();
  const dialog = a.page.getByRole("dialog", { name: "Send post" });
  await dialog.getByRole("checkbox", { name: `Send to ${b.name}` }).check();
  await dialog.getByLabel("Message").fill("Want to join?");
  await dialog.getByRole("button", { name: "Send" }).click();
  await expect(dialog).toHaveCount(0);

  const card = b.page.getByRole("link", { name: new RegExp(`Robotics club meets Thursday ${run}`) });
  await expect(card).toBeVisible();
  await expect(card).toHaveAttribute("href", `/posts/${postId}`);
  await expect(bubble(b.page, "Want to join?")).toBeVisible();
});
