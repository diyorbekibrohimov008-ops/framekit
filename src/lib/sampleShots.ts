import type { OcrWord } from "../types/studio";

export interface SampleShot {
  id: string;
  name: string;
  subtitle: string;
  width: number;
  height: number;
  dataUrl: string;
  ocrWords: OcrWord[];
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.closePath();
}

function recordLineTokens(
  ctx: CanvasRenderingContext2D,
  text: string,
  startX: number,
  baselineY: number,
  fontSize: number,
  lineId: number,
  outWords: OcrWord[],
) {
  const parts = text.split(/(\s+)/);
  let cursorX = startX;
  for (const part of parts) {
    if (!part) continue;
    const width = ctx.measureText(part).width;
    if (part.trim().length > 0) {
      outWords.push({
        text: part,
        lineId,
        bbox: {
          x0: Math.round(cursorX),
          y0: Math.round(baselineY - fontSize * 0.9),
          x1: Math.round(cursorX + width),
          y1: Math.round(baselineY + fontSize * 0.35),
        },
      });
    }
    cursorX += width;
  }
}

function createBillingSample(): SampleShot {
  const width = 960;
  const height = 600;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  const ocrWords: OcrWord[] = [];

  if (ctx) {
    // Clean dark dashboard canvas
    ctx.fillStyle = "#0b1120";
    ctx.fillRect(0, 0, width, height);

    // Sidebar
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, 210, height);
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(209, 0, 1, height);

    ctx.fillStyle = "#f8fafc";
    ctx.font = "700 18px 'Bricolage Grotesque', sans-serif";
    ctx.fillText("Northstar Cloud", 28, 44);
    const navItems = ["Overview", "API Keys", "Billing", "Audit Logs", "Team"];
    navItems.forEach((label, idx) => {
      const y = 96 + idx * 40;
      if (idx === 2) {
        ctx.fillStyle = "rgba(13, 148, 136, 0.22)";
        drawRoundedRect(ctx, 18, y - 22, 174, 34, 8);
        ctx.fill();
        ctx.fillStyle = "#5eead4";
      } else {
        ctx.fillStyle = "#94a3b8";
      }
      ctx.font = "500 14px Figtree, sans-serif";
      ctx.fillText(label, 30, y);
    });

    // Header
    ctx.fillStyle = "#f8fafc";
    ctx.font = "700 22px 'Bricolage Grotesque', sans-serif";
    ctx.fillText("Production Billing & Credentials", 244, 52);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "400 13px Figtree, sans-serif";
    ctx.fillText("Last synced 2026-11-11 • Workspace ID ws_prod_8821", 244, 76);

    // Card 1: Customer & Payment Method
    ctx.fillStyle = "#111c33";
    drawRoundedRect(ctx, 244, 104, 680, 186, 14);
    ctx.fill();
    ctx.strokeStyle = "rgba(148,163,184,0.16)";
    ctx.stroke();

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "600 15px Figtree, sans-serif";
    ctx.fillText("Account Contact & Corporate Card", 268, 136);

    ctx.fillStyle = "#cbd5e1";
    ctx.font = "500 14px 'JetBrains Mono', monospace";
    const l1 = "Owner Email: sarah.chen@acme-enterprise.io";
    ctx.fillText(l1, 268, 174);
    recordLineTokens(ctx, l1, 268, 174, 14, 1, ocrWords);

    const l2 = "Corporate Visa: 4242 4242 4242 4242   Exp: 09/29";
    ctx.fillText(l2, 268, 212);
    recordLineTokens(ctx, l2, 268, 212, 14, 2, ocrWords);

    const l3 = "Billing Phone: +1 (415) 890-2311   Node IP: 192.168.10.42";
    ctx.fillText(l3, 268, 250);
    recordLineTokens(ctx, l3, 268, 250, 14, 3, ocrWords);

    // Card 2: Live Production API Keys
    ctx.fillStyle = "#111c33";
    drawRoundedRect(ctx, 244, 314, 680, 246, 14);
    ctx.fill();
    ctx.strokeStyle = "rgba(148,163,184,0.16)";
    ctx.stroke();

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "600 15px Figtree, sans-serif";
    ctx.fillText("Environment Secrets (Production)", 268, 348);

    ctx.fillStyle = "#090f1d";
    drawRoundedRect(ctx, 268, 368, 632, 166, 10);
    ctx.fill();

    ctx.fillStyle = "#38bdf8";
    ctx.font = "500 13.5px 'DM Mono', monospace";
    const s1 = "STRIPE_SECRET_KEY = sk_test_51N9xYzAbCdEfGhIjKlMnOpQr";
    ctx.fillText(s1, 288, 404);
    recordLineTokens(ctx, s1, 288, 404, 13.5, 4, ocrWords);

    ctx.fillStyle = "#fbbf24";
    const s2 = "AWS_ACCESS_KEY_ID = AKIAIOSFODNN7EXAMPLE";
    ctx.fillText(s2, 288, 444);
    recordLineTokens(ctx, s2, 288, 444, 13.5, 5, ocrWords);

    ctx.fillStyle = "#34d399";
    const s3 = "GITHUB_PAT        = ghp_9876543210abcdefghijKLMNOP";
    ctx.fillText(s3, 288, 484);
    recordLineTokens(ctx, s3, 288, 484, 13.5, 6, ocrWords);
  }

  let dataUrl = "";
  try {
    dataUrl = canvas.toDataURL("image/png");
  } catch {
    dataUrl = "data:image/png;base64,";
  }

  return {
    id: "billing-keys",
    name: "SaaS Billing + Leaked Secrets",
    subtitle: "Tests API Keys, Credit Card, Email, Phone & IPv4 redaction",
    width,
    height,
    dataUrl,
    ocrWords,
  };
}

