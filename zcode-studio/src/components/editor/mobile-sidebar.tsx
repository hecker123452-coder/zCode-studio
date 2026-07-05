'use client'

import { X } from 'lucide-react'
import { useEditorStore } from '@/store/editor-store'
import { FileExplorer } from '@/components/editor/file-explorer'
import { SearchPanel } from '@/components/editor/search-panel'
import { SourceControlPanel } from '@/components/editor/source-control-panel'
import { SnippetsPanel } from '@/components/editor/snippets-panel'
import { useSwipeToClose } from '@/hooks/use-swipe-gesture'
import { cn } from '@/lib/utils'

const viewTitles: Record<string, string> = {
  explorer: 'File',
  search: 'Pencarian',
  git: 'Source Control',
  snippets: 'Snippets',
}

export function MobileSidebar() {
  const open = useEditorStore(s => s.mobileSidebarOpen)
  const setOpen = useEditorStore(s => s.setMobileSidebarOpen)
  const activeView = useEditorStore(s => s.activeView)
  const setActiveView = useEditorStore(s => s.setActiveView)

  // Swipe left to close
  const swipeHandlers = useSwipeToClose(() => setOpen(false), 'left', open)

  if (!open) return null

  const views = ['explorer', 'search', 'git', 'snippets'] as const

  const renderContent = () => {
    switch (activeView) {
      case 'explorer': return <FileExplorer />
      case 'search': return <SearchPanel />
      case 'git': return <SourceControlPanel />
      case 'snippets': return <SnippetsPanel />
      default: return <FileExplorer />
    }
  }

  return (
    <MobileDrawer
      open={open}
      onClose={() => setOpen(false)}
      title={viewTitles[activeView] || 'File'}
      tabs={views.map(v => ({ id: v, label: viewTitles[v] }))}
      activeTab={activeView}
      onTabChange={(v) => setActiveView(v as typeof activeView)}
      swipeHandlers={swipeHandlers}
    >
      {renderContent()}
    </MobileDrawer>
  )
}

interface MobileDrawerProps {
  open: boolean
  onClose: () => void
  title: string
  tabs?: { id: string; label: string }[]
  activeTab?: string
  onTabChange?: (id: string) => void
  children: React.ReactNode
  side?: 'left' | 'right' | 'bottom'
  maxWidth?: string
  swipeHandlers?: any
}

export function MobileDrawer({
  open, onClose, title, tabs, activeTab, onTabChange, children,
  side = 'left', maxWidth = '85vw', swipeHandlers,
}: MobileDrawerProps) {
  if (!open) return null

  const sideClass = side === 'left'
    ? 'left-0 animate-in slide-in-from-left'
    : side === 'right'
    ? 'right-0 animate-in slide-in-from-right'
    : 'left-0 right-0 bottom-0 top-auto rounded-t-3xl animate-in slide-in-from-bottom'

  return (
    <div className="fixed inset-0 z-40 md:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 animate-in fade-in bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        style={{ animationDuration: '200ms' }}
      />

      {/* Drawer */}
      <div
        className={cn(
          'absolute top-0 bottom-0 flex flex-col bg-[var(--side-bar-bg)] shadow-2xl',
          sideClass,
          side === 'bottom' && 'max-h-[90vh]'
        )}
        style={{
          width: side === 'bottom' ? '100%' : maxWidth,
          maxWidth: side === 'bottom' ? '100%' : '380px',
          animationDuration: '250ms',
        }}
        {...swipeHandlers}
      >
        {/* Drag handle for bottom sheet */}
        {side === 'bottom' && (
          <div className="flex justify-center pt-2.5 pb-1">
            <div className="h-1 w-12 rounded-full bg-muted-foreground/40" />
          </div>
        )}

        {/* Header */}
        <div className="flex h-12 items-center justify-between border-b border-[var(--editor-border)] px-3">
          <h2 className="text-sm font-bold">{title}</h2>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--list-hover)] active:scale-95"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs (if any) */}
        {tabs && tabs.length > 1 && (
          <div className="flex gap-1 overflow-x-auto border-b border-[var(--editor-border)] p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => onTabChange?.(tab.id)}
                className={cn(
                  'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground active:bg-[var(--list-hover)]'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  )
}
