import { describe, expect, it } from "vitest";
import { brand, catSections, prayerTimes } from "./siteContent";

describe("legacy content parity", () => {
  it("preserves the original login slogans", () => {
    expect(brand.loginLead).toBe("A dedicated social platform for the IUT community.");
    expect(brand.loginSlogan).toBe("Stay connected. Stay updated. Stay united.");
  });

  it("keeps every CatCorner area including the hidden game", () => {
    expect(catSections).toEqual(expect.arrayContaining(["Posts", "Cat Profiles", "Release your Stress", "Random Cat Facts", "Cat Help Desk", "Cat Game"]));
  });

  it("preserves the full mosque schedule", () => expect(prayerTimes).toHaveLength(5));
});

describe("campus info content", () => {
  it("ships the facts and brain teasers the Daily campus info dialog shows", async () => {
    const { iutFacts } = await import("./iutFacts");
    const { brainTeasers } = await import("./brainTeasers");
    expect(iutFacts.length).toBeGreaterThan(0);
    expect(iutFacts.every((fact) => fact.trim().length > 0 && !/^\d+\./.test(fact))).toBe(true);
    expect(brainTeasers.length).toBeGreaterThan(50);
    expect(brainTeasers.every((teaser) => teaser.q.length > 0 && teaser.a.length > 0 && !/^[QA]:/.test(teaser.q + teaser.a))).toBe(true);
  });
});
