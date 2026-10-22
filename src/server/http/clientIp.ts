/** Stand-in key when the client address cannot be determined. */
export const UNKNOWN_IP = "unknown";

/**
 * The client address for rate limiting. `hops` is the number of reverse
 * proxies you operate in front of the app; each appends one entry to
 * X-Forwarded-For, so the client is the entry `hops` from the right. With no
 * trusted proxy the header is client-controlled and is ignored.
 */
export const clientIp = (headers: Headers, hops: number | false): string => {
  if (!hops) return UNKNOWN_IP;
  const forwarded = (headers.get("x-forwarded-for") || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (!forwarded.length) return UNKNOWN_IP;
  return forwarded[Math.max(forwarded.length - hops, 0)];
};

const expandIpv6 = (ip: string): number[] | null => {
  let address = ip.split("%")[0];
  const mapped = /^(.*:)(\d{1,3}(?:\.\d{1,3}){3})$/.exec(address);
  if (mapped) {
    const octets = mapped[2].split(".").map(Number);
    address = `${mapped[1]}${((octets[0] << 8) | octets[1]).toString(16)}:${((octets[2] << 8) | octets[3]).toString(16)}`;
  }
  const halves = address.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 ? head.length !== 8 : missing < 0) return null;
  const groups = [...head, ...Array(halves.length === 2 ? missing : 0).fill("0"), ...tail].map((group) => parseInt(group, 16));
  return groups.length === 8 && groups.every((group) => Number.isInteger(group) && group >= 0 && group <= 0xffff) ? groups : null;
};

/**
 * Groups clients into one rate-limit bucket per IPv6 /56 (one subscriber's
 * allocation, so they cannot dodge a limit by rotating addresses). IPv4 and
 * IPv4-mapped addresses are used as they are.
 */
export const ipKey = (ip: string, ipv6Subnet = 56): string => {
  if (!ip.includes(":")) return ip;
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(ip);
  if (mapped) return mapped[1];
  const groups = expandIpv6(ip);
  if (!groups) return ip;
  const kept = groups.map((group, index) => {
    const bitsBefore = index * 16;
    if (bitsBefore + 16 <= ipv6Subnet) return group;
    if (bitsBefore >= ipv6Subnet) return 0;
    const keep = ipv6Subnet - bitsBefore;
    return group & (0xffff << (16 - keep)) & 0xffff;
  });
  return `${kept.map((group) => group.toString(16)).join(":")}/${ipv6Subnet}`;
};
