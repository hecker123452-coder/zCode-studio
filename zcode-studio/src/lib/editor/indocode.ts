/**
 * IndoCode - Bahasa pemrograman dengan keyword bahasa Indonesia
 * Transpiles ke JavaScript untuk dijalankan di browser
 * Supports: Canvas API, DOM, async/await, game loops
 */

// Keyword mapping: Indonesia -> JavaScript
const KEYWORD_MAP: Record<string, string> = {
  'konstanta': 'const',
  'variabel': 'let',
  'jika': 'if',
  'atau_jika': 'else if',
  'kalau_tidak': 'else',
  'selain_itu': 'else',          // alias for kalau_tidak
  'untuk': 'for',
  'selama': 'while',
  'lakukan': 'do',
  'fungsi': 'function',
  'kembalikan': 'return',
  'kembali': 'return',           // alias
  'tampilkan': 'console.log',
  'cetak': 'console.log',        // alias for tampilkan
  'benar': 'true',
  'salah': 'false',
  'kosong': 'null',
  'tidak_terdefinisi': 'undefined',
  'pilih': 'switch',
  'kasus': 'case',
  'kasus_lain': 'default',
  'putus': 'break',
  'lanjut': 'continue',
  'coba': 'try',
  'tangkap': 'catch',
  'akhirnya': 'finally',
  'lempar': 'throw',
  'baru': 'new',
  'ini': 'this',
  'kelas': 'class',
  'perluas': 'extends',
  'super': 'super',
  'asinkron': 'async',
  'tipe': 'typeof',
  'contoh': 'instanceof',
  'dari_pada': 'of',
  'dalam': 'in',
  'hapus': 'delete',
  'statis': 'static',            // for class static methods
  'dapatkan': 'get',             // for class getters
  'atur': 'set',                 // for class setters
  'impor': 'import',             // ES modules (for future use)
  'ekspor': 'export',
  'dari': 'from',
  // Logical operators (Indonesian-friendly aliases)
  'atau': '||',
  'dan': '&&',
  'tidak': '!',
  // Generators
  'hasilkan': 'yield',
  'generator': 'function*',
  // Module / async utilities
  'sebagai': 'as',
  'standar_bawaan': 'default',
  'tunggu_semua': 'await Promise.all',
}

// Built-in method names (object methods)
const BUILTIN_METHODS: Record<string, string> = {
  'panjang': 'length',
  'dorong': 'push',
  'tambahBelakang': 'push',      // alias
  'hapus_pada': 'splice',
  'sisipkan': 'splice',
  'gabung': 'join',
  'potong': 'slice',
  'peta': 'map',
  'saring': 'filter',
  'kurangi': 'reduce',
  'untuk_setiap': 'forEach',
  'cari': 'find',
  'cariIndeks': 'findIndex',
  'cari_terakhir': 'findLast',
  'cariIndeksTerakhir': 'findLastIndex',
  'beberapa': 'some',
  'semua': 'every',
  'urutkan': 'sort',
  'balik': 'reverse',
  'gabungkan': 'concat',
  'termasuk': 'includes',
  'indeks_dari': 'indexOf',
  'indeksTerakhir': 'lastIndexOf',
  'konteks': 'getContext',
  'tambahDepan': 'unshift',
  'hapusBelakang': 'pop',
  'hapusDepan': 'shift',         // alias
  'isi': 'fill',
  'rata_rata': 'avg',            // polyfilled below
  'keString': 'toString',
  'nilai_dari': 'valueOf',
  'besar': 'toUpperCase',
  'kecil': 'toLowerCase',
  'besarLokal': 'toLocaleUpperCase',
  'kecilLokal': 'toLocaleLowerCase',
  'pangkas': 'trim',
  'pangkasMulai': 'trimStart',
  'pangkasAkhir': 'trimEnd',
  'belah': 'split',
  'ganti': 'replace',
  'gantiSemua': 'replaceAll',
  'cocok': 'match',
  'cocokSemua': 'matchAll',
  'cariRegex': 'search',
  'mulaiDengan': 'startsWith',
  'akhirDengan': 'endsWith',
  'ulang': 'repeat',
  'substring': 'substring',
  'substr': 'substr',
  'normalkan': 'normalize',
  'padKiri': 'padStart',
  'padKanan': 'padEnd',
  'charPada': 'charAt',
  'kodeCharPada': 'charCodeAt',
  'dariKodeChar': 'fromCharCode',
  'kunci': 'keys',
  'nilai': 'values',
  'entri': 'entries',
  'dari': 'from',
  'adalahArray': 'isArray',
  'dariPasangan': 'fromEntries',
  'tetapkanProperti': 'defineProperty',
  'tetapkanPropertiGanda': 'defineProperties',
  'ambilDescriptor': 'getOwnPropertyDescriptor',
  'ambilNamaProperti': 'getOwnPropertyNames',
  'ambilPrototipe': 'getPrototypeOf',
  'tetapkanPrototipe': 'setPrototypeOf',
  'buat': 'create',
  'tetapkan': 'assign',
  'beku': 'freeze',
  'cekBeku': 'isFrozen',
  'hentikan': 'preventExtensions',
  'bind': 'bind',
  'panggil': 'call',
  'terapkan': 'apply',
  'toString': 'toString',
  'valueOf': 'valueOf',
  'toLocaleString': 'toLocaleString',
  // Promise methods
  'lalu': 'then',
  'tangkap_penolakan': 'catch',
  'akhirnya_promise': 'finally',
  'selesai': 'resolve',
  'tolak': 'reject',
  'semua_promise': 'all',
  'balapan': 'race',
  'semua_diselesaikan': 'allSettled',
  'janji_apapun': 'any',
  // JSON methods
  'stringifikasi': 'stringify',
  'parse_json': 'parse',
  // Number methods
  'tetapPresisi': 'toPrecision',
  'tetapDesimal': 'toFixed',
  'eksponensial': 'toExponential',
  // Date methods
  'ambilWaktu': 'getTime',
  'ambilHari': 'getDate',
  'ambilBulan': 'getMonth',
  'ambilTahun': 'getFullYear',
  'ambilJam': 'getHours',
  'ambilMenit': 'getMinutes',
  'ambilDetik': 'getSeconds',
  'ambilMilidetik': 'getMilliseconds',
  'ambilHariMinggu': 'getDay',
  'aturHari': 'setDate',
  'aturBulan': 'setMonth',
  'aturTahun': 'setFullYear',
  'aturJam': 'setHours',
  'aturMenit': 'setMinutes',
  'aturDetik': 'setSeconds',
  'keStringTanggal': 'toDateString',
  'keStringWaktu': 'toTimeString',
  'keStringISO': 'toISOString',
  'keJSON': 'toJSON',
  // DOM methods
  'appendChild': 'appendChild',
  'tambahAnak': 'appendChild',
  'hapusAnak': 'removeChild',
  'gantiAnak': 'replaceChild',
  'masukkanSebelum': 'insertBefore',
  'kueriPilih': 'querySelector',
  'kueriPilihSemua': 'querySelectorAll',
  'ambilElemenById': 'getElementById',
  'ambilElemenByKelas': 'getElementsByClassName',
  'ambilElemenByTag': 'getElementsByTagName',
  'aturAtribut': 'setAttribute',
  'ambilAtribut': 'getAttribute',
  'hapusAtribut': 'removeAttribute',
  'punyaAtribut': 'hasAttribute',
  'tambahKelas': 'classList.add',
  'hapusKelas': 'classList.remove',
  'alihKelas': 'classList.toggle',
  'punyaKelas': 'classList.contains',
  'isiHTML': 'innerHTML',
  'isiTeks': 'textContent',
  'nilaiProp': 'value',
  'fokus_elemen': 'focus',
  'blur_elemen': 'blur',
  'klik_elemen': 'click',
  'tampilan': 'style',
  'induk': 'parentElement',
  'anak': 'children',
  'anakPertama': 'firstElementChild',
  'anakTerakhir': 'lastElementChild',
  'saudaraSebelumnya': 'previousElementSibling',
  'saudaraBerikutnya': 'nextElementSibling',
  // Math methods
  'pembulatan': 'round',
  'lantai': 'floor',
  'langit_langit': 'ceil',
  'pembulatan_atas': 'ceil',
  'pembulatan_bawah': 'floor',
  'akar_kuadrat': 'sqrt',
  'pangkat_math': 'pow',
  'mutlak_math': 'abs',
  'logaritma': 'log',
  'logaritma2': 'log2',
  'logaritma10': 'log10',
  'sinus': 'sin',
  'kosinus': 'cos',
  'tangen': 'tan',
  'busurSinus': 'asin',
  'busurKosinus': 'acos',
  'busurTangen': 'atan',
  'busurTangen2': 'atan2',
  'acak_math': 'random',
  'maksimum': 'max',
  'minimum': 'min',
  'tanda': 'sign',
  'truncat': 'trunc',
  'hypot': 'hypot',
  'cbrt': 'cbrt',
  'akarPangkat3': 'cbrt',
}

// Built-in standalone functions (not methods)
// Note: 'tunggu' is special - it maps to 'await __tunggu' (handled separately)
const BUILTIN_FUNCTIONS: Record<string, string> = {
  'ambilElemen': '__ambilElemen',
  'ambilElemenSemua': '__ambilElemenSemua',
  'buatElemen': '__buatElemen',
  'acakBulat': '__acakBulat',
  'acak': '__acak',
  'bulat': '__bulat',
  'lantai': '__bulat',              // Math.floor alias (built-in)
  'langit_langit': '__bulatAtas',   // Math.ceil alias (built-in)
  'pembulatan_bawah': '__bulat',    // alias
  'pembulatan_atas': '__bulatAtas', // alias
  'pangkat': '__pangkat',
  'akar': '__akar',
  'mutlak': '__mutlak',
  'maks': '__maks',
  'min': '__min',
  'bulat_atas': '__bulatAtas',
  'bulat_bawah': '__bulatBawah',
  'bulatkan': '__bulatkan',         // Math.round
  'pembulatan': '__bulatkan',       // alias
  'string_ke': '__stringKe',
  'angka_ke': '__angkaKe',
  'bilangan_ke': '__bilanganKe',
  'desimal_ke': '__desimalKe',
  'json_ke_string': '__jsonKeString',
  'string_ke_json': '__stringKeJson',
  'berhentiProgram': '__berhentiProgram',
  'hentikan': '__berhentiProgram',  // alias
  'aturWaktu': '__aturWaktu',
  'aturSelang': '__aturSelang',
  'aturInterval': '__aturSelang',   // alias
  'aturWaktuTunggu': '__aturWaktu', // alias
  'hentikanWaktu': '__hentikanWaktu',
  'hentikanInterval': '__hentikanWaktu', // alias
  'hentikanSelang': '__hentikanWaktu',   // alias
  'dengarkan': '__dengarkan',
  'masukan': '__masukan',           // prompt()
  'input': '__masukan',             // alias
  'konfirmasi': '__konfirmasi',     // confirm()
  'waktu_sekarang': '__waktuSekarang', // Date.now()
  'tanggal_sekarang': '__tanggalSekarang', // new Date()
  'bingkaiBerikutnya': '__bingkaiBerikutnya', // requestAnimationFrame
  'ubahTeks': '__ubahTeks',         // set textContent by id
  'ubahHTML': '__ubahHTML',         // set innerHTML by id
  'aturGaya': '__aturGaya',         // set element style
  'aturAtributElemen': '__aturAtributElemen', // set attribute by id
  'sembunyikan': '__sembunyikan',   // hide element by id
  'tampilkanElemen': '__tampilkanElemen', // show element by id
  'mulaiTimer': '__mulaiTimer',     // console.time
  'hentikanTimer': '__hentikanTimer', // console.timeEnd
}

