import type { OcrWord, RedactionBox, RedactionCategory } from "../types/studio";

export interface SensitiveMatch {
  category: RedactionCategory;
  label: string;
  value: string;
  start: number;
  end: number;
}

const CATEGORY_LABELS: Record<RedactionCategory, string> = {
  api_key: "API Key / Token",
  credit_card: "Credit Card",
  email: "Email Address",
  phone: "Phone Number",
  ip_address: "IPv4 Address",
};

export function isValidLuhn(input: string): boolean {
  const digits = input.replace(/[\s-]/g, "");
  if (!/^\d{13,19}$/.test(digits)) return false;

  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = Number(digits[i]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

const API_KEY_PATTERNS: RegExp[] = [
  /\b(?:sk|pk|rk)_(?:live|test)_[0-9A-Za-z]{12,}\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\b(?:gh[pousr]_[A-Za-z0-9]{16,}|github_pat_[A-Za-z0-9_]{20,})\b/g,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
  /\bAIza[0-9A-Za-z_-]{20,}\b/g,
  /\bnpm_[A-Za-z0-9]{16,}\b/g,
  /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
];

const EMAIL_PATTERN = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g;
const CARD_CANDIDATE_PATTERN = /\b\d(?:[ -]?\d){12,18}\b/g;
const PHONE_PATTERN =
  /(?<!\d)(?:\+\d{1,3}[\s.-])?(?:\(\d{2,4}\)[\s.-]?|\d{3}[\s.-])\d{3}[\s.-]\d{4}\b/g;
const IPV4_PATTERN =
  /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g;

function collectMatches(
  text: string,
  regex: RegExp,
  category: RedactionCategory,
  filter?: (raw: string) => boolean,
): SensitiveMatch[] {
  const results: SensitiveMatch[] = [];
  const pattern = new RegExp(regex.source, regex.flags);
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const value = match[0];
    if (filter && !filter(value)) continue;
    results.push({
      category,
      label: CATEGORY_LABELS[category],
      value,
      start: match.index,
      end: match.index + value.length,
    });
  }
  return results;
}

export function detectSensitiveMatches(text: string): SensitiveMatch[] {
  if (!text) return [];

  const candidates: SensitiveMatch[] = [];
  for (const apiRegex of API_KEY_PATTERNS) {
    candidates.push(...collectMatches(text, apiRegex, "api_key"));
  }
  candidates.push(
    ...collectMatches(text, CARD_CANDIDATE_PATTERN, "credit_card", isValidLuhn),
  );
  candidates.push(...collectMatches(text, EMAIL_PATTERN, "email"));
  candidates.push(
    ...collectMatches(text, PHONE_PATTERN, "phone", (raw) => {
      const digits = raw.replace(/\D/g, "");
      return digits.length >= 10 && digits.length <= 15;
    }),
  );
  candidates.push(...collectMatches(text, IPV4_PATTERN, "ip_address"));

  // Sort by priority order (API keys/cards first), then earlier position
  const priority: Record<RedactionCategory, number> = {
    api_key: 0,
    credit_card: 1,
    email: 2,
    phone: 3,
    ip_address: 4,
  };
  candidates.sort(
    (a, b) => priority[a.category] - priority[b.category] || a.start - b.start,
  );

  // Keep non-overlapping matches
  const accepted: SensitiveMatch[] = [];
  for (const item of candidates) {
    const overlaps = accepted.some(
      (existing) => item.start < existing.end && item.end > existing.start,
    );
    if (!overlaps) {
      accepted.push(item);
    }
  }

  return accepted.sort((a, b) => a.start - b.start);
}

export function maskSensitiveValue(
  value: string,
  category: RedactionCategory,
): string {
  switch (category) {
    case "email": {
      const [local, domain] = value.split("@");
      if (!domain) return "••••";
      const prefix = local.slice(0, Math.min(2, local.length));
      return `${prefix}***@${domain}`;
    }
    case "credit_card": {
      const digits = value.replace(/\D/g, "");
      const last4 = digits.slice(-4);
      return `•••• •••• •••• ${last4}`;
    }
    case "api_key": {
      const prefix = value.slice(0, Math.min(4, value.length));
      return `${prefix}${"•".repeat(Math.max(6, Math.min(12, value.length - 4)))}`;
    }
    case "phone": {
      const digits = value.replace(/\D/g, "");
      return `••• ••• ${digits.slice(-4)}`;
    }
    case "ip_address": {
      const parts = value.split(".");
      return `•••.•••.•••.${parts[3] ?? "••"}`;
    }
  }
}

interface LineWordSpan {
  word: OcrWord;
  start: number;
  end: number;
}

function groupWordsByLine(words: OcrWord[]): OcrWord[][] {
  if (words.length === 0) return [];

  // Prefer explicit lineId when all words provide it
  if (words.every((w) => typeof w.lineId === "number")) {
    const byLine = new Map<number, OcrWord[]>();
    for (const w of words) {
      const key = w.lineId!;
      const arr = byLine.get(key) ?? [];
      arr.push(w);
      byLine.set(key, arr);
    }
    return [...byLine.values()].map((line) =>
      line.sort((a, b) => a.bbox.x0 - b.bbox.x0),
    );
  }

  // Fallback: cluster by vertical center overlap
  const sorted = [...words].sort((a, b) => a.bbox.y0 - b.bbox.y0);
  const lines: OcrWord[][] = [];
  for (const w of sorted) {
    const cy = (w.bbox.y0 + w.bbox.y1) / 2;
    const target = lines.find((line) => {
      const ref = line[0];
      const refH = Math.max(8, ref.bbox.y1 - ref.bbox.y0);
      const refCy = (ref.bbox.y0 + ref.bbox.y1) / 2;
      return Math.abs(cy - refCy) <= refH * 0.65;
    });
    if (target) {
      target.push(w);
    } else {
      lines.push([w]);
    }
  }
  return lines.map((line) => line.sort((a, b) => a.bbox.x0 - b.bbox.x0));
}

export function matchOcrWordsToRedactions(
  words: OcrWord[],
  enabledCategories: Set<RedactionCategory>,
): RedactionBox[] {
  const lines = groupWordsByLine(words);
  const boxes: RedactionBox[] = [];
  let counter = 1;

  for (const line of lines) {
    let lineText = "";
    const spans: LineWordSpan[] = [];

    for (const word of line) {
      const trimmed = word.text.trim();
      if (!trimmed) continue;
      if (lineText.length > 0) lineText += " ";
      const start = lineText.length;
      lineText += trimmed;
      const end = lineText.length;
      spans.push({ word, start, end });
    }

    const matches = detectSensitiveMatches(lineText).filter((m) =>
      enabledCategories.has(m.category),
    );

    for (const match of matches) {
      const overlapping = spans.filter(
        (s) => s.start < match.end && s.end > match.start,
      );
      if (overlapping.length === 0) continue;

      const minX = Math.min(...overlapping.map((s) => s.word.bbox.x0));
      const minY = Math.min(...overlapping.map((s) => s.word.bbox.y0));
      const maxX = Math.max(...overlapping.map((s) => s.word.bbox.x1));
      const maxY = Math.max(...overlapping.map((s) => s.word.bbox.y1));
      const padX = 6;
      const padY = 4;

      boxes.push({
        id: `redact-${counter++}-${match.category}`,
        x: Math.max(0, Math.round(minX - padX)),
        y: Math.max(0, Math.round(minY - padY)),
        width: Math.round(maxX - minX + padX * 2),
        height: Math.round(maxY - minY + padY * 2),
        category: match.category,
        label: match.label,
        maskedPreview: maskSensitiveValue(match.value, match.category),
        enabled: true,
        source: "auto",
      });
    }
  }

  return boxes;
}
