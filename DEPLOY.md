# ZCode Studio — Deploy Guide

## Opsi 1: PWABuilder (paling gampang, no PC needed)

### Step 1: Deploy ke URL publik
Pilih salah satu:

**A. Vercel (free, recommended):**
```bash
# 1. Push code ke GitHub
git push origin main

# 2. Buka https://vercel.com → New Project
# 3. Import dari GitHub repo
# 4. Set environment variable: DATABASE_URL=file:./db/custom.db
# 5. Deploy → dapet URL (https://zcode-studio.vercel.app)
```

**B. VPS + aapanel:**
```bash
# 1. Di aapanel → Website → Node.js project
# 2. Clone repo: git clone https://github.com/USERNAME/REPO.git
# 3. npm install && npm run build
# 4. Set port 3000
# 5. Setup reverse proxy domain
```

### Step 2: Generate APK via PWABuilder
1. Buka https://www.pwabuilder.com
2. Masukkan URL deploy (misal: https://zcode-studio.vercel.app)
3. Klik "Start"
4. Pilih "Android" → "Generate Package"
5. Download APK
6. Install di HP (enable "Install from unknown sources")
7. Done! ZCode Studio jadi app native di HP

---

## Opsi 2: GitHub Actions (auto-build APK)

### Step 1: Push ke GitHub
```bash
git add .
git commit -m "feat: PWA + Capacitor + APK build"
git push origin main
```

### Step 2: Trigger build
```bash
# Buat tag untuk trigger build
git tag v1.0.0
git push origin v1.0.0
```

### Step 3: Download APK
1. Buka repo GitHub → tab "Actions"
2. Tunggu build selesai (~5 menit)
3. Download APK dari artifacts
4. Atau download dari "Releases" page

---

## Opsi 3: Build manual dengan Android Studio

### Prerequisites
- Android Studio installed
- Node.js 18+
- Java 17+

### Steps
```bash
# 1. Clone repo
git clone https://github.com/USERNAME/REPO.git
cd REPO

# 2. Install deps
npm install

# 3. Build Next.js
npx next build

# 4. Install Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init ZCodeStudio com.zcode.studio --web-dir=out

# 5. Add Android platform
npx cap add android

# 6. Sync web assets
npx cap sync

# 7. Open in Android Studio
npx cap open android

# 8. Build APK
# In Android Studio: Build → Build Bundle(s)/APK(s) → Build APK(s)
```

---

## Environment Variables

| Variable | Value | Required |
|----------|-------|----------|
| DATABASE_URL | file:./db/custom.db | Yes |
| ZAI_API_KEY | your-api-key | Only for self-hosted AI |

## Backend Configuration

AI Assistant uses `z-ai-web-dev-sdk`. Options:
1. Keep using Space Z AI (if deploying there)
2. Switch to OpenAI/Groq/Anthropic (edit src/app/api/ai/route.ts)
3. Self-host with your own API key

## Database

- Development: SQLite (file-based, no setup needed)
- Production: Can switch to Supabase (already configured)

## Capacitor Config

Edit `capacitor.config.ts`:
```typescript
server: {
  url: 'https://YOUR-DEPLOYED-URL.com', // Change this!
  cleartext: true,
},
```

## Troubleshooting

**PWA not detected by PWABuilder:**
- Make sure manifest.json is served correctly
- Make sure service worker (sw.js) is accessible
- Check: https://pwabuilder.com/serviceworker

**APK build fails on GitHub Actions:**
- Check Actions tab for error logs
- Make sure all dependencies are in package.json
- Try building locally first

**App shows blank screen on APK:**
- Check capacitor.config.ts → server.url is correct
- Make sure backend is running and accessible
- Check network permissions in AndroidManifest.xml