function createTerminalSample(): SampleShot {
  const width = 900;
  const height = 520;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  const ocrWords: OcrWord[] = [];

  if (ctx) {
    ctx.fillStyle = "#090d16";
    ctx.fillRect(0, 0, width, height);

    ctx.font = "500 14.5px 'JetBrains Mono', monospace";
    const lines: Array<{ text: string; color: string }> = [
      { text: "$ framekit deploy --env production --region us-east", color: "#94a3b8" },
      { text: "✓ Built 42 modules in 1.18s (Win/macOS/Linux parity bundle)", color: "#34d399" },
      { text: "  SLACK_BOT_TOKEN = xoxb-1234567890-987654321012-abcDEFghiJKL", color: "#fbbf24" },
      { text: "  GOOGLE_API_KEY  = AIzaSyDaGmWKa4JsXZ-HjGw7ISLn_3namBGt", color: "#38bdf8" },
      { text: "  ALERT_CONTACT   = devops-oncall@launchpad.dev", color: "#f472b6" },
      { text: "  GATEWAY_HOST    = 10.24.18.92", color: "#cbd5e1" },
      { text: "✓ Published CDN edge snapshot -> https://framekit.netlify.app", color: "#818cf8" },
    ];

    lines.forEach((line, idx) => {
      const y = 64 + idx * 54;
      ctx.fillStyle = line.color;
      ctx.fillText(line.text, 36, y);
      recordLineTokens(ctx, line.text, 36, y, 14.5, idx + 1, ocrWords);
    });
  }

  let dataUrl = "";
  try {
    dataUrl = canvas.toDataURL("image/png");
  } catch {
    dataUrl = "data:image/png;base64,";
  }

  return {
    id: "cli-deploy",
    name: "CLI Deploy Logs",
    subtitle: "Terminal output with Slack, Google API keys & DevOps email",
    width,
    height,
    dataUrl,
    ocrWords,
  };
}

function createAnalyticsSample(): SampleShot {
  const width = 940;
  const height = 580;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  const ocrWords: OcrWord[] = [];

  if (ctx) {
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "#0f172a";
    ctx.font = "700 24px 'Bricolage Grotesque', sans-serif";
    ctx.fillText("Q4 Release Funnel — Cross-Platform Growth", 40, 56);

    ctx.fillStyle = "#64748b";
    ctx.font = "500 14px Figtree, sans-serif";
    const ownerLine = "Report owner: growth@framekit.io • Call +44 20 7946 0958";
    ctx.fillText(ownerLine, 40, 86);
    recordLineTokens(ctx, ownerLine, 40, 86, 14, 1, ocrWords);

    const kpis = [
      { label: "Windows + Linux Users", value: "71.4%", delta: "+24% MoM", color: "#0f766e" },
      { label: "Secrets Auto-Redacted", value: "14,820", delta: "0 leaks", color: "#059669" },
      { label: "Brand Kit Adoption", value: "94%", delta: "38 teams", color: "#0284c7" },
    ];

    kpis.forEach((kpi, i) => {
      const x = 40 + i * 294;
      ctx.fillStyle = "#ffffff";
      drawRoundedRect(ctx, x, 118, 272, 134, 16);
      ctx.fill();
      ctx.strokeStyle = "#e2e8f0";
      ctx.stroke();

      ctx.fillStyle = "#64748b";
      ctx.font = "500 13px Figtree, sans-serif";
      ctx.fillText(kpi.label, x + 22, 152);

      ctx.fillStyle = "#0f172a";
      ctx.font = "800 32px 'Bricolage Grotesque', sans-serif";
      ctx.fillText(kpi.value, x + 22, 200);

      ctx.fillStyle = kpi.color;
      ctx.font = "600 13px Figtree, sans-serif";
      ctx.fillText(kpi.delta, x + 22, 228);
    });

    // Bar chart area
    ctx.fillStyle = "#ffffff";
    drawRoundedRect(ctx, 40, 276, 860, 260, 16);
    ctx.fill();
    ctx.strokeStyle = "#e2e8f0";
    ctx.stroke();

    ctx.fillStyle = "#0f172a";
    ctx.font = "600 15px Figtree, sans-serif";
    ctx.fillText("Weekly Shared Mockups by Platform", 64, 314);

    const bars = [120, 155, 195, 225, 270, 310, 365, 410];
    bars.forEach((val, idx) => {
      const bx = 76 + idx * 96;
      const bh = Math.round((val / 430) * 165);
      const by = 500 - bh;
      const grad = ctx.createLinearGradient(0, by, 0, 500);
      grad.addColorStop(0, "#0d9488");
      grad.addColorStop(1, "#06b6d4");
      ctx.fillStyle = grad;
      drawRoundedRect(ctx, bx, by, 54, bh, 8);
      ctx.fill();
    });
  }

  let dataUrl = "";
  try {
    dataUrl = canvas.toDataURL("image/png");
  } catch {
    dataUrl = "data:image/png;base64,";
  }

  return {
    id: "product-analytics",
    name: "Growth Analytics Card",
    subtitle: "Light-mode SaaS metrics shot for Team Brand Kit styling",
    width,
    height,
    dataUrl,
    ocrWords,
  };
}

let cachedSamples: SampleShot[] | null = null;

export function getSampleShots(): SampleShot[] {
  if (!cachedSamples) {
    cachedSamples = [
      createBillingSample(),
      createTerminalSample(),
      createAnalyticsSample(),
    ];
  }
  return cachedSamples;
}
