import { describe, expect, it } from "vitest";
import {
  CURATED_BRAND_KITS,
  generateTeamCode,
  serializeBrandKit,
  validateBrandKit,
} from "../src/lib/brandKits";

describe("brandKits", () => {
  it("provides curated starter brand kits with valid hex colors and defaults", () => {
    expect(CURATED_BRAND_KITS.length).toBeGreaterThanOrEqual(3);
    for (const kit of CURATED_BRAND_KITS) {
      expect(() => validateBrandKit(kit)).not.toThrow();
    }
  });

  it("round-trips a Brand Kit via JSON serialization and validation", () => {
    const kit = CURATED_BRAND_KITS[0];
    const json = serializeBrandKit(kit);
    const parsed = validateBrandKit(JSON.parse(json));
    expect(parsed.name).toBe(kit.name);
    expect(parsed.primaryHex).toBe(kit.primaryHex);
    expect(parsed.fontFamily).toBe(kit.fontFamily);
  });

  it("rejects unsafe logo URLs (e.g. javascript:) and invalid hex values", () => {
    expect(() =>
      validateBrandKit({
        ...CURATED_BRAND_KITS[0],
        logoDataUrl: "javascript:alert(1)",
      }),
    ).toThrow(/logo/i);

    expect(() =>
      validateBrandKit({
        ...CURATED_BRAND_KITS[0],
        primaryHex: "not-a-color",
      }),
    ).toThrow(/hex/i);
  });

  it("generates readable uppercase team sync codes", () => {
    const code = generateTeamCode();
    expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  });
});
