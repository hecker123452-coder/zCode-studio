// Test transpile user's exact IndoCode HTML file
import { transpileIndoCode, isIndoHTML } from '../src/lib/editor/indocode'

const userCode = `<!tipe html>
<html bahasa="id">
<kepala>
<judul>🐍 Ular Nokia Indonesia</judul>
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
</gaya>
</kepala>
<badan>
<h2>🐍 ULAR NOKIA INDONESIA 🗿</h2>
<div id="skor">SKOR: 0</div>
<kanvas id="game" lebar="320" tinggi="320"></kanvas>
<p>Geser jari di layar untuk bergerak 👆</p>
<skrip>
konstanta ukuranKotak = 20
konstanta jumlahKotak = 16
variabel kanvas = ambilElemen("game")
variabel pena = kanvas.konteks("2d")
variabel skor = 0
variabel ular = [{x:8,y:8},{x:7,y:8},{x:6,y:8}]
variabel arahX = 1
variabel arahY = 0
variabel makanan = {x:12,y:5}
variabel sentuhAwalX = 0
variabel sentuhAwalY = 0
variabel idPermainan

fungsi angkaAcak(maksimum) {
    kembalikan lantai(acak() * maksimum)
}

fungsi buatMakananBaru() {
    makanan.x = angkaAcak(jumlahKotak)
    makanan.y = angkaAcak(jumlahKotak)
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

kanvas.tambahPendengar("sentuhMulai", fungsi(e) {
    sentuhAwalX = e.sentuhan[0].x
    sentuhAwalY = e.sentuhan[0].y
})

kanvas.tambahPendengar("sentuhSelesai", fungsi(e) {
    variabel akhirX = e.perubahanSentuh[0].x
    variabel akhirY = e.perubahanSentuh[0].y
    variabel selisihX = akhirX - sentuhAwalX
    variabel selisihY = akhirY - sentuhAwalY
    jika (mutlak(selisihX) > mutlak(selisihY)) {
        jika (selisihX > 0) {
            kanan()
        } kalau_tidak {
            kiri()
        }
    } kalau_tidak {
        jika (selisihY > 0) {
            bawah()
        } kalau_tidak {
            atas()
        }
    }
})

fungsi gambarLingkaran(x, y, jariJari) {
    pena.mulaiJalur()
    pena.lingkaran(x, y, jariJari, 0, pi * 2)
    pena.isi()
}

fungsi gambarLatar() {
    pena.warnaIsi("#0f380f")
    pena.kotak(0, 0, 320, 320)
}

fungsi gambarMakanan() {
    pena.warnaIsi("merah")
    gambarLingkaran(makanan.x * ukuranKotak + 10, makanan.y * ukuranKotak + 10, 8)
}

fungsi gambarUlar() {
    untuk (variabel i = 0; i < ular.panjang; i++) {
        variabel bagian = ular[i]
        jika (i == 0) {
            pena.warnaIsi("#99ff99")
        } kalau_tidak {
            pena.warnaIsi("#33aa33")
        }
        pena.kotak(bagian.x * ukuranKotak, bagian.y * ukuranKotak, ukuranKotak, ukuranKotak)
    }
    variabel kepala = ular[0]
    pena.warnaIsi("hitam")
    gambarLingkaran(kepala.x * ukuranKotak + 6, kepala.y * ukuranKotak + 6, 2)
    gambarLingkaran(kepala.x * ukuranKotak + 14, kepala.y * ukuranKotak + 6, 2)
}

fungsi permainanSelesai() {
    hentikanInterval(idPermainan)
    tampilkan("GAME OVER 🗿\\nSKOR: " + skor)
}

fungsi perbarui() {
    variabel kepalaBaru = {x: ular[0].x + arahX, y: ular[0].y + arahY}
    jika (kepalaBaru.x < 0) {
        kepalaBaru.x = jumlahKotak - 1
    }
    jika (kepalaBaru.x >= jumlahKotak) {
        kepalaBaru.x = 0
    }
    jika (kepalaBaru.y < 0) {
        kepalaBaru.y = jumlahKotak - 1
    }
    jika (kepalaBaru.y >= jumlahKotak) {
        kepalaBaru.y = 0
    }
    untuk (variabel i = 0; i < ular.panjang; i++) {
        jika (kepalaBaru.x == ular[i].x && kepalaBaru.y == ular[i].y) {
            permainanSelesai()
            kembalikan
        }
    }
    ular.tambahDepan(kepalaBaru)
    jika (kepalaBaru.x == makanan.x && kepalaBaru.y == makanan.y) {
        skor = skor + 1
        ubahTeks("skor", "SKOR: " + skor)
        buatMakananBaru()
    } kalau_tidak {
        ular.hapusBelakang()
    }
}

fungsi gambar() {
    gambarLatar()
    gambarMakanan()
    gambarUlar()
}

fungsi putaranGame() {
    perbarui()
    gambar()
}

buatMakananBaru()
idPermainan = aturInterval(putaranGame, 150)
</skrip>
</badan>
</html>`

console.log('=== Is IndoCode HTML? ===')
console.log(isIndoHTML(userCode))

console.log('\n=== Transpile Result ===')
const result = transpileIndoCode(userCode)
console.log('Success:', result.success)
console.log('Errors:', result.errors.length)
if (result.errors.length > 0) {
  result.errors.forEach(err => {
    console.log(`  Line ${err.line}: ${err.message}`)
  })
}

if (result.success) {
  console.log('\n=== Generated Code (first 3000 chars) ===')
  console.log(result.code.substring(0, 3000))
  console.log('\n... (truncated)')
  
  // Search for known issues
  console.log('\n=== Issue Check ===')
  console.log('Contains "pi" (unmapped):', /\bpi\b/.test(result.code) && !result.code.includes('var pi'))
  console.log('Contains "Math.PI":', result.code.includes('Math.PI'))
  console.log('Contains "tambahDepan":', result.code.includes('tambahDepan'))
  console.log('Contains "unshift":', result.code.includes('unshift'))
  console.log('Contains "hapusBelakang":', result.code.includes('hapusBelakang'))
  console.log('Contains "pop()":', result.code.includes('pop()'))
  console.log('Contains "panjang":', /\.panjang\b/.test(result.code))
  console.log('Contains ".length":', result.code.includes('.length'))
}
