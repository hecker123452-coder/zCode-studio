// Test user's snake game IndoCode
import { transpileIndoCode, isIndoHTML, detectCanvasUsage } from '../src/lib/editor/indocode.ts'

const userCode = `<!tipe html>

<html bahasa="id">

<kepala>

<judul>Ular Nokia Indonesia</judul>

<gaya>
badan {
    margin: 0;
    latar: hitam;
    warna: hijau;
    rata_teks: tengah;
    font: monospace;
    sentuh: tidak_ada;
}

kanvas {
    border: 4px solid hijau;
    margin_atas: 10px;
}
</gaya>

</kepala>

<badan>

<h2>ULAR NOKIA INDONESIA</h2>

<div id="skor">SKOR: 0</div>

<kanvas id="game" lebar="320" tinggi="320"></kanvas>

<p>Geser jari untuk bergerak</p>

<skrip>

variabel kanvas = ambilElemen("game")
variabel pena = kanvas.konteks("2d")

variabel ukuran = 20
variabel jumlah = 16

variabel skor = 0

variabel ular = [
    {x:8,y:8},
    {x:7,y:8},
    {x:6,y:8}
]

variabel arahX = 1
variabel arahY = 0

variabel makanan = {
    x:12,
    y:5
}

variabel sentuhAwalX = 0
variabel sentuhAwalY = 0

fungsi angkaAcak(maks) {
    kembalikan lantai(acak() * maks)
}

fungsi buatMakanan() {
    makanan.x = angkaAcak(jumlah)
    makanan.y = angkaAcak(jumlah)
}

fungsi atas() {
    jika (arahY != 1) {
        arahX = 0
        arahY = -1
    }
}

fungsi bawah() {
    jika (arahY != -1) {
        arahX = 0
        arahY = 1
    }
}

fungsi kiri() {
    jika (arahX != 1) {
        arahX = -1
        arahY = 0
    }
}

fungsi kanan() {
    jika (arahX != -1) {
        arahX = 1
        arahY = 0
    }
}

kanvas.saatSentuhMulai(fungsi(e){
    sentuhAwalX = e.x
    sentuhAwalY = e.y
})

kanvas.saatSentuhSelesai(fungsi(e){
    variabel dx = e.x - sentuhAwalX
    variabel dy = e.y - sentuhAwalY

    jika (mutlak(dx) > mutlak(dy)) {
        jika (dx > 0) {
            kanan()
        }
        kalau_tidak {
            kiri()
        }
    }
    kalau_tidak {
        jika (dy > 0) {
            bawah()
        }
        kalau_tidak {
            atas()
        }
    }
})

fungsi gambar() {
    pena.warnaIsi("#0f380f")
    pena.kotak(0,0,320,320)

    pena.warnaIsi("merah")

    pena.bulat(
        makanan.x * ukuran + 10,
        makanan.y * ukuran + 10,
        8
    )

    untuk (variabel i = 0; i < ular.panjang; i++) {
        variabel bagian = ular[i]

        jika (i == 0) {
            pena.warnaIsi("#99ff99")
        }
        kalau_tidak {
            pena.warnaIsi("#33aa33")
        }

        pena.kotak(
            bagian.x * ukuran,
            bagian.y * ukuran,
            ukuran,
            ukuran
        )
    }

    variabel kepala = ular[0]

    pena.warnaIsi("hitam")

    pena.bulat(
        kepala.x * ukuran + 6,
        kepala.y * ukuran + 6,
        2
    )

    pena.bulat(
        kepala.x * ukuran + 14,
        kepala.y * ukuran + 6,
        2
    )
}

fungsi perbarui() {
    variabel kepalaBaru = {
        x: ular[0].x + arahX,
        y: ular[0].y + arahY
    }

    jika (kepalaBaru.x < 0) {
        kepalaBaru.x = jumlah - 1
    }

    jika (kepalaBaru.x >= jumlah) {
        kepalaBaru.x = 0
    }

    jika (kepalaBaru.y < 0) {
        kepalaBaru.y = jumlah - 1
    }

    jika (kepalaBaru.y >= jumlah) {
        kepalaBaru.y = 0
    }

    untuk (variabel i = 0; i < ular.panjang; i++) {
        jika (
            kepalaBaru.x == ular[i].x &&
            kepalaBaru.y == ular[i].y
        ) {
            tampilkan("GAME OVER")
            berhentiProgram()
        }
    }

    ular.tambahDepan(kepalaBaru)

    jika (
        kepalaBaru.x == makanan.x &&
        kepalaBaru.y == makanan.y
    ) {
        skor = skor + 1

        ubahTeks(
            "skor",
            "SKOR: " + skor
        )

        buatMakanan()
    }
    kalau_tidak {
        ular.hapusBelakang()
    }
}

fungsi putaran() {
    perbarui()
    gambar()
}

aturInterval(
    putaran,
    150
)

</skrip>

</badan>

</html>`

