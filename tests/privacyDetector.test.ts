import { describe, expect, it } from "vitest";
import {
  detectSensitiveMatches,
  isValidLuhn,
  maskSensitiveValue,
  matchOcrWordsToRedactions,
} from "../src/lib/privacyDetector";
import type { OcrWord, RedactionCategory } from "../src/types/studio";

describe("privacyDetector", () => {
  it("validates credit card numbers with Luhn check", () => {
    expect(isValidLuhn("4242 4242 4242 4242")).toBe(true);
    expect(isValidLuhn("4111-1111-1111-1111")).toBe(true);
    expect(isValidLuhn("4242 4242 4242 4243")).toBe(false);
    expect(isValidLuhn("12345")).toBe(false);
  });

  it("detects Stripe, AWS, GitHub, Google, Slack, and JWT tokens", () => {
    const sample = [
      "STRIPE_KEY=sk_test_51N9xYzAbCdEfGhIjKlMnOpQr",
      "AWS=AKIAIOSFODNN7EXAMPLE",
      "GH=ghp_1234567890abcdefghijklmnopqr",
      "GAPI=AIzaSyDaGmWKa4JsXZ-HjGw7ISLn_3namBGt",
      "SLACK=xoxb-1234567890-123456789012-abcDEFghiJKL",
      "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.sIgNaTuRe123",
    ].join("\n");

    const matches = detectSensitiveMatches(sample);
    const apiMatches = matches.filter((m) => m.category === "api_key");
    expect(apiMatches.length).toBeGreaterThanOrEqual(6);
  });

  it("detects emails, phone numbers, Luhn-valid credit cards, and IPv4 addresses without flagging ISO dates", () => {
    const text =
      "Billing: jane.doe@acme-corp.io | Card 4242 4242 4242 4242 | Phone +1 (415) 890-2311 | IP 192.168.10.42 | Created 2026-11-11";
    const matches = detectSensitiveMatches(text);

    expect(matches.some((m) => m.category === "email" && m.value === "jane.doe@acme-corp.io")).toBe(true);
    expect(matches.some((m) => m.category === "credit_card" && m.value.includes("4242"))).toBe(true);
    expect(matches.some((m) => m.category === "phone" && m.value.includes("415"))).toBe(true);
    expect(matches.some((m) => m.category === "ip_address" && m.value === "192.168.10.42")).toBe(true);
    expect(matches.some((m) => m.value === "2026-11-11")).toBe(false);
  });

  it("masks values cleanly while preserving tiny prefix/suffix context", () => {
    expect(maskSensitiveValue("jane.doe@acme.io", "email")).toBe("ja***@acme.io");
    expect(maskSensitiveValue("4242 4242 4242 4242", "credit_card")).toBe("•••• •••• •••• 4242");
    expect(maskSensitiveValue("sk_test_51N9xYzAbCdEf", "api_key")).toMatch(/^sk_t•+/);
  });

  it("merges multi-word OCR tokens on the same line into a single padded redaction bounding box", () => {
    const words: OcrWord[] = [
      { text: "Card:", bbox: { x0: 10, y0: 20, x1: 50, y1: 38 }, lineId: 1 },
      { text: "4242", bbox: { x0: 60, y0: 20, x1: 100, y1: 38 }, lineId: 1 },
      { text: "4242", bbox: { x0: 108, y0: 20, x1: 148, y1: 38 }, lineId: 1 },
      { text: "4242", bbox: { x0: 156, y0: 20, x1: 196, y1: 38 }, lineId: 1 },
      { text: "4242", bbox: { x0: 204, y0: 20, x1: 244, y1: 38 }, lineId: 1 },
      { text: "ops@acme.io", bbox: { x0: 60, y0: 60, x1: 180, y1: 78 }, lineId: 2 },
    ];

    const enabled = new Set<RedactionCategory>(["credit_card", "email"]);
    const boxes = matchOcrWordsToRedactions(words, enabled);

    expect(boxes).toHaveLength(2);
    const cardBox = boxes.find((b) => b.category === "credit_card");
    const emailBox = boxes.find((b) => b.category === "email");
    expect(cardBox).toBeDefined();
    expect(cardBox!.x).toBeLessThanOrEqual(60);
    expect(cardBox!.x + cardBox!.width).toBeGreaterThanOrEqual(244);
    expect(emailBox).toBeDefined();
    expect(emailBox!.enabled).toBe(true);
    expect(emailBox!.source).toBe("auto");
  });
});
