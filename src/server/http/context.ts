import type { NextRequest } from "next/server";

export interface AuthUser {
  id: string;
  /** Same value as `id`; kept for the controllers that were written against `req.user.userId`. */
  userId: string;
  email?: string;
  name?: string | null;
  role: string;
  membershipStatus: string;
  membershipSource?: string | null;
  supabaseUser?: unknown;
}

/** A multipart file, or an object the browser already put in Storage and the API verified (`stored`). */
export interface UploadedFile {
  fieldname?: string;
  originalname: string;
  mimetype: string;
  size: number;
  buffer?: Buffer;
  stored?: boolean;
  bucket?: string;
  path?: string;
}

/**
 * What every handler receives. It plays the role of Express's `req`: route
 * params, the parsed query and body, the authenticated member, an uploaded file.
 */
export interface ApiContext {
  request: NextRequest;
  params: Record<string, string>;
  /** Repeated keys become arrays, like Express's query parser. */
  query: Record<string, string | string[]>;
  /** Parsed JSON, urlencoded or multipart fields; `{}` when the request has none. */
  body: Record<string, any>;
  file?: UploadedFile;
  user?: AuthUser;
  ip: string;
  /** Added to the final response (rate-limit headers). */
  responseHeaders: Headers;
}

/** One link of a route's chain, like an Express middleware. Returning a Response ends the chain. */
export type Step = (ctx: ApiContext) => Response | void | Promise<Response | void>;

export type Handler = (ctx: ApiContext) => Response | Promise<Response>;
