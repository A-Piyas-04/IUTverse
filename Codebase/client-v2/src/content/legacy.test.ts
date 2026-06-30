import { describe, expect, it } from "vitest";
import { brand, catSections, prayerTimes } from "./legacy";

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
