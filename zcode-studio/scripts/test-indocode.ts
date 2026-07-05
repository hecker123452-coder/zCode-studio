// Test script: verify IndoCode transpilation works correctly
// Run: bun run /home/z/my-project/scripts/test-indocode.ts

import { transpileIndoCode, detectCanvasUsage } from '../src/lib/editor/indocode.ts'

const testCases: { name: string; code: string; expectedInOutput?: string[]; usesCanvas?: boolean }[] = [
  {
    name: 'Basic: variable + if/else + tampilkan',
    code: `variabel angka = 10
jika (angka > 10) {
    tampilkan("Lebih besar")
} atau_jika (angka == 10) {
    tampilkan("Sama dengan 10")
} kalau_tidak {
    tampilkan("Lebih kecil")
}`,
    expectedInOutput: ['let angka = 10', 'if (angka > 10)', 'else if (angka == 10)', 'else', 'console.log("Sama dengan 10")'],
  },
  {
    name: 'For loop + function',
    code: `untuk (variabel i = 1; i <= 5; i++) {
    tampilkan("Loop ke-" + i)
}

fungsi sapa(nama) {
    kembalikan "Halo " + nama
}`,
    expectedInOutput: ['for (let i = 1; i <= 5; i++)', 'console.log("Loop ke-" + i)', 'function sapa(nama)', 'return "Halo " + nama'],
  },
  {
    name: 'Array methods (untuk_setiap, panjang, dorong)',
    code: `variabel arr = [1, 2, 3]
arr.untuk_setiap(fungsi(x) { tampilkan(x) })
tampilkan(arr.panjang)
arr.dorong(4)`,
    expectedInOutput: ['arr.forEach(function(x)', 'arr.length', 'arr.push(4)'],
  },
  {
    name: 'Math functions (maks, min, acakBulat, bulatkan)',
    code: `variabel x = maks(1, 2, 3)
variabel y = min(4, 5, 6)
variabel z = acakBulat(0, 10)
variabel w = bulatkan(3.7)`,
    expectedInOutput: ['__maks(1, 2, 3)', '__min(4, 5, 6)', '__acakBulat(0, 10)', '__bulatkan(3.7)'],
  },
  {
    name: 'Canvas game (snake pattern)',
    code: `konstanta kanvas = ambilElemen("game")
konstanta ctx = kanvas.konteks("2d")
ctx.bersihkan()
ctx.warnaIsi("merah")
ctx.kotak(10, 20, 30, 40)
selama (benar) {
    tunggu(120)
    perbarui()
}`,
    // ctx.bersihkan etc stay as-is (polyfilled at runtime via CanvasRenderingContext2D.prototype.bersihkan)
    // while(true)+tunggu is transformed to __gameLoop to prevent browser hang
    expectedInOutput: ['const kanvas = __ambilElemen("game")', 'kanvas.getContext("2d")', 'ctx.bersihkan()', 'ctx.warnaIsi("merah")', '__gameLoop(120', 'perbarui()'],
    usesCanvas: true,
  },
  {
    name: 'Switch case',
    code: `pilih (hari) {
    kasus 1: tampilkan("Senin"); putus
    kasus 2: tampilkan("Selasa"); putus
    kasus_lain: tampilkan("Lainnya")
}`,
    expectedInOutput: ['switch (hari)', 'case 1:', 'console.log("Senin")', 'break', 'default:'],
  },
  {
    name: 'Try/catch + throw',
    code: `coba {
    lempar "Error bro"
} tangkap (e) {
    tampilkan(e)
} akhirnya {
    tampilkan("Selesai")
}`,
    expectedInOutput: ['try {', 'throw "Error bro"', 'catch (e)', 'finally {'],
  },
  {
    name: 'Class with extends',
    code: `kelas Hewan {
    konstruktor(nama) {
        ini.nama = nama
    }
    bersuara() {
        tampilkan(ini.nama)
    }
}
kelas Kucing perluas Hewan {
    bersuara() {
        tampilkan("Meong")
    }
}`,
    expectedInOutput: ['class Hewan', 'this.nama', 'class Kucing extends Hewan'],
  },
  {
    name: 'Async/await with tunggu',
    code: `asinkron fungsi fetchData() {
    tunggu(1000)
    kembalikan "data"
}`,
    expectedInOutput: ['async function fetchData', 'await __tunggu(1000)', 'return "data"'],
  },
  {
    name: 'String methods',
    code: `variabel s = "Halo Dunia"
tampilkan(s.besar())
tampilkan(s.kecil())
tampilkan(s.panjang)
tampilkan(s.belah(" "))`,
    expectedInOutput: ['s.toUpperCase()', 's.toLowerCase()', 's.length', 's.split(" ")'],
  },
  {
    name: 'User input helpers',
    code: `variabel nama = masukan("Siapa nama lo?")
jika (konfirmasi("Yakin?")) {
    tampilkan("OK")
}`,
    expectedInOutput: ['__masukan("Siapa nama lo?")', '__konfirmasi("Yakin?")'],
  },
  {
    name: 'Aliases (selain_itu, cetak, kembali, hentikan)',
    code: `jika (x > 0) {
    cetak("positif")
} selain_itu {
    cetak("negatif")
}
fungsi stop() { hentikan() }`,
    expectedInOutput: ['if (x > 0)', 'console.log("positif")', 'else', '__berhentiProgram()'],
  },
  {
    name: 'Logical operators (atau, dan, tidak)',
    code: `variabel x = 5
variabel y = 10
jika (x > 0 dan y > 0) {
    tampilkan("keduanya positif")
}
jika (x > 100 atau y > 5) {
    tampilkan("salah satu besar")
}
jika (tidak benar) {
    tampilkan("tidak akan tampil")
}`,
    expectedInOutput: ['if (x > 0 && y > 0)', 'if (x > 100 || y > 5)', 'if (! true)'],
  },
  {
    name: 'Math floor/ceil aliases (lantai, langit_langit)',
    code: `variabel a = lantai(3.7)
variabel b = langit_langit(3.2)
variabel c = pembulatan_bawah(5.9)`,
    expectedInOutput: ['__bulat(3.7)', '__bulatAtas(3.2)', '__bulat(5.9)'],
  },
  {
    name: 'DOM helpers (ubahTeks, ubahHTML, aturGaya)',
    code: `ubahTeks("judul", "Halo")
ubahHTML("badan", "<h1>Hi</h1>")
aturGaya("box", "color", "red")
sembunyikan("modal")
tampilkanElemen("modal")`,
    expectedInOutput: ['__ubahTeks("judul", "Halo")', '__ubahHTML("badan"', '__aturGaya("box"', '__sembunyikan("modal")', '__tampilkanElemen("modal")'],
  },
  {
    name: 'Timer aliases (aturInterval, hentikanInterval)',
    code: `variabel id = aturInterval(fungsi() { tampilkan("tick") }, 1000)
hentikanInterval(id)`,
    expectedInOutput: ['__aturSelang(function()', '__hentikanWaktu(id)'],
  },
  {
    name: 'Generator (hasilkan, generator)',
    code: `generator hitungMundur(n) {
    selama (n > 0) {
        hasilkan n
        n = n - 1
    }
}`,
    expectedInOutput: ['function* hitungMundur', 'yield n'],
  },
  {
    name: 'Modern JS: destructuring + template literal + spread',
    code: `konstanta [a, b] = [1, 2]
konstanta {nama, umur} = data
konstanta s = \`Halo \${nama}\`
konstanta arr = [...lain, 1, 2]
konstanta fn = (x, ...args) => x + args.panjang`,
    expectedInOutput: ['const [a, b] = [1, 2]', 'const {nama, umur} = data', 'const s = `Halo ${nama}`', 'const arr = [...lain, 1, 2]', 'const fn = (x, ...args) => x + args.length'],
  },
  {
    name: 'Ternary + nullish coalescing',
    code: `variabel hasil = x > 0 ? "positif" : "negatif"
variabel nama = data ?? "kosong"`,
    expectedInOutput: ['let hasil = x > 0 ? "positif" : "negatif"', 'let nama = data ?? "kosong"'],
  },
  {
    name: 'Array modern methods (peta, saring, kurangi, cari)',
    code: `variabel arr = [1, 2, 3, 4]
variabel kali2 = arr.peta(fungsi(x) { kembalikan x * 2 })
variabel genap = arr.saring(fungsi(x) { kembalikan x % 2 == 0 })
variabel total = arr.kurangi(fungsi(a, b) { kembalikan a + b }, 0)
variabel pertama = arr.cari(fungsi(x) { kembalikan x > 2 })`,
    expectedInOutput: ['arr.map(function(x)', 'arr.filter(function(x)', 'arr.reduce(function(a, b)', 'arr.find(function(x)'],
  },
]

