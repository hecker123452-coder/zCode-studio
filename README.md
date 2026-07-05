# ZCode Studio

Web-based code editor inspired by Acode. Built with Next.js 16 + Monaco Editor.

## Fitur Utama

- **Monaco Editor** — sama kayak yang dipake VS Code
- **IndoCode** — bahasa pemrograman dengan keyword bahasa Indonesia (`.indo`)
  - JS: `variabel`, `konstanta`, `fungsi`, `jika`, `selama`, `tampilkan`, `coba`/`tangkap`/`akhirnya`, `lempar`, `kelas`/`perluas`/`super`, `asinkron`/`tunggu`, `pilih`/`kasus`, `hasilkan` (yield), `generator` (function*), `atau`/`dan`/`tidak`, dll
  - HTML: `<!tipe html>`, `<kepala>`, `<badan>`, `<gaya>`, `<kanvas>`, `<skrip>`, `<tombol>`, `<daftar>`, `<tabel>`, dll (80+ tag)
  - CSS: `latar`, `warna`, `rata_teks`, `margin_atas`, `sentuh`, `batas`, `radius_batas`, `transisi`, `animasi`, `fleksibel`, `grid`, `translasi_x`, `rotasi`, `skala`, dll (100+ properti)
  - Built-in functions: `ambilElemen`, `buatElemen`, `acak`, `bulat`, `lantai`, `langit_langit`, `aturSelang`/`aturInterval`, `aturWaktu`, `masukan`, `konfirmasi`, `ubahTeks`, `ubahHTML`, `aturGaya`, `sembunyikan`, `tampilkanElemen`, `berhentiProgram`, `waktu_sekarang`, `tanggal_sekarang`, `bingkaiBerikutnya`, `mulaiTimer`, `hentikanTimer`, dll
  - Canvas polyfills: `bersihkan`, `warnaIsi`, `warnaGaris`, `kotak`, `lingkaran`, `bulat`, `garis`, `teks`, `ukuranTeks`, `pindahKe`, `garisKe`, `simpan`, `pulihkan`, `translasi`, `rotasi`, `skala`, dll
  - Array polyfills: `peta` (map), `saring` (filter), `kurangi` (reduce), `untuk_setiap` (forEach), `cari` (find), `cariIndeks` (findIndex), `urutkan` (sort), `gabung` (join), `potong` (slice), `dorong` (push), `tambahDepan` (unshift), `hapusBelakang` (pop), dll
  - String polyfills: `besar` (toUpperCase), `kecil` (toLowerCase), `belah` (split), `ganti` (replace), `gantiSemua` (replaceAll), `pangkas` (trim), `mulaiDengan` (startsWith), `akhirDengan` (endsWith), `ulang` (repeat), `pangkasMulai`/`pangkasAkhir`, `padKiri`/`padKanan`, dll
  - Modern JS support: destructuring (`konstanta [a, b] = arr`), template literal (backtick), spread/rest (`...arr`), ternary (`? :`), nullish coalescing (`??`), arrow function (`=>`), optional chaining (`?.`)
  - Pesan error dalam Bahasa Indonesia yang actionable (bukan JS mentah)
- **AI Assistant** — chat AI (mode agent/fix/tutorial/convert) dengan SSE streaming real-time
- **AI Code Helper** — panel auto-analyze kode IndoCode (BENER/SALAH + saran)
- **AI Quick Code** — panel chat cepat dengan copy code
- **Bug Scanner** — scan bug di semua file / file aktif / selection / upload (4 mode)
- **Live Preview** — preview HTML/CSS/JS real-time (locked, no drag/scroll)
- **Run Panel** — full screen run untuk IndoCode (canvas game + console)
- **Deploy** — deploy HTML project ke URL publik
- **File Explorer** — buat/hapus/rename/drag file & folder, import dari storage
- **Command Palette** — `Ctrl+Shift+P`
- **Quick Open** — `Ctrl+P`
- **Viewport Lock** — anti pinch-zoom, anti double-tap zoom, anti scroll (cocok untuk WebView APK)

## Cara Menjalankan

```bash
# 1. Install dependencies
bun install
# atau: npm install / pnpm install

# 2. Setup database
bun run db:generate
bun run db:push

# 3. Jalankan dev server
bun run dev

# 4. Buka http://localhost:3000
```

## Cara Build Production

```bash
bun run build
bun run start
```

## Environment Variables

Buat file `.env` di root:

```
DATABASE_URL=file:./db/custom.db
# ZAI_API_KEY=...  (otomatis di-configure di z-ai-web-dev-sdk)
```

## Bahasa IndoCode — Contoh

### JS IndoCode (snake game)

```javascript
konstanta kanvas = ambilElemen("game")
konstanta ctx = kanvas.konteks("2d")
variabel ular = [{x: 160, y: 160}]

selama (benar) {
  tunggu(100)
  // ... game logic
}
```

### HTML IndoCode

```html
<!tipe html>
<html bahasa="id">
<kepala>
  <gaya>
    badan { latar: #111; warna: #99ff99; }
    kanvas { border: 4px solid #99ff99; }
  </gaya>
</kepala>
<badan>
  <kanvas id="game" lebar="320" tinggi="320"></kanvas>
  <skrip>
    konstanta kanvas = ambilElemen("game")
    // ...
  </skrip>
</badan>
</html>
```

## Menu Scan Bug

Tombol Scan Bug (icon tameng hijau) ada di:
- **Top menu bar (desktop)** — menu "Tools" → "Scan Bug (Semua File)" atau tombol hijau "Scan Bug"
- **Top menu bar (mobile)** — icon tameng hijau di toolbar atas
- **Mobile menu (hamburger)** — tombol hijau besar "Scan Bug"
- **Command Palette** — `Ctrl+Shift+P` → "Scan All Files for Bugs"

4 mode scan:
1. **Semua File** — scan semua file di project
2. **File Aktif** — scan file yang sedang dibuka
3. **Pilih File** — pilih file mana yang mau di-scan
4. **Upload** — upload file dari device untuk di-scan

## Teknologi

- Next.js 16.1.3 (Turbopack)
- React 19
- TypeScript 5
- Tailwind CSS 4
- shadcn/ui (Radix UI)
- Prisma 6 (SQLite) — untuk persistensi deployed project
- Monaco Editor 0.55
- Zustand 5 (state management)
- z-ai-web-dev-sdk 0.0.18 (AI chat) — lihat catatan di bawah
- React Resizable Panels

## Catatan Deploy & Ketergantungan Platform

### z-ai-web-dev-sdk & Caddyfile

Project ini awalnya dibangun di atas platform AI-builder tertentu (terlihat dari
`Caddyfile` yang melakukan routing `XTransformPort` dan auto-config
`ZAI_API_KEY`). Karena itu, fitur AI Assistant bergantung pada SDK
`z-ai-web-dev-sdk` yang otomatis menggunakan API key dari environment platform
tersebut.

**Untuk deploy sendiri di luar platform asal (Vercel / VPS / APK WebView):**

1. **Fitur AI Assistant (`/api/ai`) kemungkinan tidak akan langsung jalan.**
   Anda perlu mengganti SDK-nya dengan provider AI standar (OpenAI, Anthropic,
   Groq, dll):
   - Hapus `import ZAI from 'z-ai-web-dev-sdk'` di `src/app/api/ai/route.ts`
   - Ganti pemanggilan `zai.chat.completions.create(...)` dengan SDK pilihan
     Anda (mis. `openai.chat.completions.create(...)`)
   - Set API key Anda sendiri via environment variable
2. **Caddyfile** tidak diperlukan kalau Anda pakai reverse proxy lain (Nginx,
   Cloudflare, dll) atau deploy langsung ke Vercel/Netlify. Hapus file ini
   kalau tidak dipakai.

### Database (Prisma + SQLite)

Schema Prisma (`prisma/schema.prisma`) sekarang punya model `DeployedProject`
yang dipakai oleh fitur Deploy untuk persistensi (sebelumnya in-memory, sekarang
persist ke SQLite). Model `User` dan `Post` masih boilerplate starter — bisa
dihapus kalau Anda tidak butuh autentikasi multi-user.

### Keamanan Deploy

HTML yang di-deploy di-serve di path `/d/:id` pada **origin yang sama** dengan
aplikasi editor. Ini berarti script di deployed HTML BISA mengakses
`localStorage` origin editor (tempat file project disimpan).

Untuk produksi publik, disarankan:
- Pindahkan served HTML ke subdomain terpisah (mis. `d.example.com`) untuk
  isolasi origin — ini yang dilakukan CodePen/JSFiddle, ATAU
- Serve dengan `Content-Security-Policy` ketat (sudah di-set di
  `src/app/d/[id]/route.ts` sebagai defense-in-depth, tapi tidak mengisolasi
  origin sepenuhnya)

## Lisensi

MIT