console.log('=== TEST: User Snake Game ===\n')
console.log('isIndoHTML:', isIndoHTML(userCode))
console.log('detectCanvasUsage:', detectCanvasUsage(userCode))

const result = transpileIndoCode(userCode)
console.log('success:', result.success)
console.log('isHTML:', result.isHTML)
console.log('errors:', result.errors.length)
if (result.errors.length > 0) {
  console.log('error details:', result.errors)
}

console.log('\n=== TRANSPILED HTML (first 2000 chars) ===\n')
console.log(result.code.substring(0, 2000))
console.log('\n... (truncated, total length:', result.code.length, 'chars)')

// Verify key patterns in transpiled output
console.log('\n=== PATTERN CHECKS ===')
const checks = [
  ['<!DOCTYPE html>', 'Doctype'],
  ['<head>', 'head tag'],
  ['<body>', 'body tag'],
  ['<style>', 'style tag'],
  ['<script>', 'script tag'],
  ['<canvas id="game" width="320" height="320">', 'canvas tag with attrs'],
  ['<title>Ular Nokia Indonesia</title>', 'title'],
  ['lang="id"', 'lang attr'],
  ['background', 'CSS background'],
  ['color', 'CSS color'],
  ['text-align', 'CSS text-align'],
  ['font-family', 'CSS font-family'],
  ['touch-action', 'CSS touch-action'],
  ['margin-top', 'CSS margin-top'],
  ['black', 'CSS black value'],
  ['green', 'CSS green value'],
  ['center', 'CSS center value'],
  ['none', 'CSS none value'],
  ['let kanvas = __ambilElemen', 'JS ambilElemen'],
  ['getContext("2d")', 'JS getContext'],
  ['__bulat(__acak', 'JS lantai(acak())'],
  ['__aturSelang', 'JS aturInterval'],
  ['__ubahTeks', 'JS ubahTeks'],
  ['.bulat(', 'JS pena.bulat (canvas polyfill)'],
  ['.unshift(', 'JS tambahDepan → unshift'],
  ['.pop()', 'JS hapusBelakang → pop'],
  ['saatSentuhMulai', 'JS saatSentuhMulai polyfill'],
  ['saatSentuhSelesai', 'JS saatSentuhSelesai polyfill'],
  ['console.log', 'JS tampilkan → console.log'],
  ['__berhentiProgram', 'JS berhentiProgram'],
]

let passed = 0
let failed = 0
for (const [pattern, label] of checks) {
  if (result.code.includes(pattern)) {
    console.log(`  ✓ ${label}: "${pattern}"`)
    passed++
  } else {
    console.log(`  ✗ ${label}: "${pattern}" NOT FOUND`)
    failed++
  }
}

console.log(`\n=== SUMMARY: ${passed}/${checks.length} patterns found ===`)
if (failed > 0) {
  process.exit(1)
}