// Canvas method polyfills (custom methods added to CanvasRenderingContext2D)
const CANVAS_POLYFILLS = `
// Canvas polyfills for IndoCode
if (typeof CanvasRenderingContext2D !== 'undefined') {
  CanvasRenderingContext2D.prototype.bersihkan = function() {
    this.clearRect(0, 0, this.canvas.width, this.canvas.height);
  };
  CanvasRenderingContext2D.prototype.warnaIsi = function(warna) {
    var map = {merah:'red', hijau:'green', biru:'blue', kuning:'yellow', hitam:'black', putih:'white', ungu:'purple', oranye:'orange', abu_abu:'gray', abu:'gray', pink:'pink', coklat:'brown', cyan:'cyan', magenta:'magenta', emas:'gold', perak:'silver'};
    this.fillStyle = map[warna] || warna;
  };
  CanvasRenderingContext2D.prototype.warnaGaris = function(warna) {
    var map = {merah:'red', hijau:'green', biru:'blue', kuning:'yellow', hitam:'black', putih:'white', ungu:'purple', oranye:'orange', abu_abu:'gray', abu:'gray', pink:'pink', coklat:'brown'};
    this.strokeStyle = map[warna] || warna;
  };
  CanvasRenderingContext2D.prototype.kotak = function(x, y, w, h) {
    this.fillRect(x, y, w, h);
  };
  CanvasRenderingContext2D.prototype.kotakGaris = function(x, y, w, h) {
    this.strokeRect(x, y, w, h);
  };
  CanvasRenderingContext2D.prototype.garis = function(x1, y1, x2, y2) {
    this.beginPath();
    this.moveTo(x1, y1);
    this.lineTo(x2, y2);
    this.stroke();
  };
  // lingkaran: accept 3 params (filled circle) or 5 params (arc without auto-fill)
  CanvasRenderingContext2D.prototype.lingkaran = function(x, y, r, startAngle, endAngle) {
    this.beginPath();
    if (startAngle !== undefined && endAngle !== undefined) {
      this.arc(x, y, r, startAngle, endAngle);
    } else {
      this.arc(x, y, r, 0, Math.PI * 2);
      this.fill();
    }
  };
  // bulat: always filled circle (shortcut)
  CanvasRenderingContext2D.prototype.bulat = function(x, y, r) {
    this.beginPath();
    this.arc(x, y, r, 0, Math.PI * 2);
    this.fill();
  };
  CanvasRenderingContext2D.prototype.bulatGaris = function(x, y, r) {
    this.beginPath();
    this.arc(x, y, r, 0, Math.PI * 2);
    this.stroke();
  };
  // Path methods (IndoCode names)
  CanvasRenderingContext2D.prototype.mulaiJalur = function() { this.beginPath(); };
  CanvasRenderingContext2D.prototype.isi = function() { this.fill(); };
  CanvasRenderingContext2D.prototype.garisKanvas = function() { this.stroke(); };
  CanvasRenderingContext2D.prototype.pindahKe = function(x, y) { this.moveTo(x, y); };
  CanvasRenderingContext2D.prototype.garisKe = function(x, y) { this.lineTo(x, y); };
  CanvasRenderingContext2D.prototype.tutupJalur = function() { this.closePath(); };
  CanvasRenderingContext2D.prototype.simpan = function() { this.save(); };
  CanvasRenderingContext2D.prototype.pulihkan = function() { this.restore(); };
  CanvasRenderingContext2D.prototype.translasi = function(x, y) { this.translate(x, y); };
  CanvasRenderingContext2D.prototype.rotasi = function(angle) { this.rotate(angle); };
  CanvasRenderingContext2D.prototype.skala = function(x, y) { this.scale(x, y); };
  CanvasRenderingContext2D.prototype.panjangGaris = function(teks) { return this.measureText(teks); };
  CanvasRenderingContext2D.prototype.gambarGambar = function(img, x, y, w, h) {
    if (w !== undefined && h !== undefined) { this.drawImage(img, x, y, w, h); }
    else { this.drawImage(img, x, y); }
  };
  CanvasRenderingContext2D.prototype.teks = function(teks, x, y) {
    this.fillText(teks, x, y);
  };
  CanvasRenderingContext2D.prototype.ukuranTeks = function(ukuran) {
    this.font = ukuran + 'px sans-serif';
  };
  CanvasRenderingContext2D.prototype.ukuranFont = function(ukuran, font) {
    this.font = ukuran + 'px ' + (font || 'sans-serif');
  };
}
`

// Runtime helpers injected into sandbox
const RUNTIME_HELPERS = `
// ===== INDOCODE RUNTIME HELPERS =====

// DOM helpers
function __ambilElemen(id) {
  var el = document.getElementById(id);
  if (!el) el = document.querySelector('#' + id);
  if (!el) el = document.querySelector(id);
  return el;
}
function __ambilElemenSemua(selector) {
  return document.querySelectorAll(selector);
}
function __buatElemen(tag) {
  return document.createElement(tag);
}

// Math helpers
function __acakBulat(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function __acak() { return Math.random(); }
function __bulat(n) { return Math.floor(n); }
function __pangkat(base, exp) { return Math.pow(base, exp); }
function __akar(n) { return Math.sqrt(n); }
function __mutlak(n) { return Math.abs(n); }
function __maks() { return Math.max.apply(null, arguments); }
function __min() { return Math.min.apply(null, arguments); }
function __bulatAtas(n) { return Math.ceil(n); }
function __bulatBawah(n) { return Math.floor(n); }
function __bulatkan(n) { return Math.round(n); }

// Type conversion
function __stringKe(v) { return String(v); }
function __angkaKe(v) { return Number(v); }
function __bilanganKe(s, base) { return parseInt(s, base || 10); }
function __desimalKe(s) { return parseFloat(s); }
function __jsonKeString(obj) { return JSON.stringify(obj, null, 2); }
function __stringKeJson(s) { return JSON.parse(s); }

// User input / interaction
function __masukan(pesan) {
  return prompt(pesan || 'Masukkan nilai:');
}
function __konfirmasi(pesan) {
  return confirm(pesan || 'Konfirmasi?');
}

// Time helpers
function __waktuSekarang() { return Date.now(); }
function __tanggalSekarang() { return new Date(); }
function __bingkaiBerikutnya(fn) {
  return requestAnimationFrame(fn);
}

// DOM mutation helpers (IndoCode-friendly wrappers)
function __ubahTeks(id, teks) {
  var el = document.getElementById(id) || document.querySelector('#' + id);
  if (el) el.textContent = teks;
  else console.warn('Elemen dengan id "' + id + '" tidak ditemukan');
}
function __ubahHTML(id, html) {
  var el = document.getElementById(id) || document.querySelector('#' + id);
  if (el) el.innerHTML = html;
  else console.warn('Elemen dengan id "' + id + '" tidak ditemukan');
}
function __aturGaya(id, prop, nilai) {
  var el = document.getElementById(id) || document.querySelector('#' + id);
  if (el) el.style[prop] = nilai;
  else console.warn('Elemen dengan id "' + id + '" tidak ditemukan');
}
function __aturAtributElemen(id, attr, nilai) {
  var el = document.getElementById(id) || document.querySelector('#' + id);
  if (el) el.setAttribute(attr, nilai);
  else console.warn('Elemen dengan id "' + id + '" tidak ditemukan');
}
function __sembunyikan(id) {
  var el = document.getElementById(id) || document.querySelector('#' + id);
  if (el) el.style.display = 'none';
  else console.warn('Elemen dengan id "' + id + '" tidak ditemukan');
}
function __tampilkanElemen(id) {
  var el = document.getElementById(id) || document.querySelector('#' + id);
  if (el) el.style.display = '';
  else console.warn('Elemen dengan id "' + id + '" tidak ditemukan');
}

// Timer helpers (console.time / console.timeEnd)
function __mulaiTimer(label) {
  if (typeof console !== 'undefined' && console.time) console.time(label);
}
function __hentikanTimer(label) {
  if (typeof console !== 'undefined' && console.timeEnd) console.timeEnd(label);
}

// Array polyfill: rata_rata (avg)
if (!Array.prototype.avg) {
  Array.prototype.avg = function() {
    if (this.length === 0) return 0;
    var sum = 0;
    for (var i = 0; i < this.length; i++) sum += this[i];
    return sum / this.length;
  };
}

// Program control
function __berhentiProgram() {
  __hentikanSemuaLoop();
  // Notify parent that program was stopped programmatically
  parent.postMessage({ type: 'indocode-output', message: 'STOP Program dihentikan' }, '*');
  parent.postMessage({ type: 'indocode-stopped' }, '*');
  throw new Error('__BERHENTI__');
}

// Async sleep
function __tunggu(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}

// Game loop helper - replaces while(true) + await tunggu() pattern
// Uses setInterval instead to prevent browser hang
var __activeLoops = [];
function __gameLoop(ms, fn) {
  var id = setInterval(fn, ms);
  __activeLoops.push(id);
  return id;
}
function __hentikanLoop(id) {
  clearInterval(id);
  __activeLoops = __activeLoops.filter(function(i) { return i !== id; });
}
function __hentikanSemuaLoop() {
  __activeLoops.forEach(function(id) { clearInterval(id); });
  __activeLoops = [];
}

// Timer helpers
function __aturWaktu(fn, ms) { return setTimeout(fn, ms); }
function __aturSelang(fn, ms) { return setInterval(fn, ms); }
function __hentikanWaktu(id) { clearTimeout(id); clearInterval(id); }

// Event listener helper
// Usage:
//   dengarkan("keydown", fn)              -> document.addEventListener("keydown", fn)
//   dengarkan(element, "click", fn)       -> element.addEventListener("click", fn)
function __dengarkan(target, eventOrFn, fn) {
  if (typeof target === 'string') {
    // 2-arg form: dengarkan("keydown", fn)
    document.addEventListener(target, eventOrFn);
  } else if (target) {
    // 3-arg form: dengarkan(element, "click", fn)
    target.addEventListener(eventOrFn, fn);
  }
}

// Keyboard event helper - maps Indonesian key names
var __keyMap = {
  'ATAS': 'ArrowUp', 'BAWAH': 'ArrowDown', 'KIRI': 'ArrowLeft', 'KANAN': 'ArrowRight',
  'ENTER': 'Enter', 'SPASI': ' ', 'TAB': 'Tab', 'HAPUS': 'Backspace',
  'ESC': 'Escape', 'SHIFT': 'Shift', 'CTRL': 'Control', 'ALT': 'Alt',
};

// Override addEventListener to support Indonesian key names
if (typeof document !== 'undefined') {
  var __originalAddEventListener = document.addEventListener.bind(document);
  document.addEventListener = function(type, fn, options) {
    if (type === 'keydown' || type === 'keyup' || type === 'keypress') {
      var wrappedFn = function(e) {
        var key = e.key;
        // Check if key matches any Indonesian name
        for (var idKey in __keyMap) {
          if (__keyMap[idKey] === key) {
            e.indoKey = idKey;
            break;
          }
        }
        // Also set indoKey for letter keys
        if (key.length === 1) {
          e.indoKey = key.toUpperCase();
        }
        fn(e);
      };
      __originalAddEventListener(type, wrappedFn, options);
    } else {
      __originalAddEventListener(type, fn, options);
    }
  };
}

// Window keypress helper for game input
window.__dengarkanTombol = function(fn) {
  document.addEventListener('keydown', function(e) {
    var key = e.key;
    var indoKey = key;
    for (var idKey in __keyMap) {
      if (__keyMap[idKey] === key) {
        indoKey = idKey;
        break;
      }
    }
    if (key.length === 1) indoKey = key.toUpperCase();
    fn(indoKey, e);
  });
};

// ===== HTMLELEMENT POLYFILLS =====
// tambahPendengar: Indonesian event listener on elements
// elemen.tambahPendengar("sentuhMulai", fn)
// elemen.tambahPendengar("sentuhSelesai", fn)
// elemen.tambahPendengar("klik", fn)
if (typeof HTMLElement !== 'undefined') {
  HTMLElement.prototype.tambahPendengar = function(eventType, fn) {
    var self = this;
    if (eventType === 'sentuhMulai') {
      this.addEventListener('touchstart', function(e) {
        e.sentuhan = Array.from(e.touches || []).map(function(t) {
          return { x: t.clientX, y: t.clientY, identifier: t.identifier };
        });
        fn(e);
        e.preventDefault();
      }, { passive: false });
      this.addEventListener('mousedown', function(e) {
        e.sentuhan = [{ x: e.clientX, y: e.clientY, identifier: 0 }];
        fn(e);
      });
      return;
    }
    if (eventType === 'sentuhSelesai') {
      this.addEventListener('touchend', function(e) {
        e.perubahanSentuh = Array.from(e.changedTouches || []).map(function(t) {
          return { x: t.clientX, y: t.clientY, identifier: t.identifier };
        });
        e.sentuhan = e.perubahanSentuh;
        fn(e);
        e.preventDefault();
      }, { passive: false });
      this.addEventListener('mouseup', function(e) {
        e.perubahanSentuh = [{ x: e.clientX, y: e.clientY, identifier: 0 }];
        e.sentuhan = e.perubahanSentuh;
        fn(e);
      });
      return;
    }
    if (eventType === 'sentuhGerak') {
      this.addEventListener('touchmove', function(e) {
        e.sentuhan = Array.from(e.touches || []).map(function(t) {
          return { x: t.clientX, y: t.clientY, identifier: t.identifier };
        });
        fn(e);
        e.preventDefault();
      }, { passive: false });
      return;
    }
    var realEvent = eventType;
    if (eventType === 'klik') realEvent = 'click';
    else if (eventType === 'perubahan') realEvent = 'change';
    else if (eventType === 'masukan') realEvent = 'input';
    else if (eventType === 'fokus') realEvent = 'focus';
    else if (eventType === 'hilangFokus') realEvent = 'blur';
    this.addEventListener(realEvent, fn);
  };
  HTMLElement.prototype.hapusPendengar = function(eventType, fn) {
    var realEvent = eventType;
    if (eventType === 'sentuhMulai') realEvent = 'touchstart';
    else if (eventType === 'sentuhSelesai') realEvent = 'touchend';
    else if (eventType === 'sentuhGerak') realEvent = 'touchmove';
    else if (eventType === 'klik') realEvent = 'click';
    else if (eventType === 'perubahan') realEvent = 'change';
    this.removeEventListener(realEvent, fn);
  };
  // saatSentuhMulai/saatSentuhSelesai shortcuts
  HTMLElement.prototype.saatSentuhMulai = function(fn) {
    this.tambahPendengar('sentuhMulai', fn);
  };
  HTMLElement.prototype.saatSentuhSelesai = function(fn) {
    this.tambahPendengar('sentuhSelesai', fn);
  };
  HTMLElement.prototype.saatSentuhGerak = function(fn) {
    this.tambahPendengar('sentuhGerak', fn);
  };
  HTMLElement.prototype.saatKlik = function(fn) {
    this.addEventListener('click', fn);
  };
  HTMLElement.prototype.saatPerubahan = function(fn) {
    this.addEventListener('change', fn);
  };
  HTMLElement.prototype.saatInput = function(fn) {
    this.addEventListener('input', fn);
  };
}

${CANVAS_POLYFILLS}
`

