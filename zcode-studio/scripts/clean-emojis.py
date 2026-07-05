#!/usr/bin/env python3
"""
Clean all emojis + gaul slang from ZCode Studio source files.
Replaces with professional Indonesian text.
"""
import re
from pathlib import Path

# Comprehensive emoji pattern
EMOJI_PATTERN = re.compile(
    "[\U0001F300-\U0001F9FF"
    "\U0001FA00-\U0001FAFF"
    "\u2600-\u27BF"
    "\U0001F000-\U0001F2FF"
    "\u2705\u2728\u2764\u20E3"
    "✓✗✅❌⏹⏺⚠️❓❗👋🧠🤔💡📌🎮⚡📝🎨🐍📘⚛️📋🌐📱⚙️🇮🇩📁💾🤖🐛🚀✨🔥💪😎🤙☑️♥️♡➡️⬅️⬆️⬇️]",
    flags=re.UNICODE
)

# Common gaul slang → professional Indonesian
SLANG_REPLACEMENTS = [
    # Toasts / UI labels
    ('bro', ''),
    ('bro.', ''),
    ('Bro', ''),
    ('Bro.', ''),
    (' sis', ''),
    (' cuy', ''),
    (' ngab', ''),
    (' yak', ''),
    (' yuk', ''),
    (' yok', ''),
    (' gas', ''),
    ('Bikin ', 'Buat '),
    ('bikin ', 'buat '),
    ('Buatkan ', 'Buat '),
    ('Gak ', 'Tidak '),
    ('gak ', 'tidak '),
    ('gak', 'tidak'),
    ('Gue ', 'AI '),
    ('gue ', 'AI '),
    ('Gue', 'AI'),
    ('gue', 'AI'),
    ('Lo ', 'Anda '),
    ('lo ', 'anda '),
    ('Lo', 'Anda'),
    ('lo', 'anda'),
    ('buat run', 'untuk menjalankan'),
    ('Buat file', 'Buat file'),
    ('Buat folder', 'Buat folder'),
    ('blom', 'belum'),
    ('blum', 'belum'),
    ('udah', 'sudah'),
    ('udh', 'sudah'),
    ('kayak', 'seperti'),
    ('kaya', 'seperti'),
    ('apa aja', 'apa saja'),
    ('apa aj', 'apa saja'),
    ('tuch', 'tuh'),
    ('yah', ''),
    ('yw', 'sama-sama'),
    ('btw', 'ngomong-ngomong'),
    ('okeh', 'oke'),
    ('sip', 'oke'),
    ('mantap', 'bagus'),
    ('keren', 'bagus'),
    ('literally', 'persis'),
    ('lowkey', ''),
    ('highkey', ''),
    ('vibes', ''),
    ('wkwk', 'haha'),
    ('halu', 'berhalusinasi'),
    ('ngegas', 'bercanda'),
    (' Halo bro!', ' Halo!'),
    ('Halo bro!', 'Halo!'),
    ('Halo bro', 'Halo'),
    ('halo bro', 'halo'),
    ('Bro!', '!'),
    ('bro!', '!'),
    (' bro!', '!'),
    ('Bro ', ''),
    ('Bro.', '.'),
    (' bro.', '.'),
    ('bro ', ''),
    (' bro ', ' '),
    (' bro,', ','),
    (' bro ', ' '),
    ('Bro ', ''),
    ('eh ', ''),
    ('Eh ', ''),
    ('bro!', '!'),
    ('bro', ''),
    ('Bro', ''),
    ('Bro,', ','),
    ('😅', ''),
    ('😎', ''),
    ('🤙', ''),
    ('💪', ''),
    ('🔥', ''),
    ('✨', ''),
    ('🚀', ''),
    ('🤔', ''),
    ('💡', ''),
    ('📋', ''),
    ('🐛', ''),
    ('✓ ', '- '),
    ('✓', '-'),
    ('✗', 'x'),
    ('✅', 'OK'),
    ('❌', 'ERROR'),
    ('⏹', 'STOP'),
    ('⏺', ''),
    ('⚠️', '!'),
    ('⚠', '!'),
    ('❓', '?'),
    ('❗', '!'),
    ('👋', ''),
    ('🧠', ''),
    ('📌', ''),
    ('🎮', ''),
    ('⚡', ''),
    ('📝', ''),
    ('🎨', ''),
    ('🐍', ''),
    ('📘', ''),
    ('⚛️', ''),
    ('📋', ''),
    ('🌐', ''),
    ('📱', ''),
    ('⚙️', ''),
    ('🇮🇩', ''),
    ('📁', ''),
    ('💾', ''),
    ('🤖', ''),
    ('🚀', ''),
    ('✨', ''),
    ('🎉', ''),
    ('🗑️', ''),
    ('🗑', ''),
    ('☑️', ''),
    ('♥️', ''),
    ('♡', ''),
    ('➡️', '->'),
    ('⬅️', '<-'),
    ('⬆️', '^'),
    ('⬇️', 'v'),
    ('←', '<-'),
    ('→', '->'),
    ('↑', '^'),
    ('↓', 'v'),
    ('✏️', ''),
    ('🌍', ''),
    ('🇮🇩', ''),
]

