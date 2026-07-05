'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bot, X, AlertCircle, CheckCircle, Lightbulb, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import { useEditorStore } from '@/store/editor-store'
import { cn } from '@/lib/utils'
import { transpileIndoCode } from '@/lib/editor/indocode'

interface AnalysisItem { type: 'error' | 'warning' | 'tip' | 'ok'; line: number; message: string; suggestion?: string }

export function AiCodeHelper() {
  const open = useEditorStore(s => s.aiHelperOpen)
  const setOpen = useEditorStore(s => s.setAiHelperOpen)
  const activeTabId = useEditorStore(s => s.activeTabId)
  const openTabs = useEditorStore(s => s.openTabs)
  const files = useEditorStore(s => s.files)
  const [analysis, setAnalysis] = useState<AnalysisItem[]>([])
  const [expanded, setExpanded] = useState(true)

  const activeTab = openTabs.find(t => t.id === activeTabId)
  const activeFile = activeTab ? files[activeTab.fileId] : null

  const analyze = useCallback((code: string, language: string): AnalysisItem[] => {
    if (!code?.trim()) return [{ type: 'tip', line: 0, message: 'File kosong. Mulai mengetik kode.' }]
    const items: AnalysisItem[] = []
    const lines = code.split('\n')

    if (language === 'indocode') {
      try {
        const result = transpileIndoCode(code)
        if (!result.success && result.errors.length > 0) {
          for (const err of result.errors) {
            items.push({ type: 'error', line: err.originalLine || err.line, message: 'SALAH: ' + err.message, suggestion: getSuggestion(err.message) })
          }
        }
      } catch (e) {
        // Transpile errors are surfaced via result.errors above; ignore parse failures
        console.warn('[AiCodeHelper] transpile threw', e)
      }
      lines.forEach((line, idx) => {
        const t = line.trim()
        if (t.startsWith('//') || t.startsWith('/*') || t.startsWith('*')) return
        const withoutStrings = t.replace(/["'`].*?["'`]/g, '')
        const jsMap: Record<string, string> = { '\\blet\\b': 'variabel', '\\bconst\\b': 'konstanta', '\\bfunction\\b': 'fungsi', '\\bif\\b': 'jika', '\\belse\\b': 'kalau_tidak', '\\bfor\\b': 'untuk', '\\bwhile\\b': 'selama', '\\breturn\\b': 'kembalikan', '\\btrue\\b': 'benar', '\\bfalse\\b': 'salah', '\\bnull\\b': 'kosong', '\\bbreak\\b': 'putus', '\\bconsole\\.log\\b': 'tampilkan' }
        for (const [js, indo] of Object.entries(jsMap)) {
          if (new RegExp(js, 'g').test(withoutStrings)) {
            items.push({ type: 'error', line: idx + 1, message: 'SALAH: Pakai "' + js.replace(/\\b/g, '') + '" di IndoCode. Ganti "' + indo + '"', suggestion: 'Ganti: ' + indo })
          }
        }
      })
    }

    const ob = (code.match(/{/g) || []).length, cb = (code.match(/}/g) || []).length
    if (ob !== cb) items.push({ type: 'error', line: lines.length, message: 'SALAH: Kurung { } tidak seimbang: ' + ob + ' vs ' + cb, suggestion: ob > cb ? 'Tambah ' + (ob - cb) + ' }' : 'Hapus ' + (cb - ob) + ' }' })
    const op = (code.match(/\(/g) || []).length, cp = (code.match(/\)/g) || []).length
    if (op !== cp) items.push({ type: 'error', line: lines.length, message: 'SALAH: Kurung ( ) tidak seimbang: ' + op + ' vs ' + cp, suggestion: 'Cek kurung tutup' })

    if (items.filter(i => i.type === 'error').length === 0) {
      const cl = lines.filter(l => { const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('/*') })
      if (cl.length > 2) items.unshift({ type: 'ok', line: 0, message: 'BENER: Kode terlihat baik. Kerja bagus!' })
    }
    return items
  }, [])

  // We intentionally depend on `activeFile?.id`, `?.content`, and `?.language`
  // rather than the whole `activeFile` object — same reason as in page.tsx.
  useEffect(() => {
    if (!open || !activeFile) return
    const items = analyze(activeFile.content || '', activeFile.language || 'plaintext')
    queueMicrotask(() => setAnalysis(items))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFile?.id, activeFile?.content, activeFile?.language, open, analyze])

  const reAnalyze = () => {
    if (!activeFile) return
    const items = analyze(activeFile.content || '', activeFile.language || 'plaintext')
    queueMicrotask(() => setAnalysis(items))
  }

  if (!open) return null
  const errors = analysis.filter(a => a.type === 'error')
  const oks = analysis.filter(a => a.type === 'ok')

  return (
    <div className="fixed bottom-16 right-2 z-40 w-[calc(100vw-1rem)] max-w-sm md:bottom-2 md:right-2 md:w-96">
      <div className="flex flex-col rounded-xl border border-[var(--editor-border)] bg-[var(--side-bar-bg)] shadow-2xl max-h-[60vh]">
        <div className="flex h-10 items-center justify-between border-b border-[var(--editor-border)] px-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/20"><Bot className="h-3.5 w-3.5 text-blue-400" /></div>
            <span className="text-xs font-semibold">AI Code Helper</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={reAnalyze} className="rounded p-1 text-muted-foreground hover:bg-[var(--list-hover)]"><RefreshCw className="h-3.5 w-3.5" /></button>
            <button onClick={() => setExpanded(!expanded)} className="rounded p-1 text-muted-foreground hover:bg-[var(--list-hover)]">{expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}</button>
            <button onClick={() => setOpen(false)} className="rounded p-1 text-muted-foreground hover:bg-[var(--list-hover)]"><X className="h-3.5 w-3.5" /></button>
          </div>
        </div>
        <div className="flex items-center gap-3 border-b border-[var(--editor-border)] px-3 py-1.5 text-[10px]">
          {errors.length > 0 ? <span className="flex items-center gap-1 text-red-400 font-medium"><AlertCircle className="h-3 w-3" /> {errors.length} Salah</span>
          : oks.length > 0 ? <span className="flex items-center gap-1 text-green-400 font-medium"><CheckCircle className="h-3 w-3" /> Bener</span> : null}
          {activeFile && <span className="ml-auto truncate text-muted-foreground max-w-[100px]">{activeFile.name}</span>}
        </div>
        {expanded && (
          <div className="max-h-[300px] overflow-y-auto p-2">
            <div className="space-y-1.5">
              {analysis.map((item, idx) => {
                const Icon = item.type === 'error' ? AlertCircle : item.type === 'tip' ? Lightbulb : CheckCircle
                const color = item.type === 'error' ? 'text-red-400' : item.type === 'tip' ? 'text-blue-400' : 'text-green-400'
                const bg = item.type === 'error' ? 'bg-red-500/10' : item.type === 'tip' ? 'bg-blue-500/10' : 'bg-green-500/10'
                return (
                  <div key={idx} className={cn('rounded-lg p-2.5 text-xs', bg)}>
                    <div className="flex items-start gap-2">
                      <Icon className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', color)} />
                      <div className="flex-1 min-w-0">
                        {item.line > 0 && <span className="mb-0.5 inline-block rounded bg-[var(--input-bg)] px-1.5 py-0.5 text-[9px] font-medium">Baris {item.line}</span>}
                        <p className="text-foreground">{item.message}</p>
                        {item.suggestion && <p className="mt-1 text-muted-foreground italic">{'-> '}{item.suggestion}</p>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
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
