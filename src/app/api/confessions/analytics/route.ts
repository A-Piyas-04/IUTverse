import { route } from "@/server/kit";
import { getAnalytics } from "@/server/controllers/confessionController";

export const GET = route([], getAnalytics);
