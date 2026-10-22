import { route } from "@/server/kit";
import { weather } from "@/server/controllers/communityController";

export const GET = route([], weather);
