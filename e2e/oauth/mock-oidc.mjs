// A stand-in OAuth identity provider for the OAuth end-to-end test. It speaks
// the Keycloak endpoint layout that Supabase Auth's "keycloak" provider calls,
// so the whole flow (login page -> Supabase -> provider -> Supabase -> callback)
// runs locally without real Google credentials. Test use only.
import { createHash, randomBytes } from "node:crypto";
import { createServer } from "node:http";

const PORT = Number(process.env.PORT || 29090);
const CLIENT_ID = process.env.CLIENT_ID || "iutverse-e2e";
const CLIENT_SECRET = process.env.CLIENT_SECRET || "iutverse-e2e-secret";
const BASE = "/realms/iut/protocol/openid-connect";

const codes = new Map(); // code -> { email, name, redirectUri }
const tokens = new Map(); // access token -> { email, name }
const log = [];

const escape = (value) => String(value).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const body = (req) => new Promise((resolve) => {
  let data = "";
  req.on("data", (chunk) => (data += chunk));
  req.on("end", () => resolve(new URLSearchParams(data)));
});
const send = (res, status, payload, type = "application/json") => {
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(type === "application/json" ? JSON.stringify(payload) : payload);
};
const redirect = (res, location) => {
  res.writeHead(302, { Location: location });
  res.end();
};
const withParams = (uri, params) => {
  const url = new URL(uri);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.toString();
};

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (req.method === "GET" && url.pathname === `${BASE}/auth`) {
      const q = url.searchParams;
      log.push({ step: "authorize", query: Object.fromEntries(q) });
      if (q.get("client_id") !== CLIENT_ID) return send(res, 400, "unknown client", "text/plain");
      const hidden = ["redirect_uri", "state"].map((name) => `<input type="hidden" name="${name}" value="${escape(q.get(name) || "")}">`).join("");
      return send(res, 200, `<!doctype html><title>Mock IUT sign-in</title><h1>Mock IUT sign-in</h1>
<form method="post" action="/realms/iut/login">${hidden}
<label>Email <input name="email" type="email" required></label>
<label>Full name <input name="name"></label>
<button name="action" value="approve">Sign in</button>
<button name="action" value="deny" formnovalidate>Cancel</button></form>`, "text/html");
    }

    if (req.method === "POST" && url.pathname === "/realms/iut/login") {
      const form = await body(req);
      const redirectUri = form.get("redirect_uri");
      const state = form.get("state") || "";
      if (form.get("action") === "deny") {
        return redirect(res, withParams(redirectUri, { error: "access_denied", error_description: "The user cancelled sign-in", state }));
      }
      const code = randomBytes(16).toString("hex");
      codes.set(code, { email: form.get("email"), name: form.get("name") || "", redirectUri });
      log.push({ step: "approved", email: form.get("email") });
      return redirect(res, withParams(redirectUri, { code, state }));
    }

    if (req.method === "POST" && url.pathname === `${BASE}/token`) {
      const form = await body(req);
      const basic = (req.headers.authorization || "").replace(/^Basic /, "");
      const [basicId, basicSecret] = basic ? Buffer.from(basic, "base64").toString().split(":").map(decodeURIComponent) : [];
      const clientId = basicId || form.get("client_id");
      const secret = basicSecret || form.get("client_secret");
      const grant = codes.get(form.get("code"));
      codes.delete(form.get("code")); // single use
      log.push({ step: "token", clientOk: clientId === CLIENT_ID && secret === CLIENT_SECRET, codeOk: Boolean(grant) });
      if (clientId !== CLIENT_ID || secret !== CLIENT_SECRET) return send(res, 401, { error: "invalid_client" });
      if (!grant || grant.redirectUri !== form.get("redirect_uri")) return send(res, 400, { error: "invalid_grant" });
      const accessToken = randomBytes(24).toString("hex");
      tokens.set(accessToken, grant);
      return send(res, 200, { access_token: accessToken, token_type: "Bearer", expires_in: 300 });
    }

    if (req.method === "GET" && url.pathname === `${BASE}/userinfo`) {
      const user = tokens.get((req.headers.authorization || "").replace(/^Bearer /, ""));
      if (!user) return send(res, 401, { error: "invalid_token" });
      const sub = createHash("sha256").update(user.email).digest("hex").slice(0, 24);
      return send(res, 200, { sub, email: user.email, email_verified: true, name: user.name, preferred_username: user.email.split("@")[0] });
    }

    if (req.method === "GET" && url.pathname === "/_log") return send(res, 200, log);
    return send(res, 404, "not found", "text/plain");
  } catch (error) {
    return send(res, 500, String(error), "text/plain");
  }
}).listen(PORT, () => console.log(`mock OIDC provider on :${PORT}`));
