// Test script: verify IndoCode transpiler bug fixes from audit-zcode-studio.md
// Run: bun run /home/z/my-project/scripts/test-audit-fixes.ts

import { transpileIndoCode } from '../src/lib/editor/indocode.ts'

interface Case {
  name: string
  code: string
  /** Substrings that MUST appear in transpiled output */
  mustInclude?: string[]
  /** Substrings that MUST NOT appear in transpiled output */
  mustNotInclude?: string[]
}

const cases: Case[] = [
  {
    name: 'Komentar // tidak boleh ikut ditranslate',
    code: `// ini adalah fungsi untuk menghitung total dan rata-rata
variabel x = 5`,
    mustInclude: ['// ini adalah fungsi untuk menghitung total dan rata-rata'],
    mustNotInclude: ['// this adalah function for menghitung total && rata-rata'],
  },
  {
    name: 'Komentar /* */ tidak boleh ikut ditranslate',
    code: `/* ini adalah komentar
   dengan beberapa baris
   dan kata kunci jika, untuk, dan */
variabel y = 10`,
    mustInclude: ['/* ini adalah komentar', 'dan kata kunci jika, untuk, dan */'],
    mustNotInclude: ['/* this adalah komentar', 'if,', 'for,'],
  },
  {
    name: 'Template literal multi-baris — isi TIDAK boleh ikut ditranslate',
    code: 'variabel pesan = `Halo\ndunia, ini baris kedua\nselesai`',
    mustInclude: ['`Halo', 'dunia, ini baris kedua', 'selesai`'],
    mustNotInclude: ['dunia, this baris kedua', 'dunia, this'],
  },
  {
    name: 'Template literal dengan interpolasi — kode di dalam ${} BOLEH ditranslate',
    code: 'variabel s = `Halo ${nama}, ini penting`',
    // 'ini' inside ${...} is part of code, so it SHOULD be translated to 'this'.
    // But 'ini penting' is outside ${}, so it stays.
    // Actually the entire `...` is a template; only the interpolated expression
    // (between ${ and }) is code. So 'ini penting' is template text (kept as-is),
    // while ${nama} stays as-is (no IndoCode keywords there).
    mustInclude: ['`Halo ${nama}, ini penting`'],
    mustNotInclude: ['this penting'],
  },
  {
    name: 'String literal dengan kata "ini", "untuk", "dan" tidak boleh berubah',
    code: 'variabel s = "ini adalah untuk dan atau baru"',
    mustInclude: ['"ini adalah untuk dan atau baru"'],
    mustNotInclude: ['"this adalah for && || new"'],
  },
  {
    name: 'URL di dalam string tidak boleh menyebabkan error',
    code: 'variabel url = "https://contoh.com/api"',
    mustInclude: ['"https://contoh.com/api"'],
  },
  {
    name: 'String yang berisi karakter { } tidak boleh mempengaruhi apapun',
    code: 'variabel s = "{ nama } dan { nilai }"',
    mustInclude: ['"{ nama } dan { nilai }"'],
  },
  {
    name: 'selama(benar) dengan blok jika sebelum tunggu() — harus jadi __gameLoop',
    code: `selama (benar) {
  jika (x > 5) {
    tampilkan("besar")
  }
  tunggu(100)
  perbarui()
}`,
    mustInclude: ['__gameLoop(100', 'perbarui()'],
  },
  {
    name: 'Regex literal tidak rusak (basic test)',
    code: 'variabel r = /\\d+/g',
    mustInclude: ['/\\d+/g'],
  },
  {
    name: 'Komentar di tengah kode — kata kunci di kode tetap ditranslate',
    code: `variabel x = 5 // ini komentar
jika (x > 0) {
  tampilkan("positif")
}`,
    mustInclude: ['let x = 5', '// ini komentar', 'if (x > 0)', 'console.log("positif")'],
  },
]

let passed = 0
let failed = 0

console.log('=== AUDIT FIXES TEST ===\n')

for (const tc of cases) {
  const result = transpileIndoCode(tc.code)
  console.log(`Test: ${tc.name}`)

  if (!result.success) {
    console.log(`  ❌ TRANSPILE FAILED: ${result.errors[0]?.message}`)
    failed++
    console.log('')
    continue
  }

  console.log(`  ✓ Transpile success`)
  let allOk = true

  if (tc.mustInclude) {
    for (const expected of tc.mustInclude) {
      if (!result.code.includes(expected)) {
        console.log(`  ❌ Missing in output: "${expected}"`)
        allOk = false
      }
    }
  }

  if (tc.mustNotInclude) {
    for (const forbidden of tc.mustNotInclude) {
      if (result.code.includes(forbidden)) {
        console.log(`  ❌ Forbidden in output: "${forbidden}"`)
        allOk = false
      }
    }
  }

  if (allOk) {
    console.log(`  ✓ All assertions passed`)
    passed++
  } else {
    failed++
    console.log(`  --- Transpiled code: ---`)
    console.log(result.code.split('\n').map((l, i) => `  ${i + 1}: ${l}`).join('\n'))
  }
  console.log('')
}

console.log('=== SUMMARY ===')
console.log(`Passed: ${passed}/${cases.length}`)
console.log(`Failed: ${failed}/${cases.length}`)

if (failed > 0) {
  process.exit(1)
}
