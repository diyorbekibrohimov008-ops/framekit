import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "../src/App";

// Minimal canvas mock for jsdom
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  save: vi.fn(),
  restore: vi.fn(),
  scale: vi.fn(),
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  beginPath: vi.fn(),
  closePath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  arc: vi.fn(),
  roundRect: vi.fn(),
  clip: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  drawImage: vi.fn(),
  fillText: vi.fn(),
  measureText: vi.fn(() => ({ width: 80 })),
  createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(16 * 16 * 4) })),
  putImageData: vi.fn(),
})) as unknown as typeof HTMLCanvasElement.prototype.getContext;

HTMLCanvasElement.prototype.toDataURL = vi.fn(() => "data:image/png;base64,AAA");

describe("FrameKit Studio UI", () => {
  it("renders studio workspace with auto-loaded sample mockup and key workflow tabs", () => {
    render(<App />);
    expect(screen.getByText(/FrameKit/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Style/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Privacy/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Brand Kits/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Share Link/i })).toBeInTheDocument();
  });

  it("switches to Privacy tab and runs one-click sensitive data redaction on sample text layer", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Privacy/i }));
    const scanButton = screen.getByRole("button", { name: /Auto-Redact Secrets/i });
    fireEvent.click(scanButton);
    expect(await screen.findByText(/•••• •••• •••• 4242/i)).toBeInTheDocument();
    expect(screen.getByText(/sa\*\*\*@acme-enterprise\.io/i)).toBeInTheDocument();
    expect(screen.getByText(/Redacted \d+ sensitive item/i)).toBeInTheDocument();
  });

  it("switches to Brand Kits tab and applies a Team Brand Kit", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Brand Kits/i }));
    const kitButton = screen.getByRole("button", { name: /Apply Acme/i });
    fireEvent.click(kitButton);
    expect(screen.getByText(/Active:/i)).toHaveTextContent(/Acme/i);
  });
});