// Export RUNTIME_HELPERS so other components (like Live Preview) can inject it
export function getIndoCodeRuntimeHelpers(): string {
  return RUNTIME_HELPERS
}

export interface TranspileResult {
  code: string
  errors: { line: number; column: number; message: string; originalLine: number }[]
  success: boolean
  needsAsync: boolean
  isHTML?: boolean
}

// ===== HTML/CSS TRANSPILER =====

const HTML_TAG_MAP: Record<string, string> = {
  'kepala': 'head', 'badan': 'body', 'gaya': 'style', 'judul': 'title',
  'kanvas': 'canvas', 'skrip': 'script', 'tajuk': 'h1', 'subtajuk': 'h2',
  'subtajuk3': 'h3', 'subtajuk4': 'h4', 'subtajuk5': 'h5', 'subtajuk6': 'h6',
  'paragraf': 'p', 'tebal': 'b', 'miring': 'i', 'garis_bawah': 'u',
  'coret': 's', 'ditekankan': 'em', 'kuat': 'strong', 'kecil': 'small',
  'kode': 'code', 'kutipan': 'blockquote', 'kutip': 'q',
  'daftar': 'ul', 'daftar_berurut': 'ol', 'item': 'li',
  'daftar_definisi': 'dl', 'istilah': 'dt', 'penjelasan': 'dd',
  'tautan': 'a', 'gambar': 'img', 'tombol': 'button', 'label': 'label',
  'formulir': 'form', 'tabel': 'table', 'baris': 'tr', 'kolom': 'td',
  'kepala_tabel': 'th', 'badan_tabel': 'tbody', 'kepala_grup_tabel': 'thead', 'kaki_grup_tabel': 'tfoot',
  'input': 'input', 'area_teks': 'textarea', 'keterangan': 'caption',
  'pilihan': 'select', 'opsi': 'option', 'rentang': 'span',
  'kelompok': 'div', 'kumpulan': 'div', 'grup': 'div',
  'kepala_halaman': 'header', 'kaki_halaman': 'footer', 'navigasi': 'nav',
  'utama': 'main', 'bagian': 'section', 'artikel': 'article', 'samping': 'aside',
  'jeda': 'br', 'garis': 'hr', 'meta': 'meta', 'taut': 'link',
  'dasar': 'base', 'area': 'area', 'peta': 'map', 'sumber': 'source',
  'lacak': 'track', 'semat': 'embed', 'objek': 'object', 'param': 'param',
  'video': 'video', 'audio': 'audio', 'gambar_sumber': 'source',
  'bingkai_dalam': 'iframe', 'bingkai': 'frame', 'ramesan_bingkai': 'iframe',
  'rincian': 'details', 'ringkasan': 'summary', 'dialog': 'dialog',
  'menu': 'menu', 'item_menu': 'menuitem', 'templat': 'template',
  'konten': 'content', 'bayangan': 'shadow', 'slot': 'slot',
  'kemajuan': 'progress', 'pengukur': 'meter', 'keluaran': 'output',
  'gambar_kemajuan': 'progress', 'sel': 'td',
  'masukan': 'input', 'teks_masukan': 'input',
  'bidang': 'fieldset', 'legenda': 'legend',
  'penanda': 'mark', 'waktu': 'time', 'tanggal': 'date',
  'subskrip': 'sub', 'superskrip': 'sup', 'variasi': 'var',
  'singkatan': 'abbr', 'akronim': 'acronym', 'alamat': 'address',
  'kutipan_kemasan': 'cite', 'definisi': 'dfn', 'keyboard': 'kbd',
  'sampel': 'samp', 'variabel': 'var', 'praformat': 'pre',
  'kode_blok': 'pre', 'kalkulasi': 'calc',
}

const HTML_ATTR_MAP: Record<string, string> = {
  'bahasa': 'lang', 'lebar': 'width', 'tinggi': 'height',
  'sumber': 'src', 'tautan': 'href', 'kelas': 'class',
  'gaya': 'style', 'tipe': 'type', 'nilai': 'value',
  'nama': 'name', 'saat_klik': 'onclick', 'dinonaktifkan': 'disabled',
  'diperiksa': 'checked', 'dipilih': 'selected',
  'placeholder': 'placeholder', 'alt': 'alt',
  'id': 'id', 'judul': 'title', 'target': 'target',
  'rel': 'rel', 'mediad': 'media', 'href': 'href', 'src': 'src',
  'saat_muat': 'onload', 'saat_gagal': 'onerror',
  'saat_perubahan': 'onchange', 'saat_masukan': 'oninput',
  'saat_fokus': 'onfocus', 'saat_hilang_fokus': 'onblur',
  'saat_tombol_bawah': 'onkeydown', 'saat_tombol_naik': 'onkeyup',
  'saat_tombol_tekan': 'onkeypress',
  'saat_kirim': 'onsubmit', 'saat_reset': 'onreset',
  'saat_gerak_mouse': 'onmousemove', 'saat_masuk_mouse': 'onmouseenter',
  'saat_keluar_mouse': 'onmouseleave',
  'saat_sentuh_mulai': 'ontouchstart', 'saat_sentuh_akhir': 'ontouchend',
  'saat_sentuh_gerak': 'ontouchmove',
  'pengodean': 'charset', 'set_karakter': 'charset',
  'min': 'min', 'maks': 'max', 'langkah': 'step',
  'panjang_min': 'minlength', 'panjang_maks': 'maxlength',
  'pola': 'pattern', 'wajib': 'required', 'hanya_baca': 'readonly',
  'otomatis_fokus': 'autofocus', 'otomatis_lengkapi': 'autocomplete',
  'kontrol': 'controls', 'berputar': 'loop', 'bisu': 'muted',
  'putar_otomatis': 'autoplay', 'pramuat': 'preload',
  'poster': 'poster', 'daftar': 'list', 'ukuran': 'size',
  'beberapa': 'multiple', 'terbuka': 'open', 'terpilih': 'selected',
  'label_atribut': 'label', 'untuk': 'for', 'headers': 'headers',
  'colspan': 'colspan', 'rowspan': 'rowspan',
  'lebar_kolom': 'col', 'tinggi_baris': 'row',
  'span': 'span', 'mulai': 'start', 'terbalik': 'reversed',
  'aksi': 'action', 'metode': 'method', 'enctipe': 'enctype',
  'tidak_validasi': 'novalidate', 'form': 'form',
  'cek': 'checked', 'sembunyi': 'hidden',
  'draggable': 'draggable', 'bisa_diseret': 'draggable',
  'contenteditable': 'contenteditable', 'bisa_diedit': 'contenteditable',
  'spellcheck': 'spellcheck', 'cek_ejaan': 'spellcheck',
  'tabindex': 'tabindex', 'indeks_tab': 'tabindex',
  'accesskey': 'accesskey', 'kunci_akses': 'accesskey',
  'dir': 'dir', 'arah': 'dir', 'translate': 'translate',
  'data': 'data', 'ping': 'ping', 'download': 'download', 'unduh': 'download',
  'isi': 'sandbox', 'kotak_pasir': 'sandbox',
  'allow': 'allow', 'izin': 'allow',
  'ringer': 'allowfullscreen', 'layar_penuh': 'allowfullscreen',
  'asinkron': 'async', 'tunda': 'defer', 'crozzorigin': 'crossorigin',
  'asal_silang': 'crossorigin', 'integritas': 'integrity',
  'nomodul': 'nomodule', 'nonce': 'nonce', 'referrerpolicy': 'referrerpolicy',
  'kebijakan_referrer': 'referrerpolicy',
}

