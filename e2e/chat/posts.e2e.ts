import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";

// Whose posts appear where, with two members in two browsers on the Docker
// stack: profiles, anonymity, feed tabs and replies, against the real database
// and Storage rather than stubs.
const SUPABASE_URL = process.env.CHAT_E2E_SUPABASE_URL ?? "http://localhost:28000";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const PHOTO = readFileSync(path.join(__dirname, "../../public/images/iut-lake-auditorium.jpg"));
const run = Date.now().toString(36);

interface Member { id: string; name: string; context: BrowserContext; page: Page }

const token = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find((key) => key.endsWith("-auth-token"))!)!).access_token as string);
const auth = async (member: Member) => ({ Authorization: `Bearer ${await token(member.page)}` });

const createMember = async (browser: Browser, name: string): Promise<Member> => {
  const email = `${name.toLowerCase().replace(/\s+/g, ".")}@iut-dhaka.edu`;
  const password = `pw-${randomUUID()}`;
  const context = await browser.newContext();
  const page = await context.newPage();
  const signup = await page.request.post(`${SUPABASE_URL}/auth/v1/signup`, { headers: { apikey: ANON_KEY }, data: { email, password, data: { display_name: name } } });
  expect(signup.ok(), await signup.text()).toBe(true);
  const id = (await signup.json()).user?.id ?? (await signup.json()).id;
  await page.goto("/login");
  await page.getByLabel("IUT Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Login" }).click();
  await page.waitForURL((url) => url.pathname === "/");
  return { id, name, context, page };
};

const post = async (member: Member, content: string, options: { anonymous?: boolean; photo?: boolean; category?: string } = {}) => {
  const res = await member.page.request.post("/api/posts", {
    headers: await auth(member),
    multipart: {
      content,
      category: options.category ?? "discussion",
      isAnonymous: String(Boolean(options.anonymous)),
      ...(options.photo ? { image: { name: "photo.jpg", mimeType: "image/jpeg", buffer: PHOTO } } : {}),
    },
  });
  expect(res.ok(), await res.text()).toBe(true);
  return (await res.json()).data;
};

const list = async (member: Member, url: string) => {
  const res = await member.page.request.get(url, { headers: await auth(member) });
  expect(res.ok(), await res.text()).toBe(true);
  return (await res.json()).data as any[];
};
const texts = (posts: any[]) => posts.map((item) => item.content);

let a: Member;
let b: Member;
let aNamed: any;
let aSecret: any;
let bNamed: any;

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ browser }) => {
  a = await createMember(browser, `Tahmid ${run}`);
  b = await createMember(browser, `Sadia ${run}`);
  aNamed = await post(a, `Named by Tahmid ${run}`, { photo: true });
  aSecret = await post(a, `Whispered secret ${run}`, { anonymous: true, photo: true });
  bNamed = await post(b, `Named by Sadia ${run}`);
});

test.afterAll(async () => {
  await a?.context.close();
  await b?.context.close();
});

test("a profile shows that member's posts, never anyone else's or their anonymous ones", async () => {
  await b.page.goto(`/profile/${a.id}`);
  await expect(b.page.getByText(aNamed.content)).toBeVisible();
  await expect(b.page.getByText(aSecret.content)).toHaveCount(0);
  await expect(b.page.getByText(bNamed.content)).toHaveCount(0);
  await expect(b.page.getByText("1 Posts").or(b.page.locator("span", { hasText: /^1\s*Posts$/ })).first()).toBeVisible();

  await a.page.goto(`/profile/${b.id}`);
  await expect(a.page.getByText(bNamed.content)).toBeVisible();
  await expect(a.page.getByText(aNamed.content)).toHaveCount(0);
});

test("members see their own anonymous posts on their own profile", async () => {
  await a.page.goto(`/profile/${a.id}`);
  await expect(a.page.getByText(aNamed.content)).toBeVisible();
  await expect(a.page.getByText(aSecret.content)).toBeVisible();
});

