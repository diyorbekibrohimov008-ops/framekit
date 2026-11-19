# FrameKit — Cross-Platform Screenshot & Product Mockup Studio

[![Live Demo](https://img.shields.io/badge/Demo-framekit--beta.vercel.app-6366f1?style=for-the-badge&logo=vercel)](https://framekit-beta.vercel.app)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-06b6d4?style=for-the-badge)](https://framekit-beta.vercel.app)
[![Privacy](https://img.shields.io/badge/Privacy-100%25%20On--Device%20Redaction-10b981?style=for-the-badge)](https://framekit-beta.vercel.app)
[![Tests](https://img.shields.io/badge/Tests-19%20Passed-emerald?style=for-the-badge)](https://framekit-beta.vercel.app)

**FrameKit** is a high-performance, cross-platform screenshot and product mockup studio built for marketing teams, developers, and product creators. It solves the biggest limitations of macOS-only tools (like CleanShot X and Xnapper) by bringing full parity to Windows and Linux, 1-click automatic privacy redaction, and shared Team Brand Kits.

> [!WARNING]
> **Project Status — Work in Progress (Not Fully Ready)**
> This project is currently under active development and is **not fully ready for production**. Some parts, features, or workflow steps will fail or behave unexpectedly. We are actively working on fixing all remaining issues.

---

## 🌟 Live Deployments & Demos

- **Live Studio Application**: [https://framekit-beta.vercel.app](https://framekit-beta.vercel.app)
- **Alternate Alias**: [https://framekit-ibroximov.vercel.app](https://framekit-ibroximov.vercel.app)
- **Live Cloud Share Page Demo**: [https://framekit-beta.vercel.app/s/bUBCvWka62](https://framekit-beta.vercel.app/s/bUBCvWka62)
- **Team Brand Kit Cloud Sync Demo**: [https://framekit-beta.vercel.app/?kit=KJGD-5EW3](https://framekit-beta.vercel.app/?kit=KJGD-5EW3)

---

## 🚀 Key Features

### 1. Cross-Platform Parity (Windows, macOS, Linux)
- Works anywhere in modern browsers with installable PWA capabilities.
- Native clipboard image paste (`Ctrl+V` / `Cmd+V`), file drag-and-drop, and Screen Capture API (`navigator.mediaDevices.getDisplayMedia`).
- Built-in sample mockups for instant testing: SaaS Billing & Secrets, CLI Deploy Logs, and Product Analytics.

### 2. 1-Click On-Device Privacy Shield
- Automatically detects sensitive patterns directly in the client before sharing or exporting:
  - **Credit Card Numbers** (validated with Luhn checksum algorithm)
  - **API Keys & Secrets** (Stripe, AWS, GitHub PATs, Slack tokens, Google API keys)
  - **Email Addresses & Phone Numbers**
  - **IPv4 Addresses**
- Multiple redaction styles: **Blur** (with adjustable strength), **Pixelate**, and **Solid Bar**.
- Interactive region findings list with individual toggle/delete and manual drag-to-blur box tool.

### 3. Team Brand Kits
- Standardize visual marketing assets across your entire company:
  - Hex color palettes (Primary, Secondary, Accent, Gradient Start/End)
  - Typography (`Plus Jakarta Sans`, `Inter`, `Space Grotesk`, `JetBrains Mono`)
  - Aspect ratio presets (`Auto`, `16:9`, `4:3`, `1:1`, `4:5`, `9:16`, `2:1`)
  - Window chrome defaults (`macOS Dark`, `macOS Light`, `Windows 11`, `Browser Bar`, `Frameless`)
  - Company logo uploads and configurable branded watermarks (Pill or Footer Bar)
- **Shareable Team Codes**: Sync presets to the cloud (`PUT /api/brand-kits/:code`) and load them with `?kit=CODE` or via `.json` import/export.

### 4. Studio Canvas & Retina Export
- Auto-balanced padding, rounded corners, and ambient lighting shadows.
- Auto-Match background gradient extraction based on screenshot color clustering.
- Interactive annotations: Callout Pills, Step Badges (`1·2·3`), Directional Arrows, and Highlights.
- Full undo/redo history (`Ctrl+Z` / `Cmd+Z`, `Ctrl+Shift+Z`).
- Export to high-resolution `1×`, `2×` (Retina), and `3×` PNG or WebP, or copy directly to clipboard.

### 5. Instant Cloud Sharing
- One-click cloud publishing powered by serverless functions and **Vercel Blob** storage.
- Public `/s/:id` viewing pages with metadata badges and direct high-res downloads.

---

## 🛠️ Tech Stack

- **Framework**: React 19, TypeScript
- **Styling**: Tailwind CSS v4
- **Bundler & Dev Server**: Vite 6
- **OCR & Privacy**: Tesseract.js client engine + regex & Luhn validator
- **Cloud Storage**: `@vercel/blob` & `@netlify/blobs` dual-provider adapter
- **Testing**: Vitest, React Testing Library, JSDOM

---

## 💻 Local Development

### Prerequisites
- Node.js 20+ or 24+
- npm or pnpm

### Setup

```bash
# Clone the repository
git clone https://github.com/<your-username>/framekit.git
cd framekit

# Install dependencies
npm install

# Start local dev server with simulated cloud storage
npm run dev
```

Visit `http://localhost:5173` in your browser.

### Running Tests

```bash
# Run unit and component test suite
npm test

# Run TypeScript type check
npm run typecheck

# Production build
npm run build
```

---

## 🌐 Deployment

### Vercel
The repository includes [vercel.json](vercel.json) preconfigured for Vite SPA routing and Serverless API functions:
1. Connect this repository in your Vercel Dashboard or run `vercel`.
2. Attach a Vercel Blob store to provision `BLOB_READ_WRITE_TOKEN`.
3. Deploy!

### Netlify
Includes [netlify.toml](netlify.toml) with edge redirects and Netlify Blobs support.

---

## 📄 License

MIT License — free for personal and commercial use.