const CSS_PROP_MAP: Record<string, string> = {
  'latar': 'background', 'warna': 'color', 'rata_teks': 'text-align',
  'font': 'font-family', 'sentuh': 'touch-action',
  'margin_atas': 'margin-top', 'margin_bawah': 'margin-bottom',
  'margin_kiri': 'margin-left', 'margin_kanan': 'margin-right',
  'padding_atas': 'padding-top', 'padding_bawah': 'padding-bottom',
  'padding_kiri': 'padding-left', 'padding_kanan': 'padding-right',
  'margin': 'margin', 'padding': 'padding',
  'ukuran_font': 'font-size', 'tebal_font': 'font-weight',
  'gaya_font': 'font-style', 'varian_font': 'font-variant',
  'batas': 'border', 'radius_batas': 'border-radius',
  'batas_atas': 'border-top', 'batas_bawah': 'border-bottom',
  'batas_kiri': 'border-left', 'batas_kanan': 'border-right',
  'lebar_batas': 'border-width', 'gaya_batas': 'border-style',
  'warna_batas': 'border-color', 'radius_batas_atas': 'border-top-left-radius',
  'tampil': 'display', 'posisi': 'position',
  'lebar': 'width', 'tinggi': 'height',
  'lebar_min': 'min-width', 'tinggi_min': 'min-height',
  'lebar_maks': 'max-width', 'tinggi_maks': 'max-height',
  'warna_latar': 'background-color', 'gambar_latar': 'background-image',
  'ulangi_latar': 'background-repeat', 'posisi_latar': 'background-position',
  'ukuran_latar': 'background-size', 'lampiran_latar': 'background-attachment',
  'bayangan_kotak': 'box-shadow', 'bayangan_teks': 'text-shadow',
  'transisi': 'transition', 'transisi_properti': 'transition-property',
  'transisi_durasi': 'transition-duration', 'transisi_fungsi': 'transition-timing-function',
  'animasi': 'animation', 'animasi_nama': 'animation-name',
  'animasi_durasi': 'animation-duration', 'animasi_iterasi': 'animation-iteration-count',
  'transformasi': 'transform', 'asal_transformasi': 'transform-origin',
  'opasitas': 'opacity', 'visibilitas': 'visibility', 'terlihat': 'visibility',
  'kursur': 'cursor', 'luapan': 'overflow',
  'luapan_x': 'overflow-x', 'luapan_y': 'overflow-y',
  'luapan_gulir': 'overflow-scroll',
  'rata_vertical': 'vertical-align', 'jarak_huruf': 'letter-spacing',
  'jarak_kata': 'word-spacing', 'tinggi_baris': 'line-height',
  'indentasi_teks': 'text-indent', 'dekorasi_teks': 'text-decoration',
  'transformasi_teks': 'text-transform', 'spasi_putih': 'white-space',
  'arah_teks': 'direction', 'mode_tulis': 'writing-mode',
  'bungkus_kata': 'word-wrap', 'pecah_kata': 'word-break',
  'rata_konten': 'justify-content', 'rata_item': 'align-items',
  'rata_diri': 'align-self', 'rata_konten_vertikal': 'align-content',
  'arah_fleksibel': 'flex-direction', 'bungkus_fleksibel': 'flex-wrap',
  'fleksibel_besar': 'flex-grow', 'fleksibel_kecil': 'flex-shrink',
  'dasar_fleksibel': 'flex-basis', 'fleksibel': 'flex',
  'urutan_fleksibel': 'order', 'jarak_grid': 'gap', 'jarak_baris': 'row-gap',
  'jarak_kolom': 'column-gap', 'baris_kotak': 'box-sizing',
  'bayangan_kotak_dalam': 'box-shadow inset',
  'kursur_tunggu': 'cursor wait',
  'grid': 'grid', 'grid_kolom': 'grid-template-columns',
  'grid_baris': 'grid-template-rows', 'grid_area': 'grid-area',
  'grid_kolom_mulai': 'grid-column-start', 'grid_kolom_akhir': 'grid-column-end',
  'grid_baris_mulai': 'grid-row-start', 'grid_baris_akhir': 'grid-row-end',
  'posisi_atas': 'top', 'posisi_bawah': 'bottom',
  'posisi_kiri': 'left', 'posisi_kanan': 'right',
  'z_indeks': 'z-index', 'indeks_z': 'z-index',
  'pelampung': 'float', 'jelas': 'clear',
  'potong': 'clip', 'potong_jalur': 'clip-path',
  'filter': 'filter', 'tapis': 'filter',
  'isi_svg': 'fill', 'garis_svg': 'stroke', 'lebar_garis_svg': 'stroke-width',
  'minyak_font': 'font-smoothing', 'halus_font': '-webkit-font-smoothing',
  'ketajaman': 'image-rendering',
  'bayangan_kotak_x': 'box-shadow',
  'ukuran_kotak': 'box-sizing',
  'tampilan_cetak': 'print-color-adjust',
  'isi': 'content', 'penyangga': 'contain',
  'kolom_hitung': 'column-count', 'kolom_cekang': 'column-gap',
  'kolom_atur': 'column-rule', 'kolom_lebar': 'column-width',
  'pecah_sebelum': 'break-before', 'pecah_sesudah': 'break-after',
  'pecah_dalam': 'break-inside',
  'bayangan_gambar': 'filter drop-shadow',
  'ukuran_objek': 'object-fit', 'posisi_objek': 'object-position',
  'bentuk_kontur': 'shape-outside', 'lingkaran_kontur': 'shape-margin',
  'gambar_mask': 'mask-image', 'mode_campuran': 'mix-blend-mode',
  'isolasi': 'isolation', 'hitung_campuran': 'backdrop-filter',
}

const CSS_VALUE_MAP: Record<string, string> = {
  'hitam': 'black', 'putih': 'white', 'merah': 'red',
  'hijau': 'green', 'biru': 'blue', 'kuning': 'yellow',
  'ungu': 'purple', 'oranye': 'orange', 'pink': 'pink',
  'coklat': 'brown', 'abu_abu': 'gray', 'abu': 'gray',
  'abu_terang': 'lightgray', 'abu_gelap': 'darkgray',
  'merah_gelap': 'darkred', 'hijau_gelap': 'darkgreen', 'biru_gelap': 'darkblue',
  'merah_terang': 'lightcoral', 'hijau_terang': 'lightgreen', 'biru_terang': 'lightblue',
  'cyan': 'cyan', 'magenta': 'magenta', 'emas': 'gold', 'perak': 'silver',
  'tambah': 'lime', 'biru_langit': 'skyblue', 'biru_laut': 'navy',
  'hijau_zaitun': 'olive', 'teal': 'teal', 'aqua': 'aqua',
  'lavender': 'lavender', 'salmon': 'salmon', 'krim': 'cream',
  'tengah': 'center', 'tidak_ada': 'none', 'kosong': 'none',
  'blok': 'block', 'sebaris': 'inline', 'fleksibel': 'flex',
  'sebaris_blok': 'inline-block', 'sebaris_fleksibel': 'inline-flex',
  'kisi': 'grid', 'sebaris_kisi': 'inline-grid',
  'absolut': 'absolute', 'relatif': 'relative', 'tetap': 'fixed',
  'lengket': 'sticky', 'statis': 'static',
  'tersembunyi': 'hidden', 'otomatis': 'auto', 'titik': 'pointer',
  'solid': 'solid', 'putus': 'dashed', 'titik_titik': 'dotted',
  'garis_ganda': 'double', 'alur': 'groove', 'punggung': 'ridge',
  'masuk': 'inset', 'keluar': 'outset', 'tidak_ditampilkan': 'none',
  'kiri': 'left', 'kanan': 'right', 'atas': 'top', 'bawah': 'bottom',
  'tengah_teks': 'center', 'rata_kiri': 'left', 'rata_kanan': 'right',
  'rata_rata': 'justify', 'wajar': 'normal', 'mewarisi': 'inherit',
  'awal': 'initial', 'batal': 'unset', 'tidak_diatur': 'revert',
  'tebal': 'bold', 'lebih_tebal': 'bolder', 'lebih_tipis': 'lighter',
  'normal_font': 'normal', 'miring_font': 'italic', 'condong': 'oblique',
  'kecil_kapital': 'small-caps', 'tidak_garis_bawah': 'none',
  'garis_bawah_text': 'underline', 'garis_tengah': 'line-through',
  'garis_atas': 'overline', 'kedip': 'blink',
  'kapital': 'uppercase', 'huruf_kecil': 'lowercase', 'kapitalisasi': 'capitalize',
  'penuh': 'full', 'pertama': 'first', 'terakhir': 'last',
  'judul': 'title', 'raster': 'pixelated', 'otomatis_konten': 'fit-content',
  'minimum_konten': 'min-content', 'maksimum_konten': 'max-content',
  'tilik': 'visible', 'gulir': 'scroll', 'auto_gulir': 'auto',
  'terlihat': 'visible', 'tersembunyi_tampil': 'hidden',
  'kandung': 'contain', 'tidak_kandung': 'none',
  'kubik': 'cubic-bezier', 'mudah': 'ease', 'mudah_masuk': 'ease-in',
  'mudah_keluar': 'ease-out', 'mudah_dalam_keluar': 'ease-in-out',
  'linier': 'linear', 'langkah': 'step', 'tak_terbatas': 'infinite',
  'maju': 'forwards', 'mundur': 'backwards', 'keduanya': 'both',
  'normal_animasi': 'normal', 'terbalik_animasi': 'reverse',
  'berselang': 'alternate', 'berselang_terbalik': 'alternate-reverse',
  'putar': 'rotate', 'skala_x': 'scaleX', 'skala_y': 'scaleY',
  'translasi_x': 'translateX', 'translasi_y': 'translateY',
  'miring_x': 'skewX', 'miring_y': 'skewY', 'matriks': 'matrix',
  'bungkus': 'wrap', 'tidak_bungkus': 'nowrap', 'bungkus_balik': 'wrap-reverse',
  'baris': 'row', 'kolom_arah': 'column', 'baris_balik': 'row-reverse',
  'kolom_balik': 'column-reverse',
  'lengkung': 'curve', 'kotak_batas': 'border-box', 'konten_kotak': 'content-box',
  'padding_kotak': 'padding-box', 'isi_kotak': 'fill-box',
  'tampil': 'show', 'tutup': 'close',
  'seret': 'grab', 'menggenggam': 'grabbing',
  'tidak_diperbolehkan': 'not-allowed', 'tunggu': 'wait',
  'sedang_proses': 'progress', 'bantu': 'help', 'teks_kursor': 'text',
  'pindah': 'move', 'silang': 'crosshair',
}

