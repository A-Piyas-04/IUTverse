import { route } from "@/server/kit";
import { getRandomConfession } from "@/server/controllers/confessionController";

export const GET = route([], getRandomConfession);
