import "server-only";
import type { Handler } from "../http/context";
import * as response from "../http/responses";
import { SEARCH_TYPES, searchEverything, type SearchType } from "../services/searchService";
import { optionalText } from "../utils/validation";

// GET /api/search?q=&type=all|people|posts|events|jobs|resources|lostFound&page=
export const search: Handler = async (ctx) => {
  const query = optionalText(ctx.query.q, { max: 100 }) ?? "";
  const type = String(ctx.query.type || "all");
  if (type !== "all" && !(SEARCH_TYPES as readonly string[]).includes(type)) {
    return response.badRequest(`type must be one of: all, ${SEARCH_TYPES.join(", ")}`);
  }
  const page = Math.min(Math.max(parseInt(String(ctx.query.page || 1), 10) || 1, 1), 50);
  return response.success(await searchEverything(query, type as SearchType | "all", page));
};
