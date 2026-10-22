import "server-only";
import type { NextRequest } from "next/server";
import config from "../config/config";
import logger from "../utils/logger";
import { clientIp } from "./clientIp";
import type { ApiContext, Handler, Step } from "./context";
import { isPublicError } from "./errors";
import { parseBody, parseQuery } from "./request";
import { apiLimiter } from "./rateLimit";
import { exposeInternalErrors, failure, serverError } from "./responses";

type Segment = { params?: Promise<Record<string, string | string[] | undefined>> } | undefined;

const errorResponse = (error: unknown) => {
  if (isPublicError(error)) return failure(error.statusCode, error.message);
  logger.error("Unhandled request error", error);
  return serverError("Unexpected server error", (error as Error)?.message);
};

// 5xx bodies from handlers can carry raw error text; replace them unless error
// detail was explicitly enabled. The headers collected along the way (rate
// limits) are added here, and a Response is rebuilt because redirects are immutable.
const finalize = (ctx: ApiContext, response: Response) => {
  const headers = new Headers(response.headers);
  ctx.responseHeaders.forEach((value, key) => headers.set(key, value));

  if (response.status >= 500 && !exposeInternalErrors()) {
    headers.set("content-type", "application/json");
    headers.delete("content-length");
    return new Response(JSON.stringify({ success: false, message: "Internal server error" }), { status: response.status, headers });
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
};

const flattenParams = (params: Record<string, string | string[] | undefined> = {}) =>
  Object.fromEntries(Object.entries(params).map(([key, value]) => [key, Array.isArray(value) ? value.join("/") : (value ?? "")]));

export interface RouteOptions {
  /** Skip the general per-IP API limiter (health checks only). */
  unlimited?: boolean;
}

/**
 * Builds a Route Handler from an Express-style chain. The general API limiter
 * and the JSON/urlencoded body parser run first, then each step in order (auth,
 * a route's own limiter, multipart parsing, ...), then the handler. A step or
 * the handler ends the chain by returning a Response.
 */
export const route =
  (steps: Step[], handler: Handler, options: RouteOptions = {}) =>
  async (request: NextRequest, segment?: Segment): Promise<Response> => {
    const startedAt = Date.now();
    const url = new URL(request.url);
    const ctx: ApiContext = {
      request,
      params: {},
      query: parseQuery(url),
      body: {},
      ip: clientIp(request.headers, config.trustProxy),
      responseHeaders: new Headers(),
    };

    let response: Response;
    try {
      ctx.params = flattenParams(await segment?.params);
      ctx.body = await parseBody(request);

      let ended: Response | void = options.unlimited ? undefined : await apiLimiter(ctx);
      for (const step of steps) {
        if (ended) break;
        ended = await step(ctx);
      }
      response = ended ?? (await handler(ctx));
    } catch (error) {
      response = errorResponse(error);
    }

    const finalized = finalize(ctx, response);
    logger.info("request completed", {
      method: request.method,
      path: `${url.pathname}${url.search}`,
      status: finalized.status,
      durationMs: Date.now() - startedAt,
    });
    return finalized;
  };
