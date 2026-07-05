'use client'

import { useState } from 'react'
import { X, Terminal as TerminalIcon, AlertCircle, MessageSquare, ChevronUp, Trash2 } from 'lucide-react'
import { useEditorStore } from '@/store/editor-store'
import { Terminal } from '@/components/editor/terminal'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

type PanelType = 'terminal' | 'problems' | 'output'

export function BottomPanel() {
  const [activePanel, setActivePanel] = useState<PanelType>('terminal')
  const setTerminalOpen = useEditorStore(s => s.setTerminalOpen)
  const files = useEditorStore(s => s.files)

  const tabs: { id: PanelType; label: string; icon: typeof TerminalIcon; badge?: number }[] = [
    { id: 'problems', label: 'Problems', icon: AlertCircle, badge: 0 },
    { id: 'output', label: 'Output', icon: MessageSquare },
    { id: 'terminal', label: 'Terminal', icon: TerminalIcon },
  ]

  return (
    <div className="flex h-full flex-col bg-[var(--editor-bg)]">
      {/* Tabs */}
      <div className="flex h-8 items-center justify-between border-b border-[var(--editor-border)] pr-2">
        <div className="flex h-full items-stretch">
          {tabs.map(tab => {
            const Icon = tab.icon
            const isActive = activePanel === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActivePanel(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 border-r border-[var(--editor-border)] px-3 text-xs font-medium uppercase tracking-wide transition-colors',
                  isActive
                    ? 'bg-[var(--editor-bg)] text-foreground'
                    : 'text-muted-foreground hover:bg-[var(--list-hover)]'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="rounded-full bg-[var(--input-bg)] px-1.5 text-[10px]">
                    {tab.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5"
            onClick={() => {
              const panels = document.querySelectorAll('[data-panel]')
              // Just close
              setTerminalOpen(false)
            }}
            title="Close panel"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5"
            onClick={() => setTerminalOpen(false)}
            title="Close"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activePanel === 'terminal' && <Terminal />}
        {activePanel === 'problems' && <ProblemsPanel />}
        {activePanel === 'output' && <OutputPanel />}
      </div>
    </div>
  )
}

function ProblemsPanel() {
  return (
    <div className="flex h-full items-center justify-center bg-[var(--editor-bg)] text-xs text-muted-foreground">
      <div className="text-center">
        <AlertCircle className="mx-auto mb-2 h-8 w-8 opacity-30" />
        <p>No problems detected in the workspace</p>
        <p className="mt-1 text-[11px]">Problems from TypeScript / ESLint would appear here</p>
      </div>
    </div>
  )
}

function OutputPanel() {
  const files = useEditorStore(s => s.files)
  const allFiles = Object.values(files).filter(f => f.type === 'file')
  const totalLines = allFiles.reduce((sum, f) => sum + (f.content?.split('\n').length || 0), 0)

  return (
    <div className="h-full overflow-y-auto bg-[var(--terminal-bg)] p-3 font-mono text-[12px] text-[var(--terminal-fg)]">
      <div className="text-muted-foreground">[ZCode Studio] Editor initialized successfully</div>
      <div className="mt-1 text-muted-foreground">[Info] Loaded {allFiles.length} files from workspace</div>
      <div className="mt-1 text-muted-foreground">[Info] Total lines: {totalLines.toLocaleString()}</div>
      <div className="mt-1 text-muted-foreground">[Info] Monaco Editor version: 0.55.1</div>
      <div className="mt-1 text-muted-foreground">[Info] Next.js runtime: ready</div>
      <div className="mt-1 text-cyan-400">[Ready] All systems operational -</div>
    </div>
  )
}
