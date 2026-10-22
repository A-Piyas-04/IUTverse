// Where to send a member after sign-in. `next` comes from the URL, so only
// same-site paths are honored: anything that could leave the site (//host,
// /\host, absolute URLs) or loop back to the auth pages falls back to home.
export const safeDestination = (value: string | null | undefined, fallback = "/") => {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (/^\/(login|signup)(\/|\?|#|$)/.test(value)) return fallback;
  return value;
};
