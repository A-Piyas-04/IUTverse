import { route } from "@/server/kit";

// Liveness probe for Docker and load balancers: no auth, no database, and not
// counted against the per-IP API rate limit.
export const GET = route([], () => Response.json({ status: "ok" }), { unlimited: true });
