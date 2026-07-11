'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ShieldCheck, X, Loader2, AlertCircle, CheckCircle, Lightbulb, FileCode2, ChevronDown, ChevronUp, Upload, FolderOpen, FileSearch } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useEditorStore } from '@/store/editor-store'
import { cn } from '@/lib/utils'
import { transpileIndoCode } from '@/lib/editor/indocode'
import { toast } from 'sonner'

interface BugItem {
  fileName: string
  line: number
  type: 'error' | 'warning' | 'tip'
  message: string
  suggestion?: string
}

interface FileScanResult {
  fileName: string
  language: string
  bugs: BugItem[]
  clean: boolean
}

type ScanMode = 'all' | 'active' | 'select' | 'upload'

export function BugScanDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const files = useEditorStore(s => s.files)
  const openTab = useEditorStore(s => s.openTab)
  const activeTabId = useEditorStore(s => s.activeTabId)
  const openTabs = useEditorStore(s => s.openTabs)
  const [scanning, setScanning] = useState(false)
  const [results, setResults] = useState<FileScanResult[]>([])
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set())
  const [mode, setMode] = useState<ScanMode>('all')
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set())
  const [uploadedFile, setUploadedFile] = useState<{ name: string; content: string; language: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const activeTab = openTabs.find(t => t.id === activeTabId)
  const activeFile = activeTab ? files[activeTab.fileId] : null

  const getLanguage = (name: string): string => {
    const ext = name.split('.').pop()?.toLowerCase() || ''
    const map: Record<string, string> = {
      js: 'javascript', ts: 'typescript', jsx: 'javascript', tsx: 'typescript',
      py: 'python', html: 'html', css: 'css', json: 'json', md: 'markdown',
      indo: 'indocode', java: 'java', c: 'c', cpp: 'cpp', go: 'go', rs: 'rust',
      php: 'php', rb: 'ruby', sh: 'shell', yml: 'yaml', yaml: 'yaml', xml: 'xml',
    }
    return map[ext] || 'plaintext'
  }

  /**
   * Strip string literals and comments from source code, replacing them with
   * placeholders that don't contain quote/bracket characters. This is what
   * lets us count brackets and check for "unclosed strings" without being
   * fooled by:
   *   - URLs containing `//` (which the old code mistook for a comment start)
   *   - Braces/parens appearing inside string literals (e.g. `"{ nama }"`)
   *   - Quote characters inside comments
   *
   * For each line of the original source, we return the "code-only" version
   * (strings replaced with empty quotes, comments removed entirely). This
   * preserves line numbers so we can report errors at the right line.
   */
  const stripStringsAndComments = (src: string): { codeByLine: string[] } => {
    const lines = src.split('\n')
    const out: string[] = []
    let inBlockComment = false
    for (const line of lines) {
      let result = ''
      let i = 0
      while (i < line.length) {
        const c = line[i]
        const n = line[i + 1]
        if (inBlockComment) {
          if (c === '*' && n === '/') { inBlockComment = false; i += 2; continue }
          i++
          continue
        }
        // Line comment
        if (c === '/' && n === '/') { break /* rest of line is comment */ }
        // Block comment start
        if (c === '/' && n === '*') { inBlockComment = true; i += 2; continue }
        // String literal "..."
        if (c === '"') {
          result += '""'
          i++
          while (i < line.length && line[i] !== '"') {
            if (line[i] === '\\') i += 2
            else i++
          }
          if (i < line.length) i++ // skip closing "
          continue
        }
        // String literal '...'
        if (c === "'") {
          result += "''"
          i++
          while (i < line.length && line[i] !== "'") {
            if (line[i] === '\\') i += 2
            else i++
          }
          if (i < line.length) i++
          continue
        }
        // Template literal `...` — may span lines, but for line-based scan we
        // just blank it out and let the line-by-line logic not see inside.
        // Multi-line template literals are handled by the transpiler tokenizer,
        // not here. For bracket/quote-counting purposes, we collapse them.
        if (c === '`') {
          result += '``'
          i++
          while (i < line.length && line[i] !== '`') {
            if (line[i] === '\\') { i += 2; continue }
            // Skip ${...} — track nested braces
            if (line[i] === '$' && line[i + 1] === '{') {
              let depth = 1
              i += 2
              while (i < line.length && depth > 0) {
                if (line[i] === '{') depth++
                else if (line[i] === '}') depth--
                i++
              }
              continue
            }
            i++
          }
          if (i < line.length) i++
          continue
        }
        result += c
        i++
      }
      out.push(result)
    }
    return { codeByLine: out }
  }

  /**
   * Check each line for unclosed string literals, IGNORING:
   *   - strings that contain `//` (URLs like "https://..." were previously
   *     mistaken for comment-start, producing false "unclosed string" warnings)
   *   - quote characters inside comments
   *
   * Strategy: tokenize each line; if we end the line in a "inside string"
   * state (and it's not a template literal, which can span lines), that's
   * a genuine unclosed string.
   */
  const findUnclosedStrings = (src: string): { line: number; quote: '"' | "'" }[] => {
    const out: { line: number; quote: '"' | "'" }[] = []
    const lines = src.split('\n')
    let inBlockComment = false
    lines.forEach((line, idx) => {
      let i = 0
      while (i < line.length) {
        const c = line[i]
        const n = line[i + 1]
        if (inBlockComment) {
          if (c === '*' && n === '/') { inBlockComment = false; i += 2; continue }
          i++
          continue
        }
        if (c === '/' && n === '/') { break /* line comment, rest is comment */ }
        if (c === '/' && n === '*') { inBlockComment = true; i += 2; continue }
        if (c === '"') {
          i++
          let closed = false
          while (i < line.length) {
            if (line[i] === '\\') { i += 2; continue }
            if (line[i] === '"') { closed = true; i++; break }
            i++
          }
          if (!closed) {
            out.push({ line: idx + 1, quote: '"' })
            return // don't report multiple per line
          }
          continue
        }
        if (c === "'") {
          i++
          let closed = false
          while (i < line.length) {
            if (line[i] === '\\') { i += 2; continue }
            if (line[i] === "'") { closed = true; i++; break }
            i++
          }
          if (!closed) {
            out.push({ line: idx + 1, quote: "'" })
            return
          }
          continue
        }
        if (c === '`') {
          // Template literal — may span lines, so just skip to closing backtick
          // on the SAME line; if it doesn't close, that's fine (multi-line).
          i++
          while (i < line.length) {
            if (line[i] === '\\') { i += 2; continue }
            if (line[i] === '$' && line[i + 1] === '{') {
              let depth = 1; i += 2
              while (i < line.length && depth > 0) {
                if (line[i] === '{') depth++
                else if (line[i] === '}') depth--
                i++
              }
              continue
            }
            if (line[i] === '`') { i++; break }
            i++
          }
          continue
        }
        i++
      }
    })
    return out
  }

  const scanCode = (content: string, language: string, fileName: string): BugItem[] => {
    const bugs: BugItem[] = []
    const lines = content.split('\n')
    const { codeByLine } = stripStringsAndComments(content)
    const codeOnly = codeByLine.join('\n')

    // 1. IndoCode transpile check
    if (language === 'indocode') {
      try {
        const result = transpileIndoCode(content)
        if (!result.success && result.errors.length > 0) {
          for (const err of result.errors) {
            bugs.push({ fileName, line: err.originalLine || err.line, type: 'error', message: err.message, suggestion: getSuggestion(err.message) })
          }
        }
      } catch (e) {
        // Transpile errors are surfaced via result.errors above; ignore parse failures here
        console.warn('[BugScan] transpileIndoCode threw for', fileName, e)
      }

      // 2. JS keywords in IndoCode — use code-only (strings/comments stripped)
      codeByLine.forEach((strippedLine, idx) => {
        const t = strippedLine.trim()
        if (!t) return
        const jsMap: Record<string, string> = { '\\blet\\b': 'variabel', '\\bconst\\b': 'konstanta', '\\bfunction\\b': 'fungsi', '\\bif\\b': 'jika', '\\belse\\b': 'kalau_tidak', '\\bfor\\b': 'untuk', '\\bwhile\\b': 'selama', '\\breturn\\b': 'kembalikan', '\\btrue\\b': 'benar', '\\bfalse\\b': 'salah', '\\bnull\\b': 'kosong', '\\bbreak\\b': 'putus', '\\bconsole\\.log\\b': 'tampilkan' }
        for (const [js, indo] of Object.entries(jsMap)) {
          if (new RegExp(js, 'g').test(strippedLine)) {
            bugs.push({ fileName, line: idx + 1, type: 'error', message: 'Pakai "' + js.replace(/\\b/g, '') + '" di IndoCode. Ganti "' + indo + '"', suggestion: 'Ganti: ' + indo })
          }
        }
      })
    }

    // 3. Bracket balance — count only brackets in code (NOT in strings/comments)
    // We've already stripped strings/comments into `codeOnly`. Each string was
    // replaced with `""` or `''` or `\`\`` so any braces/parens that were
    // inside string contents are gone.
    const ob = (codeOnly.match(/{/g) || []).length, cb = (codeOnly.match(/}/g) || []).length
    if (ob !== cb) bugs.push({ fileName, line: lines.length, type: 'error', message: 'Kurung { } tidak seimbang: ' + ob + ' vs ' + cb, suggestion: ob > cb ? 'Tambah ' + (ob - cb) + ' }' : 'Hapus ' + (cb - ob) + ' }' })
    const op = (codeOnly.match(/\(/g) || []).length, cp = (codeOnly.match(/\)/g) || []).length
    if (op !== cp) bugs.push({ fileName, line: lines.length, type: 'error', message: 'Kurung ( ) tidak seimbang: ' + op + ' vs ' + cp, suggestion: 'Cek kurung tutup' })
    const obr = (codeOnly.match(/\[/g) || []).length, cbr = (codeOnly.match(/\]/g) || []).length
    if (obr !== cbr) bugs.push({ fileName, line: lines.length, type: 'error', message: 'Kurung [ ] tidak seimbang: ' + obr + ' vs ' + cbr, suggestion: 'Cek kurung tutup' })

    // 4. Unclosed strings — use proper tokenizer instead of `line.split('//')[0]`
    //    (which broke on URLs like "https://..." — the `//` was mistaken for
    //    comment-start, leaving the rest of the line unbalanced in quote count)
    const unclosed = findUnclosedStrings(content)
    for (const u of unclosed) {
      bugs.push({
        fileName,
        line: u.line,
        type: 'error',
        message: u.quote === '"' ? 'Tanda kutip " tidak tertutup' : "Tanda kutip ' tidak tertutup",
        suggestion: 'Tambahkan ' + u.quote + ' di akhir string',
      })
    }

    // 5. HTML check
    if (language === 'html' || language === 'indocode') {
      const openTags = (content.match(/<(\w+)[^>]*[^/]>/g) || []).length
      const closeTags = (content.match(/<\/\w+>/g) || []).length
      const selfClosing = (content.match(/<\w+[^>]*\/>/g) || []).length
      if (openTags - selfClosing > closeTags + 5) bugs.push({ fileName, line: 0, type: 'warning', message: 'Tag buka (' + (openTags - selfClosing) + ') lebih banyak dari tutup (' + closeTags + ')', suggestion: 'Cek tag yang tidak ditutup' })
      if (!content.match(/<!DOCTYPE/i) && content.includes('<html')) bugs.push({ fileName, line: 1, type: 'warning', message: 'Tidak ada <!DOCTYPE html>', suggestion: 'Tambahkan di baris pertama' })
    }

    // 6. CSS check — same string/comment-stripping treatment
    if (language === 'css') {
      const ob2 = (codeOnly.match(/{/g) || []).length
      const cb2 = (codeOnly.match(/}/g) || []).length
      if (ob2 !== cb2) bugs.push({ fileName, line: lines.length, type: 'error', message: 'Kurung CSS tidak seimbang: ' + ob2 + ' vs ' + cb2, suggestion: 'Cek }' })
    }

    // 7. Code smells — check on stripped code so we don't false-positive on
    //    strings/comments that contain `==`, `var`, `debugger`, etc.
    codeByLine.forEach((strippedLine, idx) => {
      const t = strippedLine.trim()
      if (!t) return
      if (/\b==\b/.test(t) && !/\b===\b/.test(t) && !/\b!==\b/.test(t)) bugs.push({ fileName, line: idx + 1, type: 'warning', message: 'Pakai == sebaiknya ===', suggestion: 'Ganti == dengan ===' })
      if (/^(tangkap|catch)\s*\(/.test(t)) { const nextLine = codeByLine[idx + 1]?.trim() || ''; if (nextLine === '}' || nextLine === '') bugs.push({ fileName, line: idx + 1, type: 'warning', message: 'Block catch kosong', suggestion: 'Tambah: tampilkan(e)' }) }
      if (['javascript', 'typescript'].includes(language) && /\bvar\s+/.test(t)) bugs.push({ fileName, line: idx + 1, type: 'warning', message: 'Pakai var (usang)', suggestion: 'Ganti dengan let/const' })
      if (/\b(debugger|alert)\s*\(?.*\)?/.test(t)) bugs.push({ fileName, line: idx + 1, type: 'warning', message: 'Kode debugging/alert', suggestion: 'Hapus sebelum deploy' })
    })

    // 8. Tips
    if (bugs.filter(b => b.type === 'error').length === 0) {
      if (language === 'indocode' && content.includes('aturInterval') && !content.includes('hentikanInterval')) {
        bugs.push({ fileName, line: 0, type: 'tip', message: 'Pakai aturInterval tanpa hentikanInterval', suggestion: 'Tambahkan cara stop' })
      }
    }

    return bugs
  }

  const runScan = useCallback(() => {
    setScanning(true)
    setResults([])
    setTimeout(() => {
      const currentFiles = useEditorStore.getState().files
      let filesToScan: { name: string; content: string; language: string }[] = []

      if (mode === 'all') {
        filesToScan = Object.values(currentFiles)
          .filter(f => f.type === 'file' && f.content)
          .map(f => ({ name: f.name, content: f.content || '', language: f.language || 'plaintext' }))
      } else if (mode === 'active' && activeFile) {
        filesToScan = [{ name: activeFile.name, content: activeFile.content || '', language: activeFile.language || 'plaintext' }]
      } else if (mode === 'select') {
        filesToScan = Array.from(selectedFileIds)
          .map(id => currentFiles[id])
          .filter(f => f && f.type === 'file' && f.content)
          .map(f => ({ name: f.name, content: f.content || '', language: f.language || 'plaintext' }))
      } else if (mode === 'upload' && uploadedFile) {
        filesToScan = [uploadedFile]
      }

      const scanResults: FileScanResult[] = filesToScan.map(f => {
        const bugs = scanCode(f.content, f.language, f.name)
        return { fileName: f.name, language: f.language, bugs, clean: bugs.filter(b => b.type === 'error').length === 0 }
      })

      setResults(scanResults)
      setScanning(false)
      setExpandedFiles(new Set(scanResults.filter(r => !r.clean).map(r => r.fileName)))
    }, 100)
    // `scanCode` is a stable function defined inside this component closure
    // (it doesn't depend on any reactive state itself — only on its args).
    // We intentionally exclude it from deps to avoid re-creating runScan on
    // every render, which would re-trigger the auto-scan useEffect below.
     
  }, [mode, activeFile, selectedFileIds, uploadedFile])

  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => runScan())
      return () => cancelAnimationFrame(id)
    }
  }, [open, runScan])

  const toggleFile = (fileName: string) => {
    setExpandedFiles(prev => { const n = new Set(prev); if (n.has(fileName)) n.delete(fileName); else n.add(fileName); return n })
  }

  const toggleSelectedFile = (fileId: string) => {
    setSelectedFileIds(prev => { const n = new Set(prev); if (n.has(fileId)) n.delete(fileId); else n.add(fileId); return n })
  }

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const content = reader.result as string
      setUploadedFile({ name: file.name, content, language: getLanguage(file.name) })
      toast.success('File dimuat: ' + file.name)
      setMode('upload')
    }
    reader.readAsText(file)
  }

  const totalErrors = results.reduce((s, r) => s + r.bugs.filter(b => b.type === 'error').length, 0)
  const totalWarnings = results.reduce((s, r) => s + r.bugs.filter(b => b.type === 'warning').length, 0)
  const totalTips = results.reduce((s, r) => s + r.bugs.filter(b => b.type === 'tip').length, 0)
  const cleanFiles = results.filter(r => r.clean).length
  const errorFiles = results.filter(r => !r.clean)
  const allProjectFiles = Object.values(files).filter(f => f.type === 'file')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-full max-w-2xl overflow-hidden p-0 sm:rounded-2xl">
        <DialogHeader className="border-b border-[var(--editor-border)] px-5 py-4">
          <DialogTitle className="flex items-center gap-2.5 text-base">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/20">
              <ShieldCheck className="h-4 w-4 text-green-400" />
            </div>
            Scan Bug
            {scanning && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto">
          {/* Mode selector */}
          <div className="border-b border-[var(--editor-border)] p-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <ModeBtn icon={FolderOpen} label="Semua File" active={mode === 'all'} onClick={() => { setMode('all'); setSelectedFileIds(new Set()); setUploadedFile(null) }} />
              <ModeBtn icon={FileCode2} label="File Aktif" active={mode === 'active'} onClick={() => { setMode('active'); setSelectedFileIds(new Set()); setUploadedFile(null) }} disabled={!activeFile} />
              <ModeBtn icon={FileSearch} label="Pilih File" active={mode === 'select'} onClick={() => { setMode('select'); setUploadedFile(null) }} />
              <ModeBtn icon={Upload} label="Dari Storage" active={mode === 'upload'} onClick={() => { fileInputRef.current?.click() }} />
            </div>

            {/* Select file mode: show file list */}
            {mode === 'select' && (
              <div className="mt-3 max-h-32 overflow-y-auto rounded-lg border border-[var(--editor-border)] bg-[var(--input-bg)] p-2">
                {allProjectFiles.map(f => (
                  <label key={f.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs hover:bg-[var(--list-hover)]">
                    <input
                      type="checkbox"
                      checked={selectedFileIds.has(f.id)}
                      onChange={() => toggleSelectedFile(f.id)}
                      className="h-3.5 w-3.5 accent-blue-500"
                    />
                    <FileCode2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate">{f.name}</span>
                    <span className="text-[10px] text-muted-foreground">{f.language}</span>
                  </label>
                ))}
                {allProjectFiles.length === 0 && <p className="py-2 text-center text-xs text-muted-foreground">Tidak ada file</p>}
              </div>
            )}

            {/* Upload mode: show uploaded file info */}
            {mode === 'upload' && (
              <div className="mt-3">
                {uploadedFile ? (
                  <div className="flex items-center gap-2 rounded-lg border border-[var(--editor-border)] bg-[var(--input-bg)] p-2.5 text-xs">
                    <FileCode2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate font-medium">{uploadedFile.name}</span>
                    <span className="text-[10px] text-muted-foreground">{uploadedFile.language}</span>
                    <button onClick={() => fileInputRef.current?.click()} className="rounded bg-[var(--list-hover)] px-2 py-1 text-[10px] font-medium hover:bg-[var(--list-active)]">Ganti</button>
                  </div>
                ) : (
                  <button onClick={() => fileInputRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--editor-border)] py-4 text-xs text-muted-foreground hover:border-[var(--list-active)] hover:text-foreground">
                    <Upload className="h-4 w-4" /> Pilih file dari perangkat
                  </button>
                )}
              </div>
            )}

            <input ref={fileInputRef} type="file" onChange={handleUpload} className="hidden" accept=".js,.ts,.jsx,.tsx,.py,.html,.css,.json,.md,.indo,.java,.c,.cpp,.go,.rs,.php,.rb,.sh,.yml,.yaml,.xml,.txt" />

            {/* Scan button */}
            <div className="mt-3 flex justify-center">
              <Button onClick={runScan} disabled={scanning || (mode === 'select' && selectedFileIds.size === 0) || (mode === 'upload' && !uploadedFile)} className="gap-2" size="sm">
                {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                {scanning ? 'Memindai...' : 'Scan Sekarang'}
              </Button>
            </div>
          </div>

          {/* Results */}
          {scanning ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="mb-3 h-10 w-10 animate-spin text-green-400" />
              <p className="text-sm text-muted-foreground">Memindai...</p>
            </div>
          ) : results.length > 0 ? (
            <div className="p-4">
              {/* Summary */}
              <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-center">
                  <div className="text-2xl font-bold text-red-400">{totalErrors}</div>
                  <div className="text-[10px] font-medium text-muted-foreground">Error</div>
                </div>
                <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-3 text-center">
                  <div className="text-2xl font-bold text-yellow-400">{totalWarnings}</div>
                  <div className="text-[10px] font-medium text-muted-foreground">Warning</div>
                </div>
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-center">
                  <div className="text-2xl font-bold text-blue-400">{totalTips}</div>
                  <div className="text-[10px] font-medium text-muted-foreground">Saran</div>
                </div>
                <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-3 text-center">
                  <div className="text-2xl font-bold text-green-400">{cleanFiles}</div>
                  <div className="text-[10px] font-medium text-muted-foreground">Bersih</div>
                </div>
              </div>

              {/* Error files */}
              {errorFiles.length > 0 && (
                <div className="mb-3">
                  <h3 className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-red-400">File dengan Error ({errorFiles.length})</h3>
                  <div className="space-y-2">
                    {errorFiles.map(r => (
                      <FileResult key={r.fileName} result={r} expanded={expandedFiles.has(r.fileName)} onToggle={() => toggleFile(r.fileName)} onJump={(lineNum) => {
                        const f = Object.values(files).find(f => f.name === r.fileName && f.type === 'file')
                        if (f) {
                          openTab(f.id, false)
                          onOpenChange(false)
                          // Jump to the actual line in Monaco (after dialog closes & file opens)
                          if (lineNum && lineNum > 0) {
                            setTimeout(() => {
                              const editors = (window as any).monaco?.editor?.getEditors?.() || []
                              if (editors.length > 0) {
                                const ed = editors[0]
                                const model = ed.getModel()
                                const lineCount = model ? model.getLineCount() : 1
                                const target = Math.min(lineNum, lineCount)
                                ed.revealLineInCenter(target)
                                ed.setPosition({ lineNumber: target, column: 1 })
                                ed.focus()
                              }
                            }, 250)
                          }
                        }
                      }} />
                    ))}
                  </div>
                </div>
              )}

              {/* Clean files */}
              {cleanFiles > 0 && (
                <div>
                  <h3 className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-green-400">File Bersih ({cleanFiles})</h3>
                  <div className="space-y-1">
                    {results.filter(r => r.clean).map(r => (
                      <div key={r.fileName} className="flex items-center gap-2 rounded-lg bg-green-500/5 px-3 py-2 text-xs">
                        <CheckCircle className="h-3.5 w-3.5 text-green-400" />
                        <span className="font-medium">{r.fileName}</span>
                        <span className="text-muted-foreground">{r.language}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">Pilih mode scan lalu klik "Scan Sekarang"</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ModeBtn({ icon: Icon, label, active, onClick, disabled }: { icon: any; label: string; active: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex flex-col items-center gap-1 rounded-xl border p-2.5 text-xs font-medium transition-all',
        active ? 'border-green-500/50 bg-green-500/10 text-green-400' : 'border-[var(--editor-border)] bg-[var(--input-bg)] text-muted-foreground hover:border-[var(--list-active)] hover:text-foreground',
        disabled && 'opacity-40 cursor-not-allowed'
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </button>
  )
}

function FileResult({ result, expanded, onToggle, onJump }: { result: FileScanResult; expanded: boolean; onToggle: () => void; onJump: (lineNum?: number) => void }) {
  const ec = result.bugs.filter(b => b.type === 'error').length
  const wc = result.bugs.filter(b => b.type === 'warning').length
  const tc = result.bugs.filter(b => b.type === 'tip').length
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--editor-border)] bg-[var(--side-bar-bg)]">
      <button onClick={onToggle} className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-[var(--list-hover)]">
        <FileCode2 className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="flex-1 truncate text-sm font-medium">{result.fileName}</span>
        {ec > 0 && <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400">{ec}</span>}
        {wc > 0 && <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-[10px] font-bold text-yellow-400">{wc}</span>}
        {tc > 0 && <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-400">{tc}</span>}
        {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
      </button>
      {expanded && (
        <div className="border-t border-[var(--editor-border)] p-2 space-y-1.5">
          {result.bugs.map((bug, idx) => {
            const Icon = bug.type === 'error' ? AlertCircle : bug.type === 'warning' ? AlertCircle : Lightbulb
            const color = bug.type === 'error' ? 'text-red-400' : bug.type === 'warning' ? 'text-yellow-400' : 'text-blue-400'
            const bg = bug.type === 'error' ? 'bg-red-500/10' : bug.type === 'warning' ? 'bg-yellow-500/10' : 'bg-blue-500/10'
            return (
              <div key={idx} className={cn('rounded-lg p-2.5 text-xs', bg)}>
                <div className="flex items-start gap-2">
                  <Icon className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', color)} />
                  <div className="flex-1 min-w-0">
                    {bug.line > 0 && (
                      <button
                        onClick={() => onJump(bug.line)}
                        className="mb-0.5 inline-block rounded bg-[var(--input-bg)] px-1.5 py-0.5 text-[9px] font-medium hover:bg-[var(--list-hover)] active:scale-95 transition-transform"
                        title="Klik untuk lompat ke baris ini"
                      >
                        Baris {bug.line}
                      </button>
                    )}
                    <p className="text-foreground">{bug.message}</p>
                    {bug.suggestion && <p className="mt-1 text-muted-foreground italic">{'-> '}{bug.suggestion}</p>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function getSuggestion(msg: string): string | undefined {
  if (msg.includes('tidak didefinisikan')) return 'Deklarasikan dengan "variabel" atau "konstanta"'
  if (msg.includes('Input tidak lengkap')) return 'Cek kurung yang tidak ditutup'
  if (msg.includes('bukan sebuah fungsi')) return 'Cek ejaan nama fungsi'
  if (msg.includes('tidak seimbang')) return 'Tambahkan kurung tutup'
  if (msg.includes('Token tidak terduga')) return 'Cek tanda baca'
  return undefined
}
