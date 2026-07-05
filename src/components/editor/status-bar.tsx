'use client'

import { useState, useEffect } from 'react'
import {
  GitBranch, Check, X, Bell, Wifi, Zap, AlertCircle, Bot, Code2,
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
  const setSettingsOpen = useEditorStore(s => s.setSettingsOpen)
  const setBottomPanel = useEditorStore(s => s.setBottomPanel)
  const bottomPanel = useEditorStore(s => s.bottomPanel)
  const aiHelperOpen = useEditorStore(s => s.aiHelperOpen)
  const setAiHelperOpen = useEditorStore(s => s.setAiHelperOpen)
  const aiQuickCodeOpen = useEditorStore(s => s.aiQuickCodeOpen)
  const setAiQuickCodeOpen = useEditorStore(s => s.setAiQuickCodeOpen)
  const [selection, setSelection] = useState<{ lines: number; chars: number } | null>(null)
  const [errors, setErrors] = useState<{ errors: number; warnings: number }>({ errors: 0, warnings: 0 })

  const activeTab = openTabs.find(t => t.id === activeTabId)
  const activeFile = activeTab ? files[activeTab.fileId] : null

  // Count total files in project
  const totalFiles = Object.values(files).filter(f => f.type === 'file').length

  return (
    <div className="flex h-6 items-center justify-between border-t border-[var(--editor-border)] bg-[var(--title-bar-bg)] px-2 text-xs text-muted-foreground">
      {/* Left side */}
      <div className="flex items-center gap-1">
        <button className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-[var(--list-hover)]">
          <GitBranch className="h-3.5 w-3.5" />
          <span>main</span>
        </button>
        <button
          onClick={() => setBottomPanel(bottomPanel === 'problems' ? null : 'problems')}
          className={cn(
            'flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-[var(--list-hover)]',
            bottomPanel === 'problems' && 'bg-[var(--list-hover)]'
          )}
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
          <span className="px-1.5 py-0.5">
            Ln {cursorPos.line}, Col {cursorPos.column} ({selection.lines} selected)
          </span>
        )}
        {!selection && activeFile && (
          <span className="px-1.5 py-0.5">
            Ln {cursorPos.line}, Col {cursorPos.column}
          </span>
        )}

        <button className="flex items-center gap-1 px-1.5 py-0.5 hover:bg-[var(--list-hover)]">
          <span>Spaces: 2</span>
        </button>

        <button className="flex items-center gap-1 px-1.5 py-0.5 hover:bg-[var(--list-hover)]">
          <span>UTF-8</span>
        </button>

        <button className="flex items-center gap-1 px-1.5 py-0.5 hover:bg-[var(--list-hover)]">
          <span>LF</span>
        </button>

        {activeFile && (
          <button className="px-1.5 py-0.5 capitalize hover:bg-[var(--list-hover)]">
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

        <button className="flex items-center gap-1 px-1.5 py-0.5 hover:bg-[var(--list-hover)]">
          <span className="hidden md:inline">{totalFiles} files</span>
        </button>

        <button className="flex items-center gap-1 px-1.5 py-0.5 hover:bg-[var(--list-hover)]">
          <Wifi className="h-3.5 w-3.5" />
        </button>

        <button className="flex items-center gap-1 px-1.5 py-0.5 hover:bg-[var(--list-hover)]">
          <Bell className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