export function isIndoHTML(code: string): boolean {
  return /<!tipe\s+html>|<kepala|<badan[\s>]|<skrip|<gaya[\s>]/i.test(code)
}

function transpileIndoCSS(css: string): string {
  let result = css
  for (const [indo, eng] of Object.entries(HTML_TAG_MAP)) {
    result = result.replace(new RegExp('\\b' + indo + '\\b(?=\\s*[{,])', 'g'), eng)
  }
  const sortedProps = Object.entries(CSS_PROP_MAP).sort((a, b) => b[0].length - a[0].length)
  for (const [indo, eng] of sortedProps) {
    result = result.replace(new RegExp('\\b' + indo + '\\s*:', 'g'), eng + ':')
  }
  const sortedValues = Object.entries(CSS_VALUE_MAP).sort((a, b) => b[0].length - a[0].length)
  for (const [indo, eng] of sortedValues) {
    result = result.replace(new RegExp('\\b' + indo + '\\b', 'g'), eng)
  }
  return result
}

function transpileIndoHTML(source: string): TranspileResult {
  let html = source
  html = html.replace(/<!tipe\s+html>/gi, '<!DOCTYPE html>')
  const sortedTags = Object.entries(HTML_TAG_MAP).sort((a, b) => b[0].length - a[0].length)
  for (const [indo, eng] of sortedTags) {
    html = html.replace(new RegExp('<' + indo + '(?=[\\s>/])', 'gi'), '<' + eng)
    html = html.replace(new RegExp('</' + indo + '\\s*>', 'gi'), '</' + eng + '>')
  }
  const sortedAttrs = Object.entries(HTML_ATTR_MAP).sort((a, b) => b[0].length - a[0].length)
  for (const [indo, eng] of sortedAttrs) {
    html = html.replace(new RegExp('\\b' + indo + '\\s*=', 'gi'), eng + '=')
  }
  html = html.replace(/<style([^>]*)>([\s\S]*?)<\/style>/gi, function(_match, attrs, css) {
    return '<style' + attrs + '>' + transpileIndoCSS(css) + '</style>'
  })
  html = html.replace(/<script([^>]*)>([\s\S]*?)<\/script>/gi, function(_match, attrs, js) {
    const trimmed = js.trim()
    if (!trimmed) return '<script' + attrs + '></script>'
    const result = transpileIndoCode(trimmed)
    if (!result.success && result.errors.length > 0) {
      return '<script' + attrs + '>\n' + trimmed + '\n</script>'
    }
    return '<script' + attrs + '>\n' + result.code + '\n</script>'
  })
  return { code: html, errors: [], success: true, needsAsync: false, isHTML: true }
}

/**
 * Tokenize source into a sequence of tokens that distinguish code, string, and
 * comment regions. This is the foundation that lets the transpiler avoid
 * substituting keywords inside strings/comments — including multi-line template
 * literals (backtick strings) which the previous per-line approach got wrong.
 *
 * Token types:
 *   - 'code'    : plain JS code (subject to keyword substitution)
 *   - 'string'  : string literal "..." or '...' (single-line; protected)
 *   - 'template': template literal `...` (may span multiple lines; protected)
 *   - 'comment' : // line comment or /* block comment (protected)
 */
type Token = { type: 'code' | 'string' | 'template' | 'comment'; value: string }