test("nothing about an anonymous post identifies its author, and its image still loads", async () => {
  const seen = (await list(b, "/api/posts?limit=50")).find((item) => item.id === aSecret.id);
  expect(seen, "the anonymous post is listed").toBeTruthy();
  const raw = JSON.stringify(seen);
  expect(raw).not.toContain(a.id);
  expect(raw).not.toContain(a.name);
  expect(seen.image).toMatch(/^anonymous\//);
  expect(seen.isOwner).toBe(false);
  expect((await b.page.request.get(seen.imageUrl)).ok(), "the moved image is served").toBe(true);

  const mine = (await list(a, "/api/posts?limit=50")).find((item) => item.id === aSecret.id);
  expect(mine.isOwner).toBe(true);
  expect(mine.image).toBe(seen.image);
});

test("search and the Community tabs filter for real", async () => {
  expect(texts(await list(b, `/api/posts?search=${encodeURIComponent(`Named by Sadia ${run}`)}`))).toEqual([bNamed.content]);

  const media = await list(b, "/api/posts?category=Media&limit=50");
  expect(texts(media)).toContain(aNamed.content);
  expect(texts(media)).not.toContain(bNamed.content);

  const question = await post(b, `Question from Sadia ${run}`, { category: "question" });
  const questions = await list(a, "/api/posts?category=Questions&limit=50");
  expect(texts(questions)).toContain(question.content);
  expect(texts(questions)).not.toContain(aNamed.content);
});

test("department and batch tabs follow the author's profile through the database join", async () => {
  const set = async (member: Member, data: object) => {
    const res = await member.page.request.put("/api/profile", { headers: await auth(member), data });
    expect(res.ok(), await res.text()).toBe(true);
  };
  expect(await list(a, "/api/feed?scope=department")).toEqual([]);

  await set(a, { departmentId: 1, batch: 22 });
  await set(b, { departmentId: 1, batch: 23 });
  const department = texts(await list(a, "/api/feed?scope=department&limit=50"));
  expect(department).toEqual(expect.arrayContaining([aNamed.content, bNamed.content]));
  expect(department).not.toContain(aSecret.content);

  const batch = texts(await list(a, "/api/feed?scope=batch&limit=50"));
  expect(batch).toContain(aNamed.content);
  expect(batch).not.toContain(bNamed.content);

  await set(b, { departmentId: 2, batch: 23 });
  expect(texts(await list(a, "/api/feed?scope=department&limit=50"))).not.toContain(bNamed.content);
  expect(texts(await list(a, `/api/feed?search=${encodeURIComponent(`Named by Tahmid ${run}`)}`))).toEqual([aNamed.content]);
});

test("replies show their author's name, and a reply can be answered", async () => {
  await a.page.goto(`/posts/${aNamed.id}`);
  await a.page.getByPlaceholder("Write a thoughtful reply…").fill(`First reply ${run}`);
  await a.page.getByRole("button", { name: "Reply", exact: true }).click();
  await expect(a.page.getByText(`First reply ${run}`)).toBeVisible();

  await b.page.goto(`/posts/${aNamed.id}`);
  // The innermost block holding both the reply and its Reply button is its card.
  const card = (page: Page) => page.locator("section").filter({ hasText: `First reply ${run}` }).filter({ has: page.getByRole("button", { name: "Reply", exact: true }) }).last();
  await expect(card(b.page).getByText(a.name, { exact: true })).toBeVisible();
  await expect(b.page.getByText("IUT member", { exact: true })).toHaveCount(0);

  await card(b.page).getByRole("button", { name: "Reply", exact: true }).click();
  await card(b.page).getByPlaceholder("Write a thoughtful reply…").fill(`Nested reply ${run}`);
  await card(b.page).getByRole("button", { name: "Reply", exact: true }).last().click();
  await expect(card(b.page).getByText(`Nested reply ${run}`)).toBeVisible();

  await a.page.reload();
  await expect(card(a.page).getByText(`Nested reply ${run}`)).toBeVisible();
  await expect(card(a.page).getByText(b.name, { exact: true })).toBeVisible();
});

test("a reply cannot land on another post's comment", async () => {
  const comments = await list(a, `/api/posts/${aNamed.id}/comments`);
  const res = await b.page.request.post(`/api/posts/${bNamed.id}/comments`, { headers: await auth(b), data: { content: "stray", parentCommentId: comments[0].id } });
  expect(res.status()).toBe(400);
});

test("authors can delete their anonymous post, which then takes no reactions or replies", async () => {
  await a.page.goto(`/posts/${aSecret.id}`);
  await a.page.getByRole("button", { name: "Post options" }).click();
  await a.page.getByRole("menuitem", { name: "Delete post" }).click();
  await a.page.getByRole("dialog").getByRole("button", { name: "Delete post" }).click();
  await a.page.waitForURL(/\/community$/);

  const react = await b.page.request.post(`/api/posts/${aSecret.id}/react`, { headers: await auth(b), data: { reactionType: "like" } });
  expect(react.status()).toBe(404);
  const reply = await b.page.request.post(`/api/posts/${aSecret.id}/comments`, { headers: await auth(b), data: { content: "too late" } });
  expect(reply.status()).toBe(404);

  await b.page.goto(`/posts/${bNamed.id}`);
  await b.page.getByRole("button", { name: "Post options" }).click();
  await expect(b.page.getByRole("menuitem", { name: "Delete post" })).toBeVisible();
  await a.page.goto(`/posts/${bNamed.id}`);
  await a.page.getByRole("button", { name: "Post options" }).click();
  await expect(a.page.getByRole("menuitem", { name: "Copy link" })).toBeVisible();
  await expect(a.page.getByRole("menuitem", { name: "Delete post" })).toHaveCount(0);
});
