'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Play, X, Terminal, AlertCircle, CheckCircle, Loader2, Lightbulb, LogOut, RotateCcw, Square, Gamepad2 } from 'lucide-react'
import { useEditorStore } from '@/store/editor-store'
import { runIndoCode, getErrorSuggestion, detectCanvasUsage, isIndoHTML, type IndoCodeRunner } from '@/lib/editor/indocode'
import { cn } from '@/lib/utils'

interface OutputLine {
  type: 'output' | 'error' | 'info'
  text: string
  line?: number
  suggestion?: string | null
}

export function RunPanel() {
  const open = useEditorStore(s => s.runPanelOpen)
  const setOpen = useEditorStore(s => s.setRunPanelOpen)
  const activeTabId = useEditorStore(s => s.activeTabId)
  const openTabs = useEditorStore(s => s.openTabs)
  const files = useEditorStore(s => s.files)

  const [output, setOutput] = useState<OutputLine[]>([])
  const [running, setRunning] = useState(false)
  const [hasRun, setHasRun] = useState(false)
  const [isCanvasProgram, setIsCanvasProgram] = useState(false)
  const outputRef = useRef<HTMLDivElement>(null)
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const runnerRef = useRef<IndoCodeRunner | null>(null)
  const pendingRunRef = useRef(false)  // ref-based trigger for actual run after re-render
  const runNonceRef = useRef(0)  // bump to retrigger the run effect
  const completedRef = useRef(false)  // tracks if onComplete was already called (for canvas: 1st=start, 2nd=stop)

  const activeTab = openTabs.find(t => t.id === activeTabId)
  const activeFile = activeTab ? files[activeTab.fileId] : null
  const isIndoCode = activeFile?.language === 'indocode'

  // Auto-scroll output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [output])

  const handleRun = useCallback(() => {
    if (!activeFile?.content) {
      setOutput([{ type: 'error', text: 'Belum ada kode untuk dijalankan.' }])
      return
    }

    // Stop previous runner if any
    if (runnerRef.current) {
      runnerRef.current.stop()
      runnerRef.current = null
    }

    // Detect canvas usage OR HTML-based IndoCode (both need visible sandbox)
    const usesCanvas = detectCanvasUsage(activeFile.content)
    const isHTML = isIndoHTML(activeFile.content)
    const needsCanvas = usesCanvas || isHTML
    setIsCanvasProgram(needsCanvas)
    completedRef.current = false  // reset for new run

    setRunning(true)
    setHasRun(true)
    setOutput([{ type: 'info', text: needsCanvas ? (isHTML ? 'Menjalankan HTML IndoCode...' : 'Menjalankan game (canvas)...') : 'Menjalankan kode...' }])

    // Defer the actual run to next tick — gives React time to render the canvas container
    // (so canvasContainerRef.current is attached when we call runIndoCode)
    pendingRunRef.current = true
    runNonceRef.current += 1
  }, [activeFile])

  // Actually run the code (after canvas container has been rendered).
  // Re-runs whenever `isCanvasProgram` flips (so container is attached) OR runNonce changes.
  useEffect(() => {
    if (!pendingRunRef.current) return
    if (!activeFile?.content) return

    const usesCanvas = detectCanvasUsage(activeFile.content)
    const isHTML = isIndoHTML(activeFile.content)
    const needsVisible = usesCanvas || isHTML
    const container = needsVisible ? canvasContainerRef.current : null

    // If visible sandbox needed but container not yet attached, wait for next render
    if (needsVisible && !container) return

    // Consume the pending run
    pendingRunRef.current = false

    const outputs: OutputLine[] = []
    const runner = runIndoCode(
      activeFile.content,
      (msg) => {
        outputs.push({ type: 'output', text: msg })
        setOutput([...outputs])
      },
      (err) => {
        const suggestion = getErrorSuggestion(err.originalLine, err.message, activeFile.content)
        outputs.push({
          type: 'error',
          text: `ERROR Baris ${err.originalLine}: ${err.message}`,
          line: err.originalLine,
          suggestion,
        })
        setOutput([...outputs])
      },
      () => {
        // onComplete callback — called either when:
        // 1. Non-canvas program finished (indocode-complete)
        // 2. Canvas game just started (indocode-complete, 300ms after start) — first call
        // 3. Canvas game was stopped via berhentiProgram() (indocode-stopped) — second call

        if (needsVisible && !completedRef.current) {
          // First call for canvas/HTML: game/app just started successfully
          completedRef.current = true
          // running stays true — game loop is still active
          if (outputs.length === 0 || (outputs.length === 1 && outputs[0].type === 'info')) {
            outputs[0] = { type: 'info', text: isHTML ? 'Aplikasi sedang berjalan.' : 'Game sedang berjalan. Gunakan tombol panah untuk bermain.' }
            setOutput([...outputs])
          }
          return
        }

        // Either non-canvas complete, OR canvas second call (program was stopped)
        setRunning(false)
        if (!needsVisible) {
          if (outputs.length === 0 || (outputs.length === 1 && outputs[0].type === 'info')) {
            setOutput([{ type: 'info', text: 'Selesai (tidak ada output)' }])
          } else if (outputs.length > 0 && outputs[0].type === 'info') {
            outputs.shift()
            setOutput([...outputs, { type: 'info', text: 'Selesai' }])
          } else {
            setOutput([...outputs, { type: 'info', text: 'Selesai' }])
          }
        } else {
          // Canvas/HTML second call — program was stopped via berhentiProgram()
          // The "STOP Program dihentikan" output was already added via onOutput
          setOutput([...outputs, { type: 'info', text: isHTML ? 'Aplikasi berhenti' : 'Game berhenti' }])
        }
      },
      undefined,
      container
    )

    runnerRef.current = runner
  }, [pendingRunRef, isCanvasProgram, activeFile, runNonceRef])

  const handleStop = useCallback(() => {
    if (runnerRef.current) {
      runnerRef.current.stop()
      runnerRef.current = null
    }
    setRunning(false)
    setOutput(prev => [...prev, { type: 'info', text: 'Dihentikan' }])
  }, [])

  const handleExit = useCallback(() => {
    // Stop any running program before closing
    if (runnerRef.current) {
      runnerRef.current.stop()
      runnerRef.current = null
    }
    setOpen(false)
  }, [setOpen])

  // Auto-run when panel opens if not yet run
  useEffect(() => {
    if (open && !hasRun && isIndoCode && activeFile?.content) {
      const timer = setTimeout(() => handleRun(), 200)
      return () => clearTimeout(timer)
    }
  }, [open, hasRun, isIndoCode, activeFile, handleRun])

  // Reset when panel closes
  useEffect(() => {
    if (!open) {
      // Stop runner
      if (runnerRef.current) {
        runnerRef.current.stop()
        runnerRef.current = null
      }
      const timer = setTimeout(() => {
        setOutput([])
        setHasRun(false)
        setRunning(false)
        setIsCanvasProgram(false)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [open])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (runnerRef.current) {
        runnerRef.current.stop()
        runnerRef.current = null
      }
    }
  }, [])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--terminal-bg)]">
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-[var(--editor-border)] bg-[var(--title-bar-bg)] px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--list-hover)]">
            {isCanvasProgram ? <Gamepad2 className="h-4 w-4" /> : <Terminal className="h-4 w-4" />}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-[var(--terminal-fg)]">
              {isCanvasProgram ? 'IndoCode Game Runner' : 'IndoCode Runner'}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {activeFile ? activeFile.name : 'No file'}
              {isCanvasProgram && ' · Klik area game untuk fokus keyboard'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Run / Stop button */}
          {running ? (
            <button
              onClick={handleStop}
              className="flex items-center gap-2 rounded-lg bg-[#dc2626] px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-[#b91c1c] active:scale-95"
              title="Stop"
            >
              <Square className="h-4 w-4 fill-current" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              onClick={handleRun}
              disabled={!isIndoCode}
              className={cn(
                'flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all active:scale-95',
                isIndoCode
                  ? 'bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90'
                  : 'bg-[var(--input-bg)] text-muted-foreground cursor-not-allowed'
              )}
            >
              <Play className="h-4 w-4" />
              <span>Jalanin</span>
            </button>
          )}

          {hasRun && !running && (
            <button
              onClick={handleRun}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--input-bg)] px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-[var(--list-hover)] hover:text-foreground active:scale-95"
              title="Run again"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Ulang</span>
            </button>
          )}
          <button
            onClick={() => setOutput([])}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--input-bg)] px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-[var(--list-hover)] hover:text-foreground active:scale-95"
            title="Clear output"
          >
            <X className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Bersihkan</span>
          </button>
          <button
            onClick={handleExit}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--input-bg)] px-4 py-2 text-xs font-semibold text-foreground transition-all hover:bg-[var(--list-hover)] active:scale-95"
            title="Exit (Esc)"
          >
            <LogOut className="h-4 w-4" />
            <span>Keluar</span>
          </button>
        </div>
      </div>

      {/* Warning if not IndoCode */}
      {!isIndoCode && (
        <div className="border-b border-[var(--editor-border)] bg-[var(--list-hover)] px-4 py-3 text-xs text-muted-foreground">
          File ini bukan IndoCode (.indo). Buat file dengan ekstensi .indo untuk menjalankan.
        </div>
      )}

      {/* Main content: Canvas (top) + Output (bottom) for canvas programs, OR just Output */}
      {isCanvasProgram ? (
        <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
          {/* Canvas Area (top on mobile, left on desktop) */}
          <div className="flex flex-col md:w-1/2 border-b md:border-b-0 md:border-r border-[var(--editor-border)]">
            <div className="flex h-8 items-center gap-2 border-b border-[var(--editor-border)] bg-[var(--title-bar-bg)] px-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Gamepad2 className="h-3 w-3" />
              <span>Game Preview</span>
              {running && <Loader2 className="ml-auto h-3 w-3 animate-spin text-foreground" />}
            </div>
            <div
              ref={canvasContainerRef}
              className="flex-1 overflow-hidden bg-[#1a1a1a]"
              style={{ minHeight: '300px', touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
            />
          </div>

          {/* Output Area (bottom on mobile, right on desktop) */}
          <div className="flex flex-col md:w-1/2">
            <div className="flex h-8 items-center gap-2 border-b border-[var(--editor-border)] bg-[var(--title-bar-bg)] px-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Terminal className="h-3 w-3" />
              <span>Console Output</span>
            </div>
            <div
              ref={outputRef}
              className="flex-1 overflow-y-auto p-4 font-mono text-[13px] leading-relaxed"
            >
              {output.length === 0 ? (
                <div className="flex h-full items-center justify-center text-center text-muted-foreground">
                  <p className="text-xs">Output bakal muncul di sini...</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {output.map((line, i) => (
                    <OutputLineView key={i} line={line} onJumpToLine={(lineNum) => {
                      const editors = (window as any).monaco?.editor?.getEditors?.() || []
                      if (editors.length > 0) {
                        const ed = editors[0]
                        ed.revealLineInCenter(lineNum)
                        ed.setPosition({ lineNumber: lineNum, column: 1 })
                        ed.focus()
                        handleExit()
                      }
                    }} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Just Output for non-canvas programs */
        <div
          ref={outputRef}
          className="flex-1 overflow-y-auto p-4 sm:p-6 font-mono text-[13px] sm:text-[14px] leading-relaxed"
        >
          {output.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center">
              <div>
                <Play className="mx-auto mb-3 h-12 w-12 opacity-30" />
                <p className="text-sm text-muted-foreground mb-1">
                  Klik <span className="font-semibold text-foreground">"Jalanin"</span> untuk menjalankan kode IndoCode
                </p>
                <p className="text-xs text-muted-foreground/70">
                  Tombol <kbd className="rounded bg-[var(--input-bg)] px-1.5 py-0.5 text-[10px]">Esc</kbd> atau <span className="font-semibold">Keluar</span> buat tutup
                </p>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-4xl space-y-1.5">
              {output.map((line, i) => (
                <OutputLineView key={i} line={line} onJumpToLine={(lineNum) => {
                  const editors = (window as any).monaco?.editor?.getEditors?.() || []
                  if (editors.length > 0) {
                    const ed = editors[0]
                    ed.revealLineInCenter(lineNum)
                    ed.setPosition({ lineNumber: lineNum, column: 1 })
                    ed.focus()
                    handleExit()
                  }
                }} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer hint */}
      <div className="flex items-center justify-between border-t border-[var(--editor-border)] bg-[var(--title-bar-bg)] px-4 py-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          {isCanvasProgram ? <Gamepad2 className="h-3 w-3" /> : <Terminal className="h-3 w-3" />}
          {isCanvasProgram ? 'Game Mode — Klik area game buat fokus keyboard' : 'Full Screen Mode'}
        </span>
        <span>
          Tekan <kbd className="rounded bg-[var(--input-bg)] px-1.5 py-0.5">Esc</kbd> buat keluar
        </span>
      </div>
    </div>
  )
}

interface OutputLineViewProps {
  line: OutputLine
  onJumpToLine: (line: number) => void
}

function OutputLineView({ line, onJumpToLine }: OutputLineViewProps) {
  if (line.type === 'output') {
    return (
      <div className="text-[var(--terminal-fg)]">
        <span className="text-muted-foreground select-none">› </span>
        {line.text}
      </div>
    )
  }
  if (line.type === 'error') {
    return (
      <div className="rounded-lg bg-[var(--list-hover)] px-3 py-2.5">
        <div className="flex items-start gap-2 text-foreground">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">
            <div className="font-medium">{line.text}</div>
            {line.suggestion && (
              <div className="mt-1.5 flex items-start gap-1.5 text-muted-foreground">
                <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="text-xs">{line.suggestion}</span>
              </div>
            )}
          </div>
          {line.line && (
            <button
              onClick={() => onJumpToLine(line.line!)}
              className="shrink-0 rounded bg-[var(--input-bg)] px-2 py-0.5 text-[10px] font-medium text-foreground hover:bg-[var(--list-hover)] active:scale-95"
            >
              Ke Baris {line.line}
            </button>
          )}
        </div>
      </div>
    )
  }
  // info
  return (
    <div className="flex items-center gap-1.5 text-muted-foreground py-1">
      {line.text.includes('-') ? (
        <CheckCircle className="h-4 w-4 text-foreground" />
      ) : line.text.includes('STOP') ? (
        <Square className="h-3.5 w-3.5 fill-current" />
      ) : (
        <Loader2 className="h-4 w-4 animate-spin" />
      )}
      <span className="font-medium">{line.text}</span>
    </div>
  )
}
