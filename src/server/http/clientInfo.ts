import "server-only";

/**
 * Optional diagnostic headers sent by the clients:
 *
 *   X-Client-Platform: web | android | ios
 *   X-Client-Version:  MAJOR.MINOR.PATCH, optionally followed by +BUILD (for example 1.4.0+57)
 *
 * They exist for observability only (request logs, "which app versions still call this?"). They are sent by the
 * client, so they can be wrong or forged: never use them for authorization or any security decision. Values outside
 * the documented format are dropped rather than rejected, so an old or odd client still works, and the closed set
 * and the strict pattern keep log lines free of injected content and keep cardinality small.
 */
export const CLIENT_PLATFORMS = ["web", "android", "ios"] as const;
export type ClientPlatform = (typeof CLIENT_PLATFORMS)[number];

export interface ClientInfo {
  platform?: ClientPlatform;
  version?: string;
}

const VERSION = /^\d{1,4}\.\d{1,4}\.\d{1,4}(?:\+\d{1,9})?$/;

export const parseClientInfo = (headers: Headers): ClientInfo => {
  const platform = headers.get("x-client-platform")?.trim().toLowerCase();
  const version = headers.get("x-client-version")?.trim();
  return {
    ...(platform && (CLIENT_PLATFORMS as readonly string[]).includes(platform) ? { platform: platform as ClientPlatform } : {}),
    ...(version && VERSION.test(version) ? { version } : {}),
  };
};