let passed = 0
let failed = 0

console.log('=== INDOCODE TRANSPILE TESTS ===\n')

for (const tc of testCases) {
  const result = transpileIndoCode(tc.code)
  const usesCanvas = detectCanvasUsage(tc.code)

  console.log(`Test: ${tc.name}`)

  if (!result.success) {
    console.log(`  ❌ TRANSPILE FAILED: ${result.errors[0]?.message}`)
    failed++
    continue
  }

  console.log(`  ✓ Transpile success`)

  if (tc.usesCanvas !== undefined) {
    if (usesCanvas === tc.usesCanvas) {
      console.log(`  ✓ Canvas detection: ${usesCanvas}`)
    } else {
      console.log(`  ❌ Canvas detection: expected ${tc.usesCanvas}, got ${usesCanvas}`)
      failed++
      continue
    }
  }

  if (tc.expectedInOutput) {
    let allFound = true
    for (const expected of tc.expectedInOutput) {
      if (!result.code.includes(expected)) {
        console.log(`  ❌ Missing in output: "${expected}"`)
        allFound = false
      }
    }
    if (allFound) {
      console.log(`  ✓ All expected patterns found`)
      passed++
    } else {
      failed++
      console.log(`  --- Transpiled code: ---`)
      console.log(result.code.split('\n').map((l, i) => `  ${i + 1}: ${l}`).join('\n'))
    }
  } else {
    passed++
  }
  console.log('')
}

console.log('=== SUMMARY ===')
console.log(`Passed: ${passed}/${testCases.length}`)
console.log(`Failed: ${failed}/${testCases.length}`)

if (failed > 0) {
  process.exit(1)
}
