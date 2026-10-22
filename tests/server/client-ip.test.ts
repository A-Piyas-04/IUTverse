import { describe, expect, it } from "vitest";
import { UNKNOWN_IP, clientIp, ipKey } from "@/server/http/clientIp";

const headers = (forwarded?: string) => new Headers(forwarded ? { "x-forwarded-for": forwarded } : {});

describe("clientIp", () => {
  it("ignores X-Forwarded-For when no proxy is trusted, so clients cannot spoof their key", () => {
    expect(clientIp(headers("1.2.3.4"), false)).toBe(UNKNOWN_IP);
  });

  it("takes the entry the trusted proxy appended", () => {
    expect(clientIp(headers("9.9.9.9, 203.0.113.7"), 1)).toBe("203.0.113.7");
    expect(clientIp(headers("203.0.113.7"), 1)).toBe("203.0.113.7");
  });

  it("counts hops from the right when several proxies are trusted", () => {
    expect(clientIp(headers("6.6.6.6, 203.0.113.7, 10.0.0.1"), 2)).toBe("203.0.113.7");
    expect(clientIp(headers("203.0.113.7"), 3)).toBe("203.0.113.7");
  });

  it("falls back to a stand-in key without the header", () => {
    expect(clientIp(headers(), 1)).toBe(UNKNOWN_IP);
  });
});

describe("ipKey", () => {
  it("leaves IPv4 addresses alone and unwraps IPv4-mapped IPv6", () => {
    expect(ipKey("203.0.113.7")).toBe("203.0.113.7");
    expect(ipKey("::ffff:203.0.113.7")).toBe("203.0.113.7");
  });

  it("groups an IPv6 /56 into one bucket", () => {
    const a = ipKey("2001:db8:abcd:12ff:1:2:3:4");
    const b = ipKey("2001:db8:abcd:12aa:ffff:eeee:dddd:cccc");
    const other = ipKey("2001:db8:abcd:1300::1");
    expect(a).toBe(b);
    expect(a).not.toBe(other);
    expect(a).toBe("2001:db8:abcd:1200:0:0:0:0/56");
  });

  it("handles compressed forms", () => {
    expect(ipKey("::1")).toBe("0:0:0:0:0:0:0:0/56");
    expect(ipKey("not-an-ip:")).toBe("not-an-ip:");
  });
});
