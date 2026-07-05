'use client'

import { useState, useEffect } from 'react'
import {
  GitBranch, Check, X, Bell, Wifi, WifiOff, Zap, AlertCircle, Bot, Code2,
  type LucideIcon,
} from 'lucide-react'
import { useEditorStore } from '@/store/editor-store'
import { cn } from '@/lib/utils'

export function StatusBar({
  cursorPos,
  language,
}: {
  cursorPos: { line: number; column: number }
  language: string
}) {
  const activeTabId = useEditorStore(s => s.activeTabId)
  const openTabs = useEditorStore(s => s.openTabs)
  const files = useEditorStore(s => s.files)
  const settings = useEditorStore(s => s.settings)
  const setSettingsOpen = useEditorStore(s => s.setSettingsOpen)
  const setBottomPanel = useEditorStore(s => s.setBottomPanel)
  const bottomPanel = useEditorStore(s => s.bottomPanel)
  const aiHelperOpen = useEditorStore(s => s.aiHelperOpen)
  const setAiHelperOpen = useEditorStore(s => s.setAiHelperOpen)
  const aiQuickCodeOpen = useEditorStore(s => s.aiQuickCodeOpen)
  const setAiQuickCodeOpen = useEditorStore(s => s.setAiQuickCodeOpen)
  const [selection, setSelection] = useState<{ lines: number; chars: number } | null>(null)
  const [isOnline, setIsOnline] = useState(true)

  const activeTab = openTabs.find(t => t.id === activeTabId)
  const activeFile = activeTab ? files[activeTab.fileId] : null

  // Count total files in project
  const totalFiles = Object.values(files).filter(f => f.type === 'file').length

  // Track real online/offline status (was previously just a static icon)
  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine)
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  // Track Monaco editor selection (was previously always null — now reflects real selection)
  useEffect(() => {
    const update = () => {
      const editors = (window as any).monaco?.editor?.getEditors?.() || []
      if (editors.length === 0) {
        setSelection(null)
        return
      }
      const ed = editors[0]
      const sel = ed.getSelection()
      if (sel && !sel.isEmpty()) {
        const chars = ed.getModel()?.getValueInRange(sel)?.length ?? 0
        const lines = sel.endLineNumber - sel.startLineNumber + 1
        setSelection({ lines, chars })
      } else {
        setSelection(null)
      }
    }
    // Poll every 300ms — cheap & avoids binding to internal Monaco events
    const id = setInterval(update, 300)
    return () => clearInterval(id)
  }, [activeTabId])

  return (
    <div className="flex h-6 items-center justify-between border-t border-[var(--editor-border)] bg-[var(--title-bar-bg)] px-2 text-xs text-muted-foreground">
      {/* Left side */}
      <div className="flex items-center gap-1">
        <button className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-[var(--list-hover)]" title="Branch">
          <GitBranch className="h-3.5 w-3.5" />
          <span>main</span>
        </button>
        <button
          onClick={() => setBottomPanel(bottomPanel === 'problems' ? null : 'problems')}
          className={cn(
            'flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-[var(--list-hover)]',
            bottomPanel === 'problems' && 'bg-[var(--list-hover)]'
          )}
          title="Problems"
        >
          <X className="h-3.5 w-3.5" />
          <span>0</span>
          <AlertCircle className="h-3.5 w-3.5" />
          <span>0</span>
        </button>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1">
        {selection && (
          <span className="px-1.5 py-0.5" title={`${selection.chars} karakter terpilih`}>
            {selection.lines > 1 ? `${selection.lines} baris · ${selection.chars} chars` : `${selection.chars} chars`} terpilih
          </span>
        )}
        {!selection && activeFile && (
          <span className="px-1.5 py-0.5">
            Ln {cursorPos.line}, Col {cursorPos.column}
          </span>
        )}

        {/* Reflect settings.tabSize (was previously hardcoded to "Spaces: 2") */}
        <button
          className="flex items-center gap-1 px-1.5 py-0.5 hover:bg-[var(--list-hover)]"
          title="Indentation"
        >
          <span>Spaces: {settings.tabSize}</span>
        </button>

        <button className="flex items-center gap-1 px-1.5 py-0.5 hover:bg-[var(--list-hover)]" title="Encoding">
          <span>UTF-8</span>
        </button>

        <button className="flex items-center gap-1 px-1.5 py-0.5 hover:bg-[var(--list-hover)]" title="Line Ending">
          <span>LF</span>
        </button>

        {activeFile && (
          <button className="px-1.5 py-0.5 capitalize hover:bg-[var(--list-hover)]" title="Language">
            {language}
          </button>
        )}

        <button
          onClick={() => setSettingsOpen(true)}
          className="flex items-center gap-1 px-1.5 py-0.5 hover:bg-[var(--list-hover)]"
          title="Settings"
        >
          <Zap className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Settings</span>
        </button>

        <button
          onClick={() => setAiHelperOpen(!aiHelperOpen)}
          className={cn('flex items-center gap-1 px-1.5 py-0.5 transition-colors', aiHelperOpen ? 'bg-blue-500/30 text-blue-300' : 'hover:bg-[var(--list-hover)]')}
          title="AI Code Helper"
        >
          <Bot className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Helper</span>
        </button>

        <button
          onClick={() => setAiQuickCodeOpen(!aiQuickCodeOpen)}
          className={cn('flex items-center gap-1 px-1.5 py-0.5 transition-colors', aiQuickCodeOpen ? 'bg-purple-500/30 text-purple-300' : 'hover:bg-[var(--list-hover)]')}
          title="AI Quick Code"
        >
          <Code2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Quick</span>
        </button>

        <button className="flex items-center gap-1 px-1.5 py-0.5 hover:bg-[var(--list-hover)]" title="File count">
          <span className="hidden md:inline">{totalFiles} files</span>
        </button>

        {/* Real online/offline status (was previously just a static Wifi icon) */}
        <button
          className={cn('flex items-center gap-1 px-1.5 py-0.5', isOnline ? 'text-foreground' : 'text-red-400')}
          title={isOnline ? 'Online' : 'Offline — AI & deploy tidak akan jalan'}
        >
          {isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
        </button>

        <button className="flex items-center gap-1 px-1.5 py-0.5 hover:bg-[var(--list-hover)]" title="Notifications">
          <Bell className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
