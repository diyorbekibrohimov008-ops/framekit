import { matchOcrWordsToRedactions } from "./privacyDetector";
import type { OcrWord, RedactionBox, RedactionCategory } from "../types/studio";

export interface ScanPrivacyOptions {
  imageSource: string;
  precomputedWords?: OcrWord[];
  enabledCategories: Set<RedactionCategory>;
  onProgress?: (progress: number, status: string) => void;
}

export async function scanImageForPrivacy(
  options: ScanPrivacyOptions,
): Promise<{ boxes: RedactionBox[]; usedFallback: boolean }> {
  const { imageSource, precomputedWords, enabledCategories, onProgress } =
    options;

  // Fast-path for built-in samples that have crisp canvas word boxes,
  // while still running real Tesseract OCR on any user screenshot.
  if (precomputedWords && precomputedWords.length > 0) {
    onProgress?.(45, "Analyzing text layer...");
    const boxes = matchOcrWordsToRedactions(precomputedWords, enabledCategories);
    onProgress?.(100, "Scan complete");
    return { boxes, usedFallback: false };
  }

  onProgress?.(10, "Loading local OCR engine...");
  try {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng", undefined, {
      logger: (msg) => {
        if (msg.status === "recognizing text" && typeof msg.progress === "number") {
          onProgress?.(
            Math.min(95, Math.round(20 + msg.progress * 75)),
            "Scanning screenshot locally...",
          );
        }
      },
    });

    try {
      const result = await worker.recognize(imageSource);
      const rawWords: OcrWord[] = [];
      const blocks = result.data.blocks ?? [];
      let lineCounter = 1;

      for (const block of blocks) {
        for (const para of block.paragraphs) {
          for (const line of para.lines) {
            const currentLine = lineCounter++;
            for (const word of line.words) {
              if (!word.text.trim()) continue;
              rawWords.push({
                text: word.text,
                bbox: word.bbox,
                lineId: currentLine,
              });
            }
          }
        }
      }

      onProgress?.(100, "Scan complete");
      return {
        boxes: matchOcrWordsToRedactions(rawWords, enabledCategories),
        usedFallback: false,
      };
    } finally {
      await worker.terminate();
    }
  } catch (err) {
    console.warn("OCR scan failed or offline:", err);
    onProgress?.(100, "OCR unavailable offline — draw manual blur boxes");
    return { boxes: [], usedFallback: true };
  }
}