function tokenizeSource(src: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  let codeBuf = ''
  const flushCode = () => {
    if (codeBuf) {
      tokens.push({ type: 'code', value: codeBuf })
      codeBuf = ''
    }
  }

  while (i < src.length) {
    const ch = src[i]
    const next = src[i + 1]

    // Line comment: // ... up to newline
    if (ch === '/' && next === '/') {
      flushCode()
      let end = src.indexOf('\n', i)
      if (end === -1) end = src.length
      tokens.push({ type: 'comment', value: src.slice(i, end) })
      i = end
      continue
    }

    // Block comment: /* ... */ (may span multiple lines)
    if (ch === '/' && next === '*') {
      flushCode()
      let end = src.indexOf('*/', i + 2)
      if (end === -1) {
        // Unterminated block comment — consume rest of source
        tokens.push({ type: 'comment', value: src.slice(i) })
        i = src.length
      } else {
        tokens.push({ type: 'comment', value: src.slice(i, end + 2) })
        i = end + 2
      }
      continue
    }

    // Double-quoted string
    if (ch === '"') {
      flushCode()
      let j = i + 1
      while (j < src.length) {
        if (src[j] === '\\') { j += 2; continue }
        if (src[j] === '"') { j++; break }
        // Strings don't span lines (JS rejects unterminated string literal)
        if (src[j] === '\n') { j++; break }
        j++
      }
      tokens.push({ type: 'string', value: src.slice(i, j) })
      i = j
      continue
    }

    // Single-quoted string
    if (ch === "'") {
      flushCode()
      let j = i + 1
      while (j < src.length) {
        if (src[j] === '\\') { j += 2; continue }
        if (src[j] === "'") { j++; break }
        if (src[j] === '\n') { j++; break }
        j++
      }
      tokens.push({ type: 'string', value: src.slice(i, j) })
      i = j
      continue
    }

    // Template literal (backtick) — CAN span multiple lines
    if (ch === '`') {
      flushCode()
      let j = i + 1
      while (j < src.length) {
        if (src[j] === '\\') { j += 2; continue }
        // Handle ${...} interpolation: skip until matching }
        if (src[j] === '$' && src[j + 1] === '{') {
          // Find matching closing brace, accounting for nested braces/strings
          let depth = 1
          j += 2
          while (j < src.length && depth > 0) {
            if (src[j] === '{') depth++
            else if (src[j] === '}') depth--
            // Skip nested strings inside ${} so braces inside strings don't break us
            else if (src[j] === '"' || src[j] === "'" || src[j] === '`') {
              const q = src[j]
              j++
              while (j < src.length && src[j] !== q) {
                if (src[j] === '\\') j += 2
                else j++
              }
            }
            j++
          }
          continue
        }
        if (src[j] === '`') { j++; break }
        j++
      }
      tokens.push({ type: 'template', value: src.slice(i, j) })
      i = j
      continue
    }

    // Regular expression literal detection.
    // We need to be careful: division `/` vs regex `/.../`. Use a heuristic:
    // a `/` is treated as the start of a regex if the previous non-whitespace
    // code character suggests we're at an expression position (after `(`, `,`,
    // `=`, `:`, `[`, `!`, `&`, `|`, `?`, `;`, `{`, `}`, `return`, etc.).
    // For simplicity (and because IndoCode rarely uses regex literals), we
    // treat a `/` followed by something that isn't `/` or `*` and isn't a
    // division-like context as regex ONLY when preceded by tokens that imply
    // expression position. This is best-effort; if it causes issues, regex
    // support can be revisited.
    if (ch === '/' && next !== '/' && next !== '*') {
      // Peek backwards in code buffer to decide context
      const trimmed = codeBuf.replace(/\s+$/, '')
      const lastChar = trimmed[trimmed.length - 1]
      const isExprContext =
        lastChar === undefined ||
        /[(,=:[!&|?;{}<>+\-*%]/.test(lastChar || '') ||
        /\b(return|typeof|in|of|instanceof|new|delete|void|yield|await|case|throw)$/.test(trimmed)
      if (isExprContext) {
        // Treat as regex literal — scan to closing / (single line, accounting for escapes and char classes)
        flushCode()
        let j = i + 1
        let inClass = false
        while (j < src.length) {
          const c = src[j]
          if (c === '\\') { j += 2; continue }
          if (c === '[') inClass = true
          else if (c === ']') inClass = false
          else if (c === '/' && !inClass) { j++; break }
          else if (c === '\n') { j++; break }
          j++
        }
        // Consume flags
        while (j < src.length && /[gimsuy]/.test(src[j])) j++
        tokens.push({ type: 'string', value: src.slice(i, j) })
        i = j
        continue
      }
    }

    // Regular code character
    codeBuf += ch
    i++
  }
  flushCode()
  return tokens
}

/**
 * Apply keyword/function/method substitutions to a single code segment.
 * Strings, templates, and comments are passed through unchanged.
 */
function applySubstitutions(code: string): string {
  let result = code

  // Replace keywords (longest first) — uses word boundary
  const sortedKeywords = Object.keys(KEYWORD_MAP).sort((a, b) => b.length - a.length)
  for (const keyword of sortedKeywords) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'g')
    result = result.replace(regex, KEYWORD_MAP[keyword])
  }

  // Special: tunggu(X) -> await __tunggu(X)
  // (Note: 'tunggu' alone is in KEYWORD_MAP as 'await', but 'tunggu(' is a function call)
  result = result.replace(/\bawait\s+__tunggu\s*\(/g, 'await __tunggu(')
  result = result.replace(/\btunggu\s*\(/g, 'await __tunggu(')
  // If 'tunggu' wasn't followed by '(', it should have been replaced by 'await'
  // via KEYWORD_MAP already. The above just fixes the function-call form.

  // Replace built-in functions (standalone, NOT preceded by a dot — method calls
  // are handled separately to avoid clobbering things like `obj.bulat`)
  const sortedFuncs = Object.keys(BUILTIN_FUNCTIONS).sort((a, b) => b.length - a.length)
  for (const fn of sortedFuncs) {
    const regex = new RegExp(`(?<!\\.)\\b${fn}\\b`, 'g')
    result = result.replace(regex, BUILTIN_FUNCTIONS[fn])
  }

  // Replace method names that appear after a dot
  const sortedMethods = Object.keys(BUILTIN_METHODS).sort((a, b) => b.length - a.length)
  for (const method of sortedMethods) {
    const regex = new RegExp(`\\.${method}\\b`, 'g')
    result = result.replace(regex, `.${BUILTIN_METHODS[method]}`)
  }

  // Handle saatTombol(tekanan) { ... } — function definition pattern
  result = result.replace(/\bsaatTombol\b/g, '__saatTombolHandler')

  return result
}

/**
 * Transpile IndoCode ke JavaScript (or HTML if detected)
 */
export function transpileIndoCode(source: string): TranspileResult {
  // Detect HTML-based IndoCode
  if (isIndoHTML(source)) {
    return transpileIndoHTML(source)
  }

  // Tokenize the entire source at once — this is what fixes the multi-line
  // template literal bug. Previously the transpiler split source per-line and
  // then per-line split by string regex, which meant a backtick string
  // spanning N lines was treated as N independent line fragments and the
  // contents were subject to keyword substitution. With a full-source
  // tokenizer, backtick strings (and comments) are recognized as atomic
  // protected regions and never have their contents rewritten.
  const tokens = tokenizeSource(source)

  // Build transpiled output while keeping a line map (transpiled line -> original line)
  // for error reporting. Since substitutions don't change line counts (we only
  // replace identifiers with same-or-similar-length identifiers and never
  // insert newlines), the line map is identity here.
  const transpiledParts: string[] = []
  for (const tok of tokens) {
    if (tok.type === 'code') {
      transpiledParts.push(applySubstitutions(tok.value))
    } else {
      // string / template / comment — pass through unchanged
      transpiledParts.push(tok.value)
    }
  }
  let transpiledCode = transpiledParts.join('')

  // Detect async: 'tunggu' (which became 'await') triggers async IIFE wrapper.
  // We check the ORIGINAL source so we don't get confused by 'await' that came
  // from keyword substitution (it always comes from 'tunggu', but check source
  // anyway for clarity).
  const needsAsync = /\btunggu\b/.test(source) || /\bawait\b/.test(transpiledCode)

  // Transform: while (true) { await __tunggu(N); ... } -> __gameLoop(N, fn)
  // This prevents infinite while(true) + await from hanging the browser.
  //
  // The previous regex used `[\s\S]*?` non-greedy match to the first `\n\s*}`,
  // which failed when the loop body had nested blocks (jika/dll) before the
  // tunggu() line. We now use a brace-matching scan instead of regex so that
  // nested `{...}` blocks inside the loop body are correctly accounted for.
  transpiledCode = transformGameLoops(transpiledCode)

  // If there's still an `await` (i.e. tunggu was used outside while(true)),
  // wrap in async IIFE so top-level await becomes valid.
  const hasRemainingAwait = /\bawait\b/.test(transpiledCode)
  if (hasRemainingAwait) {
    transpiledCode = `(async function() {\n${transpiledCode}\n})();`
  }

  // Validate by attempting to construct a Function. Syntax errors throw here.
  try {
    new Function(transpiledCode)
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e)
    const lineMatch = errMsg.match(/line (\d+)|:(\d+)/)
    let errorLine = 1
    if (lineMatch) {
      errorLine = parseInt(lineMatch[1] || lineMatch[2], 10) || 1
    }
    return {
      code: transpiledCode,
      errors: [{
        line: errorLine,
        column: 0,
        message: translateErrorMessage(errMsg),
        originalLine: errorLine,
      }],
      success: false,
      needsAsync,
    }
  }

  return {
    code: transpiledCode,
    errors: [],
    success: true,
    needsAsync,
  }
}

/**
 * Scan transpiled code and convert `while (true) { ... await __tunggu(N) ... }`
 * into `__gameLoop(N, function() { ... })`. Uses proper brace-depth tracking
 * so that nested blocks (if/for/etc.) inside the loop body don't trip the
 * detection — the previous regex-based approach failed whenever the loop body
 * had a nested `{...}` block before the `tunggu()` line.
 *
 * Also handles `while (true) { ... }` WITHOUT tunggu (left as-is, since the
 * user might have a manual break condition).
 */
function transformGameLoops(code: string): string {
  // Find each `while ( true )` (or `while(true)`) and process its body via
  // brace matching. We do a single left-to-right pass; replacements are
  // collected and stitched back at the end.
  let result = ''
  let i = 0
  while (i < code.length) {
    // Find next occurrence of `while`
    const whileIdx = code.indexOf('while', i)
    if (whileIdx === -1) {
      result += code.slice(i)
      break
    }

    // Append everything up to the `while` keyword verbatim
    result += code.slice(i, whileIdx)

    // Verify it's `while` as a word (not part of a longer identifier like `awhile`)
    const before = code[whileIdx - 1]
    if (before && /[A-Za-z0-9_$]/.test(before)) {
      // Not a real `while` keyword — copy and continue
      result += 'while'
      i = whileIdx + 5
      continue
    }

    // Find the opening `(` of the condition
    let j = whileIdx + 5
    while (j < code.length && /\s/.test(code[j])) j++
    if (code[j] !== '(') {
      // Not a while-loop — copy `while` verbatim and move on
      result += 'while'
      i = whileIdx + 5
      continue
    }

    // Find matching `)` for the condition (handle nested parens)
    let depth = 1
    let condStart = j + 1
    let condEnd = -1
    let k = j + 1
    while (k < code.length && depth > 0) {
      if (code[k] === '(') depth++
      else if (code[k] === ')') depth--
      if (depth === 0) { condEnd = k; break }
      k++
    }
    if (condEnd === -1) {
      // Malformed — copy verbatim
      result += 'while'
      i = whileIdx + 5
      continue
    }
    const cond = code.slice(condStart, condEnd).trim()

    // Find opening `{` of the body
    let bodyStart = condEnd + 1
    while (bodyStart < code.length && /\s/.test(code[bodyStart])) bodyStart++
    if (code[bodyStart] !== '{') {
      // Single-statement while — not our target. Copy verbatim.
      result += code.slice(whileIdx, bodyStart)
      i = bodyStart
      continue
    }

    // Find matching `}` for the body via brace-depth (also skips strings/comments)
    let braceDepth = 1
    let bodyEnd = -1
    let m = bodyStart + 1
    while (m < code.length && braceDepth > 0) {
      const c = code[m]
      const n = code[m + 1]
      // Skip string literals so braces inside strings don't count
      if (c === '"' || c === "'") {
        m++
        while (m < code.length && code[m] !== c) {
          if (code[m] === '\\') m += 2
          else m++
        }
        m++
        continue
      }
      // Skip template literals (may span lines and contain ${...})
      if (c === '`') {
        m++
        while (m < code.length && code[m] !== '`') {
          if (code[m] === '\\') { m += 2; continue }
          if (code[m] === '$' && code[m + 1] === '{') {
            // Skip the ${...} — track nested braces and nested strings
            let d = 1
            m += 2
            while (m < code.length && d > 0) {
              if (code[m] === '{') d++
              else if (code[m] === '}') d--
              else if (code[m] === '"' || code[m] === "'" || code[m] === '`') {
                const q = code[m]; m++
                while (m < code.length && code[m] !== q) {
                  if (code[m] === '\\') m += 2
                  else m++
                }
              }
              m++
            }
            continue
          }
          m++
        }
        m++
        continue
      }
      // Skip line comments
      if (c === '/' && n === '/') {
        m += 2
        while (m < code.length && code[m] !== '\n') m++
        continue
      }
      // Skip block comments
      if (c === '/' && n === '*') {
        m += 2
        const close = code.indexOf('*/', m)
        if (close === -1) { m = code.length; break }
        m = close + 2
        continue
      }
      if (c === '{') braceDepth++
      else if (c === '}') {
        braceDepth--
        if (braceDepth === 0) { bodyEnd = m; break }
      }
      m++
    }
    if (bodyEnd === -1) {
      // Malformed — copy verbatim
      result += code.slice(whileIdx, bodyStart + 1)
      i = bodyStart + 1
      continue
    }

    const body = code.slice(bodyStart + 1, bodyEnd)

    // Only transform if condition is `true` AND body contains __tunggu
    if (cond === 'true' && body.includes('__tunggu')) {
      // Extract the wait time if possible (first __tunggu(N) call)
      const waitMatch = body.match(/await\s+__tunggu\s*\((\d+)\)/)
      const ms = waitMatch ? waitMatch[1] : '100'
      // Remove `await __tunggu(N);` from the body — it's now driven by setInterval
      const cleanBody = body.replace(/await\s+__tunggu\s*\(\d+\)\s*;?/g, '')
      result += `__gameLoop(${ms}, function() {${cleanBody}\n});`
    } else {
      // Keep verbatim — either not `while(true)` or no tunggu inside
      result += code.slice(whileIdx, bodyEnd + 1)
    }
    i = bodyEnd + 1
  }
  return result
}

/**
 * Translate common JS error messages to Indonesian
 */
function translateErrorMessage(msg: string): string {
  const translations: Array<[RegExp, string]> = [
    [/Unexpected token/, 'Token tidak terduga (cek tanda baca di sekitar baris ini)'],
    [/Unexpected identifier/, 'Identifier tidak terduga (mungkin kurang operator)'],
    [/Unexpected string/, 'String tidak terduga (mungkin kurang operator sebelum string)'],
    [/Unexpected number/, 'Angka tidak terduga'],
    [/Unexpected end of input/, 'Input tidak lengkap — mungkin kurang kurung tutup } atau ) atau ]'],
    [/is not defined/, 'tidak didefinisikan. Pastikan variabel/fungsi sudah dideklarasikan dengan "variabel", "konstanta", atau "fungsi"'],
    [/is not a function/, 'bukan sebuah fungsi. Cek ejaan nama fungsi atau pastikan nilainya benar-benar fungsi'],
    [/Cannot read propert/, 'Tidak bisa membaca properti'],
    [/of undefined/, 'dari nilai yang belum diisi (undefined). Pastikan variabel sudah diinisialisasi'],
    [/of null/, 'dari nilai null. Pastikan elemen/objek ditemukan sebelum diakses'],
    [/Invalid or unexpected token/, 'Token tidak valid atau tidak terduga — cek karakter tersembunyi atau typo'],
    [/Missing semicolon/, 'Kurang titik koma (;) — sebenarnya bisa diabaikan, tapi kode di baris ini mungkin tidak lengkap'],
    [/Missing initializer in (const|let) declaration/, 'Kurang nilai awal pada deklarasi. Contoh: konstanta x = 5'],
    [/Identifier .* has already been declared/, 'Variabel/identifier sudah dideklarasikan sebelumnya. Gunakan nama lain atau hapus deklarasi duplikat'],
    [/Cannot use .* before declaration/, 'Tidak bisa menggunakan variabel sebelum dideklarasikan (hoisting issue)'],
    [/Maximum call stack size exceeded/, 'Ukuran tumpukan panggilan maksimum terlampaui — kemungkinan ada rekursi tak terbatas (fungsi memanggil dirinya sendiri tanpa kondisi berhenti)'],
    [/Promise .* rejected/, 'Promise ditolak — terjadi error pada operasi async. Tangkap dengan "tangkap" atau coba/tangkap'],
    [/await is only valid in async function/, '"tunggu" hanya valid di dalam fungsi "asinkron". Tambahkan "asinkron" sebelum "fungsi"'],
    [/Illegal return statement/, 'return di luar fungsi — "kembalikan" hanya boleh di dalam "fungsi"'],
    [/Illegal break statement/, 'break di luar loop — "putus" hanya boleh di dalam "untuk", "selama", "lakukan", atau "pilih"'],
    [/continue is not valid/, 'continue di luar loop — "lanjut" hanya boleh di dalam loop'],
    [/is not iterable/, 'nilai tidak bisa di-iterasi (bukan array/string). Pastikan menggunakan array atau objek iterable'],
    [/JSON\.parse.*Unexpected/, 'JSON tidak valid — periksa tanda kutip dan koma pada string JSON'],
    [/Assignment to constant variable/, 'Tidak bisa mengubah nilai "konstanta" setelah dideklarasikan. Gunakan "variabel" jika perlu diubah'],
    [/Duplicate parameter name/, 'Nama parameter fungsi duplikat — gunakan nama unik'],
  ]
  let result = msg
  for (const [pattern, translation] of translations) {
    if (pattern.test(msg)) {
      result = translation + ' (asli: ' + msg + ')'
      break
    }
  }
  return result
}

/**
 * Monaco language definition for IndoCode
 */
export function registerIndoCodeLanguage(monaco: typeof import('monaco-editor')) {
  monaco.languages.register({ id: 'indocode', extensions: ['.indo'], aliases: ['IndoCode', 'indocode'] })

  monaco.languages.setMonarchTokensProvider('indocode', {
    defaultToken: '',
    tokenPostfix: '.indo',
    ignoreCase: false,
    keywords: [
      'konstanta', 'variabel', 'jika', 'atau_jika', 'kalau_tidak', 'selain_itu',
      'untuk', 'selama', 'lakukan', 'fungsi', 'kembalikan', 'kembali', 'tampilkan', 'cetak',
      'benar', 'salah', 'kosong', 'tidak_terdefinisi',
      'pilih', 'kasus', 'kasus_lain', 'putus', 'lanjut',
      'coba', 'tangkap', 'akhirnya', 'lempar',
      'baru', 'ini', 'kelas', 'perluas', 'super', 'statis', 'dapatkan', 'atur',
      'asinkron', 'tunggu', 'tipe', 'contoh',
      'dari_pada', 'dalam', 'hapus', 'dari', 'impor', 'ekspor',
      'hasilkan', 'generator', 'sebagai', 'standar_bawaan', 'tunggu_semua',
      'ambilElemen', 'ambilElemenSemua', 'buatElemen', 'acakBulat', 'berhentiProgram',
      'aturWaktu', 'aturSelang', 'aturInterval', 'hentikanWaktu', 'dengarkan', 'hentikan',
      'saatTombol', 'masukan', 'input', 'konfirmasi', 'bingkaiBerikutnya',
      'maks', 'min', 'bulat', 'lantai', 'langit_langit', 'pangkat', 'akar', 'mutlak', 'bulatkan',
      'acak', 'bulat_atas', 'bulat_bawah',
      'string_ke', 'angka_ke', 'bilangan_ke', 'desimal_ke',
      'json_ke_string', 'string_ke_json',
      'waktu_sekarang', 'tanggal_sekarang',
      'ubahTeks', 'ubahHTML', 'aturGaya', 'aturAtributElemen', 'sembunyikan', 'tampilkanElemen',
      'mulaiTimer', 'hentikanTimer',
    ],
    operators: [
      '+', '-', '*', '/', '%', '=', '==', '===', '!=', '!==',
      '<', '>', '<=', '>=', '&&', '||', '!', '&', '|', '^', '~',
      '<<', '>>', '>>>', '+=', '-=', '*=', '/=', '%=',
      '++', '--', '?', ':', '=>',
    ],
    symbols: /[=><!~?:&|+\-*/^%]+/,
    escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
    tokenizer: {
      root: [
        [/(konstanta|variabel|fungsi|kembalikan|kembali|tampilkan|cetak|jika|atau_jika|kalau_tidak|selain_itu|untuk|selama|lakukan|pilih|kasus|kasus_lain|putus|lanjut|coba|tangkap|akhirnya|lempar|baru|ini|kelas|perluas|super|statis|dapatkan|atur|asinkron|tunggu|tipe|dari_pada|dalam|hapus|dari|impor|ekspor|saatTombol|hasilkan|generator|sebagai|standar_bawaan|tunggu_semua)\b/, 'keyword'],
        [/(benar|salah|kosong|tidak_terdefinisi)\b/, 'keyword'],
        [/(ambilElemen|ambilElemenSemua|buatElemen|acakBulat|acak|berhentiProgram|hentikan|tunggu|aturWaktu|aturSelang|aturInterval|hentikanWaktu|hentikanInterval|hentikanSelang|dengarkan|masukan|input|konfirmasi|bingkaiBerikutnya|maks|min|bulat|lantai|langit_langit|pangkat|akar|mutlak|bulatkan|bulat_atas|bulat_bawah|string_ke|angka_ke|bilangan_ke|desimal_ke|json_ke_string|string_ke_json|waktu_sekarang|tanggal_sekarang|ubahTeks|ubahHTML|aturGaya|aturAtributElemen|sembunyikan|tampilkanElemen|mulaiTimer|hentikanTimer)\b/, 'identifier'],
        [/\d+(\.\d+)?/, 'number'],
        [/"([^"\\]|\\.)*$/, 'string.invalid'],
        [/"/, 'string', '@string_double'],
        [/'([^'\\]|\\.)*$/, 'string.invalid'],
        [/'/, 'string', '@string_single'],
        [/`/, 'string', '@string_backtick'],
        [/\/\/.*$/, 'comment'],
        [/\/\*/, 'comment', '@comment'],
        [/@symbols/, { cases: { '@operators': 'operator', '@default': '' } }],
        [/\s+/, 'white'],
        [/[a-zA-Z_]\w*/, { cases: { '@keywords': 'keyword', '@default': 'identifier' } }],
        [/[{}()\[\]]/, '@brackets'],
        [/[;,.]/, 'delimiter'],
      ],
      string_double: [
        [/[^\\"]+/, 'string'],
        [/@escapes/, 'string.escape'],
        [/\\./, 'string.escape.invalid'],
        [/"/, 'string', '@pop'],
      ],
      string_single: [
        [/[^\\']+/, 'string'],
        [/@escapes/, 'string.escape'],
        [/\\./, 'string.escape.invalid'],
        [/'/, 'string', '@pop'],
      ],
      string_backtick: [
        [/[^\\`]+/, 'string'],
        [/@escapes/, 'string.escape'],
        [/\\./, 'string.escape.invalid'],
        [/`/, 'string', '@pop'],
      ],
      comment: [
        [/[^/*]+/, 'comment'],
        [/\*\//, 'comment', '@pop'],
        [/[/*]/, 'comment'],
      ],
    },
  })

  monaco.languages.setLanguageConfiguration('indocode', {
    comments: { lineComment: '//', blockComment: ['/*', '*/'] },
    brackets: [['{', '}'], ['[', ']'], ['(', ')']],
    autoClosingPairs: [
      { open: '{', close: '}' }, { open: '[', close: ']' }, { open: '(', close: ')' },
      { open: '"', close: '"' }, { open: "'", close: "'" }, { open: '`', close: '`' },
    ],
    surroundingPairs: [
      { open: '{', close: '}' }, { open: '[', close: ']' }, { open: '(', close: ')' },
      { open: '"', close: '"' }, { open: "'", close: "'" }, { open: '`', close: '`' },
    ],
  })
}

/**
 * Detect if IndoCode source uses canvas/DOM that needs visible sandbox
 */
export function detectCanvasUsage(code: string): boolean {
  // Match all canvas method calls + ambilElemen + getContext/konteks
  const canvasPatterns = [
    /\bambilElemen\s*\(/,           // ambilElemen(...)
    /\bkonteks\s*\(/,               // .konteks(...)
    /\bgetContext\s*\(/,             // .getContext(...)
    /\.bersihkan\b/,
    /\.warnaIsi\b/,
    /\.warnaGaris\b/,
    /\.kotak\b/,
    /\.kotakGaris\b/,
    /\.garis\b/,
    /\.lingkaran\b/,
    /\.teks\b/,
    /\.ukuranTeks\b/,
    /\.ukuranFont\b/,
    /<kanvas\b/,                     // IndoCode HTML <kanvas>
    /\bgame\b/,                      // canvas id="game" common pattern
  ]
  return canvasPatterns.some(re => re.test(code))
}

export interface IndoCodeRunner {
  stop: () => void
  iframe: HTMLIFrameElement | null
}

/**
 * Run IndoCode in a sandboxed iframe and capture output.
 *
 * Options:
 * - container: HTML element where the iframe should be embedded.
 *              If provided, the iframe fills this container (used by Run Panel for canvas games).
 *              If not provided, iframe is appended to document.body (hidden for non-canvas).
 */
export function runIndoCode(
  code: string,
  onOutput: (output: string) => void,
  onError: (error: { line: number; message: string; originalLine: number }) => void,
  onComplete: () => void,
  onCanvas?: (canvas: HTMLCanvasElement) => void,
  container?: HTMLElement | null
): IndoCodeRunner {
  const result = transpileIndoCode(code)

  if (!result.success && result.errors.length > 0) {
    for (const err of result.errors) {
      onError({
        line: err.originalLine,
        message: err.message,
        originalLine: err.originalLine,
      })
    }
    onComplete()
    return { stop: () => {}, iframe: null }
  }

  // Detect HTML-based IndoCode (e.g. <!tipe html><kepala>...)
  const isHTMLResult = !!result.isHTML
  const usesCanvas = detectCanvasUsage(code)
  const needsVisibleSandbox = usesCanvas || isHTMLResult

  // Create sandboxed iframe
  const iframe = document.createElement('iframe')
  if (container) {
    // Embed in provided container (e.g. Run Panel preview area)
    iframe.style.cssText = 'width:100%;height:100%;border:none;background:#1a1a1a;display:block;'
  } else if (needsVisibleSandbox) {
    // Standard visible mode (fallback, when no container provided)
    iframe.style.cssText = 'position:fixed;bottom:50vh;left:0;width:100%;height:50vh;border:none;z-index:60;background:#fff;'
  } else {
    iframe.style.display = 'none'
  }
  iframe.sandbox = 'allow-scripts allow-same-origin'

  // Append to container if provided, else to body
  if (container) {
    container.innerHTML = ''
    container.appendChild(iframe)
  } else {
    document.body.appendChild(iframe)
  }

  // ====== Build execution HTML ======
  // For HTML-based IndoCode: render the transpiled HTML directly (do NOT eval as JS)
  // For JS-based IndoCode: inject canvas + eval the transpiled JS
  let html: string

  // The console-capture + error-capture script (injected into both HTML/JS variants)
  const captureScript = `<script>
${RUNTIME_HELPERS}

// Capture console.log
var __origLog = console.log;
console.log = function() {
  var args = Array.from(arguments);
  var msg = args.map(function(a) {
    if (typeof a === 'object') { try { return JSON.stringify(a, null, 2); } catch(e) { return String(a); } }
    return String(a);
  }).join(' ');
  parent.postMessage({ type: 'indocode-output', message: msg }, '*');
  var outputDiv = document.getElementById('output');
  if (outputDiv) { outputDiv.innerHTML += msg + '<br>'; outputDiv.scrollTop = outputDiv.scrollHeight; }
};

var __stopped = false;

window.addEventListener('error', function(e) {
  if (!__stopped && e.message !== '__BERHENTI__') {
    parent.postMessage({ type: 'indocode-error', message: String(e.message || ''), line: e.lineno || 0 }, '*');
  }
});

window.onerror = function(msg, url, line, col) {
  if (!__stopped && msg !== '__BERHENTI__') {
    parent.postMessage({ type: 'indocode-error', message: String(msg), line: line || 0 }, '*');
  }
  return true;
};

window.addEventListener('unhandledrejection', function(e) {
  if (!__stopped && e.reason && e.reason.message !== '__BERHENTI__') {
    parent.postMessage({ type: 'indocode-error', message: 'Promise ditolak: ' + (e.reason && e.reason.message ? e.reason.message : String(e.reason)), line: 0 }, '*');
  }
});
<\/script>`

  if (isHTMLResult) {
    // ====== HTML-BASED INDOCODE ======
    // The transpiled HTML already contains the user's <canvas>, <script>, etc.
    // We just inject the runtime helpers + console capture into <head> or top of body.
    let userHtml = result.code

    // Inject runtime helpers + console capture into <head> (or before user content if no <head>)
    const injectBlock = captureScript
    if (userHtml.includes('<head>')) {
      userHtml = userHtml.replace('<head>', '<head>' + injectBlock)
    } else if (userHtml.includes('<head ')) {
      userHtml = userHtml.replace(/<head([^>]*)>/, '<head$1>' + injectBlock)
    } else if (userHtml.includes('<body>')) {
      userHtml = userHtml.replace('<body>', '<body>' + injectBlock)
    } else if (userHtml.includes('<body')) {
      userHtml = userHtml.replace(/<body([^>]*)>/, '<body$1>' + injectBlock)
    } else {
      // No head/body — wrap in a basic HTML doc
      userHtml = '<!DOCTYPE html><html><head>' + injectBlock + '</head><body>' + userHtml + '</body></html>'
    }

    // Inject "complete" signal at the end of body
    if (userHtml.includes('</body>')) {
      userHtml = userHtml.replace('</body>', '<script>setTimeout(function(){ parent.postMessage({ type: "indocode-complete" }, "*"); }, 300);<\/script></body>')
    } else {
      userHtml += '<script>setTimeout(function(){ parent.postMessage({ type: "indocode-complete" }, "*"); }, 300);<\/script>'
    }

    html = userHtml
  } else {
    // ====== JS-BASED INDOCODE ======
    const canvasHtml = needsVisibleSandbox ? `
<!-- Auto-inject canvas for game code -->
<canvas id="game" width="400" height="400" style="display:block;margin:0 auto;border:2px solid #333;background:#f0f0f0;"></canvas>
<div id="output" style="font-family:monospace;font-size:12px;padding:8px;color:#333;max-height:120px;overflow-y:auto;"></div>
` : ''

    html = `<!DOCTYPE html>
<html>
<head><title>IndoCode Runner</title>
<style>
body { margin:0; padding:8px; font-family:sans-serif; background:#1a1a1a; color:#d4d4d4; min-height:100vh; }
canvas { display:block; margin:0 auto; }
</style>
</head>
<body>
${canvasHtml}
<script>
${RUNTIME_HELPERS}

// Capture console
console.log = function() {
  var args = Array.from(arguments);
  var msg = args.map(function(a) {
    if (typeof a === 'object') { try { return JSON.stringify(a, null, 2); } catch(e) { return String(a); } }
    return String(a);
  }).join(' ');
  parent.postMessage({ type: 'indocode-output', message: msg }, '*');
  var outputDiv = document.getElementById('output');
  if (outputDiv) { outputDiv.innerHTML += msg + '<br>'; outputDiv.scrollTop = outputDiv.scrollHeight; }
};

var __stopped = false;

window.onerror = function(msg, url, line, col) {
  if (!__stopped && msg !== '__BERHENTI__') {
    parent.postMessage({ type: 'indocode-error', message: String(msg), line: line || 0 }, '*');
  }
  return true;
};

window.addEventListener('unhandledrejection', function(e) {
  if (!__stopped && e.reason && e.reason.message !== '__BERHENTI__') {
    parent.postMessage({ type: 'indocode-error', message: 'Promise ditolak: ' + (e.reason && e.reason.message ? e.reason.message : String(e.reason)), line: 0 }, '*');
  }
});

try {
  eval(${JSON.stringify(result.code)});
} catch(e) {
  if (e.message !== '__BERHENTI__') {
    var stack = e.stack || '';
    var lineMatch = stack.match(/:(\\d+):\\d+/);
    var line = lineMatch ? parseInt(lineMatch[1]) : 0;
    parent.postMessage({
      type: 'indocode-error',
      message: e.message || String(e),
      line: line
    }, '*');
  }
} finally {
  // For non-canvas programs: send complete after a short delay (program is done)
  // For canvas games: also send complete to signal "started successfully" but
  // the game loop keeps running via setInterval internally. User can stop via Stop button.
  var delay = ${needsVisibleSandbox ? '300' : '100'};
  setTimeout(function() {
    parent.postMessage({ type: 'indocode-complete' }, '*');
  }, delay);
}
<\/script>
</body>
</html>`
  }

  let stopped = false
  let messageHandler: ((event: MessageEvent) => void) | null = null

  messageHandler = (event: MessageEvent) => {
    if (event.data.type === 'indocode-output') {
      onOutput(event.data.message)
    } else if (event.data.type === 'indocode-error') {
      onError({
        line: event.data.line || 0,
        message: translateErrorMessage(event.data.message),
        originalLine: event.data.line || 0,
      })
    } else if (event.data.type === 'indocode-stopped') {
      // Program was stopped programmatically (via berhentiProgram())
      if (messageHandler) window.removeEventListener('message', messageHandler)
      if (needsVisibleSandbox) {
        try {
          const canvas = iframe.contentDocument?.getElementById('game') as HTMLCanvasElement | null
          if (canvas && onCanvas) onCanvas(canvas)
        } catch (e) {
          // Cross-origin — skip
        }
      }
      // For non-canvas programs: auto-cleanup iframe after a short delay
      if (!needsVisibleSandbox && !container) {
        setTimeout(() => {
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe)
        }, 500)
      }
      onComplete()
    } else if (event.data.type === 'indocode-complete') {
      // For canvas games: keep handler alive to receive future indocode-output
      // (game loop runs indefinitely via setInterval) and indocode-stopped
      // (when berhentiProgram() is called from inside the game loop).
      // For non-canvas: remove handler (program is done).
      if (!needsVisibleSandbox) {
        if (messageHandler) window.removeEventListener('message', messageHandler)
      }
      // Notify canvas is ready (for games, the canvas is now visible in iframe)
      if (needsVisibleSandbox) {
        try {
          const canvas = iframe.contentDocument?.getElementById('game') as HTMLCanvasElement | null
          if (canvas && onCanvas) onCanvas(canvas)
        } catch (e) {
          // Cross-origin — skip
        }
      }
      // For non-canvas programs: auto-cleanup iframe after a short delay
      // For canvas games: keep iframe alive so game keeps running (user clicks Stop / Exit to clean up)
      if (!needsVisibleSandbox && !container) {
        setTimeout(() => {
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe)
        }, 500)
      }
      onComplete()
    }
  }

  window.addEventListener('message', messageHandler)
  iframe.srcdoc = html

  // Focus iframe so keyboard events go there (for games)
  if (needsVisibleSandbox) {
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus()
      } catch (e) {
        // Cross-origin iframe focus can throw — ignore
      }
    }, 200)
  }

  const stop = () => {
    if (stopped) return
    stopped = true
    if (messageHandler) {
      window.removeEventListener('message', messageHandler)
      messageHandler = null
    }
    // Stop all intervals/timeouts inside the iframe
    try {
      const win = iframe.contentWindow
      if (win) {
        // Call __hentikanSemuaLoop if available
        const anyWin = win as any
        if (typeof anyWin.__hentikanSemuaLoop === 'function') {
          anyWin.__hentikanSemuaLoop()
        }
      }
    } catch (e) {
      // Cross-origin — ignore
    }
    // Remove iframe
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe)
  }

  return { stop, iframe }
}

/**
 * Get suggestions for fixing common errors
 */
export function getErrorSuggestion(line: number, message: string, code: string): string | null {
  if (message.includes('tidak didefinisikan')) {
    const varMatch = message.match(/(\w+).*tidak didefinisikan|(\w+).*is not defined/)
    if (varMatch) {
      const varName = varMatch[1] || varMatch[2]
      return `Variabel "${varName}" belum dideklarasikan. Tambahkan: variabel ${varName} = ... atau konstanta ${varName} = ... di awal kode`
    }
  }
  if (message.includes('Input tidak lengkap')) {
    return `Mungkin ada kurung yang tidak ditutup. Cek pasangan: (), {}, []`
  }
  if (message.includes('bukan sebuah fungsi')) {
    return `Method/fungsi tidak ditemukan. Cek ejaan nama fungsi/method, atau pastikan variabel benar-benar bertipe fungsi`
  }
  if (message.includes('Tidak bisa membaca properti')) {
    return `Mencoba mengakses properti dari nilai kosong. Pastikan variabel/elemen sudah diisi sebelum dipakai`
  }
  if (message.includes('Token tidak terduga') || message.includes('Token tidak valid')) {
    return `Ada tanda baca salah tempat. Cek kurung, koma, titik koma, atau tanda kutip di sekitar baris ini`
  }
  if (message.includes('sudah dideklarasikan')) {
    return `Variabel dengan nama yang sama sudah ada. Gunakan nama lain atau hapus deklarasi duplikat`
  }
  if (message.includes('Kurang nilai awal')) {
    return `Deklarasi konstanta/variabel butuh nilai awal. Contoh: konstanta x = 10`
  }
  if (message.includes('rekursi') || message.includes('call stack')) {
    return `Fungsi memanggil dirinya sendiri tanpa henti. Tambahkan kondisi "jika" untuk berhenti`
  }
  if (message.includes('tunggu') && message.includes('asinkron')) {
    return `Keyword "tunggu" hanya boleh di dalam fungsi "asinkron". Tambahkan "asinkron" sebelum "fungsi"`
  }
  if (message.includes('return di luar') || message.includes('Illegal return')) {
    return `"kembalikan" hanya boleh di dalam "fungsi" — pindahkan ke dalam fungsi`
  }
  if (message.includes('break di luar') || message.includes('Illegal break')) {
    return `"putus" hanya boleh di dalam loop "untuk", "selama", "lakukan", atau "pilih"`
  }
  if (message.includes('tidak bisa di-iterasi')) {
    return `Nilai bukan array/string. Pastikan menggunakan [...] atau "dari_pada" untuk iterasi`
  }
  if (message.includes('JSON tidak valid')) {
    return `Format JSON salah. Pastikan: kunci pakai tanda kutip ganda, tidak ada koma trailing`
  }
  if (message.includes('konstanta')) {
    return `Tidak bisa mengubah "konstanta". Ganti ke "variabel" jika nilainya perlu diubah`
  }
  return null
}
