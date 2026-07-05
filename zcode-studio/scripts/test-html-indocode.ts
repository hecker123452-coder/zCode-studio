/**
 * Test that HTML-based IndoCode (e.g. <!tipe html><kepala>...) is properly transpiled
 * and detected by isIndoHTML.
 */
import { transpileIndoCode, isIndoHTML, getIndoCodeRuntimeHelpers } from '../src/lib/editor/indocode.ts'

const snakeHtmlIndo = `<!tipe html>
<html bahasa="id">
<kepala>
  <meta set_karakter="UTF-8">
  <meta nama="viewport" konten="width=device-width, initial-scale=1.0">
  <judul>Ular Nokia Indonesia</judul>
  <gaya>
    badan {
      margin: 0;
      latar: #111111;
      warna: #99ff99;
      font: monospace;
      rata_teks: tengah;
      sentuh: tidak_ada;
    }
    kanvas {
      border: 4px solid #99ff99;
      latar: #0f380f;
      margin_atas: 10px;
    }
    #skor {
      ukuran_font: 20px;
      tebal_font: tebal;
      warna: #99ff99;
    }
  </gaya>
</kepala>
<badan>
  <subtajuk>ULAR NOKIA INDONESIA</subtajuk>
  <div id="skor">SKOR: 0</div>
  <kanvas id="game" lebar="320" tinggi="320"></kanvas>
  <skrip>
    konstanta kanvas = ambilElemen("game");
    konstanta ctx = kanvas.konteks("2d");
    konstanta ukuran = 16;
    variabel ular = [{x: 160, y: 160}];
    variabel dx = ukuran;
    variabel dy = 0;
    variabel makanan = {x: 80, y: 80};
    variabel skor = 0;

    fungsi gambar() {
      ctx.bersihkan();
      ctx.warnaIsi("merah");
      ctx.kotak(makanan.x, makanan.y, ukuran, ukuran);
      ctx.warnaIsi("hijau");
      untuk (variabel i = 0; i < ular.panjang; i++) {
        ctx.kotak(ular[i].x, ular[i].y, ukuran, ukuran);
      }
    }

    fungsi update() {
      variabel kepala = {x: ular[0].x + dx, y: ular[0].y + dy};
      ular.dorong(kepala);
      jika (kepala.x === makanan.x && kepala.y === makanan.y) {
        makanan = {x: acakBulat(0, 19) * ukuran, y: acakBulat(0, 19) * ukuran};
        skor++;
      } kalau_tidak {
        ular.hapusDepan();
      }
    }

    selama (benar) {
      tunggu(100);
      update();
      gambar();
    }
  </skrip>
</badan>
</html>`

console.log('Test: HTML-based IndoCode transpilation')
console.log('  isIndoHTML:', isIndoHTML(snakeHtmlIndo))
const result = transpileIndoCode(snakeHtmlIndo)
console.log('  Transpile success:', result.success)
console.log('  isHTML:', result.isHTML)
console.log('  Errors:', result.errors.length)

// Check that HTML tags are translated
const expectedPatterns = [
  '<!DOCTYPE html>',
  '<html lang="id">',
  '<head>',
  '<style>',
  'background: #111111',
  'color: #99ff99',
  'text-align: center',
  'margin-top: 10px',
  '<body>',
  '<h2>',
  '<canvas id="game" width="320" height="320">',
  '<script>',
  'const kanvas = __ambilElemen("game")',
  'const ctx = kanvas.getContext("2d")',
  'ular.push(kepala)',
  'ular.shift()',
  '__gameLoop(100,',
]
let allFound = true
for (const pat of expectedPatterns) {
  if (!result.code.includes(pat)) {
    console.log('  MISSING:', pat)
    allFound = false
  }
}
console.log('  All HTML/JS patterns found:', allFound)
if (!allFound) {
  console.log('\n--- Transpiled code (first 1500 chars) ---')
  console.log(result.code.slice(0, 1500))
  process.exit(1)
}

console.log('\nTest: Runtime helpers available')
const helpers = getIndoCodeRuntimeHelpers()
const helperPatterns = [
  'function __ambilElemen',
  'function __buatElemen',
  'function __acakBulat',
  'function __tunggu',
  'function __gameLoop',
  'CanvasRenderingContext2D.prototype.bersihkan',
  'CanvasRenderingContext2D.prototype.warnaIsi',
  'CanvasRenderingContext2D.prototype.kotak',
  'HTMLElement.prototype.tambahPendengar',
]
let allHelpers = true
for (const pat of helperPatterns) {
  if (!helpers.includes(pat)) {
    console.log('  MISSING helper:', pat)
    allHelpers = false
  }
}
console.log('  All helpers found:', allHelpers)
if (!allHelpers) process.exit(1)

console.log('\nTest: Non-HTML IndoCode (pure JS)')
const jsCode = `variabel x = 10
tampilkan("Halo")
jika (x > 5) {
  tampilkan("Besar")
} kalau_tidak {
  tampilkan("Kecil")
}`
const jsResult = transpileIndoCode(jsCode)
console.log('  isHTML:', jsResult.isHTML, '(should be false)')
console.log('  Success:', jsResult.success)
console.log('  Code preview:', jsResult.code.split('\n').slice(0, 3).join(' | '))
if (jsResult.isHTML) {
  console.log('  FAIL: pure JS code should not be HTML')
  process.exit(1)
}

console.log('\n=== ALL TESTS PASSED ===')