# Per-file custom replacements
FILE_SPECIFIC = {
    'src/components/editor/run-panel.tsx': [
        ('Belum ada kode buat dijalanin bro.', 'Belum ada kode untuk dijalankan.'),
        ('Lagi jalanin game (canvas)...', 'Menjalankan game (canvas)...'),
        ('Lagi jalanin kode...', 'Menjalankan kode...'),
        ("'✓ Kelar! (gak ada output)'", "'Selesai (tidak ada output)'"),
        ("'✓ Game lagi jalan! Pakai tombol panah buat main.'", "'Game sedang berjalan. Gunakan tombol panah untuk bermain.'"),
        ("'✓ Kelar bro'", "'Selesai'"),
        ("'✓ Game berhenti'", "'Game berhenti'"),
        ("'⏹ Dihentikan bro'", "'Dihentikan'"),
        ('⚠️ File ini bukan IndoCode (.indo) bro. Bikin file pake ekstensi .indo buat jalanin.',
         'File ini bukan IndoCode (.indo). Buat file dengan ekstensi .indo untuk menjalankan.'),
        ("buat run kode IndoCode", "untuk menjalankan kode IndoCode"),
        ('"Jalanin" buat run', '"Jalanin" untuk menjalankan'),
    ],
    'src/components/editor/deploy-dialog.tsx': [
        ('🚀 Berhasil di-deploy bro!', 'Berhasil di-deploy!'),
        ('Gagal deploy bro 😅', 'Gagal deploy'),
        ('Link udah ke-copy bro 📋', 'Link tersalin ke clipboard'),
        ('Gagal copy link 😅', 'Gagal menyalin link'),
        ('Hapus project yang udah di-deploy? Link-nya gak bakal bisa diakses lagi.',
         'Hapus project yang sudah di-deploy? Link tidak akan dapat diakses lagi.'),
        ('Project ke-hapus 🗑️', 'Project dihapus'),
        ('Gagal hapus bro 😅', 'Gagal menghapus'),
        ('Siap di-deploy 🔥', 'Siap di-deploy'),
        ('Gas Deploy! 🚀', 'Deploy Sekarang'),
        ('Berhasil di-deploy bro! 🎉', 'Berhasil di-deploy!'),
        ('Belum ada project buat di-deploy', 'Belum ada file untuk di-deploy'),
        ('Buka file HTML dulu bro, baru bisa di-deploy dan dapet link shareable.',
         'Buka file HTML terlebih dahulu untuk deploy dan mendapatkan link shareable.'),
        ('Belum ada project yang di-deploy. Gas deploy yang pertama! 🚀',
         'Belum ada project yang di-deploy.'),
    ],
    'src/components/editor/mobile-menu.tsx': [
        ('Chat sama AI gaul', 'Chat dengan AI'),
        ('Buka file dari HP', 'Buka file dari perangkat'),
        ('Simpan file aktif', 'Simpan file aktif'),
        ('ZCode Studio v2.4 · Peak Edition 🔥', 'ZCode Studio v2.4'),
    ],
    'src/components/editor/top-menu-bar.tsx': [
        ('Buka file HTML dulu bro, baru bisa di-deploy 🚀', 'Buka file HTML terlebih dahulu untuk deploy'),
        ('Buka file .indo dulu bro, baru bisa dijalanin ▶️', 'Buka file .indo terlebih dahulu untuk menjalankan'),
        ('ZCode Studio v2.4 · Peak Edition 🔥', 'ZCode Studio v2.4'),
        ('Belum ada file aktif bro', 'Belum ada file aktif'),
    ],
    'src/hooks/use-file-operations.ts': [
        ('Gagal import', 'Gagal mengimpor'),
        (' 😅', ''),
        ('Gagal ngubungin ke AI bro 😅', 'Gagal menghubungi AI'),
        (' bro', ''),
        ('Imported', 'Diimpor'),
        (' dari device', ' dari perangkat'),
        ('Tersimpan ke device:', 'Tersimpan ke perangkat:'),
        (' ✅', ''),
        ('Downloaded:', 'Diunduh:'),
        (' ⬇️', ''),
        ('di-download', 'diunduh'),
        ('Belum ada file kebuka bro', 'Belum ada file terbuka'),
    ],
    'src/components/editor/ai-assistant.tsx': [
        ('Chat santai, tanya apa aja', 'Chat biasa, tanya apa saja'),
        ('Chat baru dimulai 🚀', 'Chat baru dimulai'),
        ('Chat dihapus 🗑️', 'Chat dihapus'),
    ],
    'src/components/editor/editor-tabs.tsx': [
        ('Tab di-pin 📌', 'Tab di-pin'),
    ],
    'src/components/editor/mobile-editor-toolbar.tsx': [
        ('Tab di-pin 📌', 'Tab di-pin'),
    ],
    'src/components/editor/file-explorer.tsx': [
        ('No files yet bro.', 'Belum ada file.'),
    ],
    'src/components/editor/terminal.tsx': [
        ('🚀', ''),
        ('📄', ''),
        ('📁', ''),
    ],
    'src/components/editor/shortcuts-help.tsx': [
        ('🌍', ''),
        ('✏️', ''),
        ('🤖', ''),
        ('💡 Tips bro:', 'Tips:'),
        (' bro', ''),
        ('Klik kanan file di Explorer buat menu context (Rename, Duplicate, Save, dll)',
         'Klik kanan file di Explorer untuk menu context (Rename, Duplicate, Save, dll)'),
        ('Drag file dari komputer ke editor buat import cepat',
         'Seret file dari komputer ke editor untuk impor cepat'),
        ('Tombol tengah mouse (scroll click) di tab buat close cepat',
         'Tombol tengah mouse (scroll click) di tab untuk menutup cepat'),
        ('Hover tab buat lihat tombol pin (📌) — pinned tab sticky di kiri',
         'Hover tab untuk melihat tombol pin - pinned tab menempel di kiri'),
        ('Buka file gambar (.png/.jpg) buat lihat preview dengan zoom',
         'Buka file gambar (.png/.jpg) untuk melihat preview dengan zoom'),
        ('Buka file .md buat lihat markdown preview split view',
         'Buka file .md untuk melihat markdown preview split view'),
    ],
}

