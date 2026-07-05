'use client'

import { Files, Search, GitBranch, Bot, BookMarked, Settings, type LucideIcon } from 'lucide-react'
import { useEditorStore } from '@/store/editor-store'
import { cn } from '@/lib/utils'

interface ActivityBarItem {
  id: 'explorer' | 'search' | 'git' | 'ai' | 'snippets'
  icon: LucideIcon
  label: string
}

const items: ActivityBarItem[] = [
  { id: 'explorer', icon: Files, label: 'Explorer' },
  { id: 'search', icon: Search, label: 'Search' },
  { id: 'git', icon: GitBranch, label: 'Source Control' },
  { id: 'ai', icon: Bot, label: 'AI Assistant' },
  { id: 'snippets', icon: BookMarked, label: 'Snippets' },
]

export function ActivityBar() {
  const activeView = useEditorStore(s => s.activeView)
  const setActiveView = useEditorStore(s => s.setActiveView)
  const setSettingsOpen = useEditorStore(s => s.setSettingsOpen)
  const settingsOpen = useEditorStore(s => s.settingsOpen)

  const handleToggle = (id: ActivityBarItem['id']) => {
    if (activeView === id) {
      // Hide sidebar - we need a separate state for that, but for now just keep it
    }
    setActiveView(id)
  }

  return (
    <div className="flex h-full w-12 flex-col items-center justify-between border-r border-[var(--editor-border)] bg-[var(--activity-bar-bg)] py-2">
      <div className="flex flex-col items-center gap-1">
        {items.map(item => {
          const Icon = item.icon
          const isActive = activeView === item.id
          return (
            <button
              key={item.id}
              onClick={() => handleToggle(item.id)}
              title={item.label}
              className={cn(
                'group relative flex h-10 w-10 items-center justify-center rounded-md transition-all duration-150',
                'hover:bg-[var(--activity-bar-hover)]',
                isActive && 'bg-[var(--activity-bar-active)]'
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r bg-foreground" />
              )}
              <Icon
                className={cn(
                  'h-5 w-5 transition-colors',
                  isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
                )}
                strokeWidth={1.75}
              />
            </button>
          )
        })}
      </div>

      <div className="flex flex-col items-center gap-1">
        <button
          onClick={() => setSettingsOpen(!settingsOpen)}
          title="Settings"
          className={cn(
            'group flex h-10 w-10 items-center justify-center rounded-md transition-all duration-150',
            'hover:bg-[var(--activity-bar-hover)]',
            settingsOpen && 'bg-[var(--activity-bar-active)]'
          )}
        >
          <Settings
            className={cn(
              'h-5 w-5 transition-transform group-hover:rotate-45',
              settingsOpen ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
            )}
            strokeWidth={1.75}
          />
        </button>
      </div>
    </div>
  )
}