def clean_file(path_str: str) -> int:
    """Clean a single file. Returns number of replacements made."""
    path = Path(path_str)
    if not path.exists():
        return 0

    content = path.read_text(encoding='utf-8')
    original = content
    count = 0

    # Apply file-specific replacements first (more specific)
    if path_str in FILE_SPECIFIC:
        for old, new in FILE_SPECIFIC[path_str]:
            if old in content:
                new_content = content.replace(old, new)
                count += content.count(old)
                content = new_content

    # Apply slang/emoji replacements
    for old, new in SLANG_REPLACEMENTS:
        if old in content:
            count += content.count(old)
            content = content.replace(old, new)

    # Remove any remaining emojis that weren't caught
    new_content = EMOJI_PATTERN.sub('', content)
    if new_content != content:
        count += len(EMOJI_PATTERN.findall(content))
        content = new_content

    if content != original:
        path.write_text(content, encoding='utf-8')
        print(f"  Cleaned: {path_str} ({count} replacements)")
        return count
    return 0

if __name__ == '__main__':
    import os
    os.chdir('/home/z/my-project')
    files_to_clean = list(FILE_SPECIFIC.keys()) + [
        'src/components/editor/ai-assistant.tsx',
        'src/components/editor/bottom-panel.tsx',
        'src/components/editor/source-control-panel.tsx',
        'src/components/editor/live-preview.tsx',
        'src/lib/editor/file-templates.ts',
        'src/lib/editor/indocode.ts',
        'src/store/editor-store.ts',
        'src/app/page.tsx',
        'src/app/api/ai/route.ts',
    ]
    files_to_clean = list(set(files_to_clean))
    total = 0
    for f in files_to_clean:
        total += clean_file(f)
    print(f"\nTotal: {total} replacements across {len(files_to_clean)} files")
