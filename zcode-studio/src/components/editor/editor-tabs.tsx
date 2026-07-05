'use client'

import { X, Circle, MoreVertical, Pin, PinOff, Save, CopyPlus, Download } from 'lucide-react'
import { useEditorStore } from '@/store/editor-store'
import { getFileIcon } from '@/lib/editor/file-icons'
import { cn } from '@/lib/utils'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useFileOperations } from '@/hooks/use-file-operations'
import { toast } from 'sonner'

export function EditorTabs() {
  const openTabs = useEditorStore(s => s.openTabs)
  const activeTabId = useEditorStore(s => s.activeTabId)
  const files = useEditorStore(s => s.files)
  const pinnedTabIds = useEditorStore(s => s.pinnedTabIds)
  const setActiveTab = useEditorStore(s => s.setActiveTab)
  const closeTab = useEditorStore(s => s.closeTab)
  const closeOtherTabs = useEditorStore(s => s.closeOtherTabs)
  const closeAllTabs = useEditorStore(s => s.closeAllTabs)
  const togglePinTab = useEditorStore(s => s.togglePinTab)
  const duplicateFile = useEditorStore(s => s.duplicateFile)
  const { saveToDevice } = useFileOperations()

  if (openTabs.length === 0) return null

  const haptic = (pattern: number = 8) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(pattern) } catch { /* Vibration API not supported — ignore */ }
    }
  }

  // Split pinned vs unpinned (pinned first)
  const pinnedTabs = openTabs.filter(t => pinnedTabIds.includes(t.id))
  const unpinnedTabs = openTabs.filter(t => !pinnedTabIds.includes(t.id))

  const renderTab = (tab: typeof openTabs[0], isPinned: boolean) => {
    const file = files[tab.fileId]
    if (!file) return null
    const iconInfo = getFileIcon(file.name)
    const Icon = iconInfo.icon
    const isActive = tab.id === activeTabId

    return (
      <div
        key={tab.id}
        onClick={() => { haptic(5); setActiveTab(tab.id) }}
        onAuxClick={(e) => {
          if (e.button === 1) closeTab(tab.id)
        }}
        onContextMenu={(e) => {
          // Right-click also opens dropdown menu via trigger below
        }}
        className={cn(
          'group relative flex min-w-[110px] max-w-[200px] shrink-0 cursor-pointer items-center gap-1.5 border-r border-[var(--editor-border)] px-3 text-[13px] transition-colors md:min-w-[120px] md:max-w-[220px] md:gap-2',
          isPinned && 'max-w-[160px] md:max-w-[180px]',
          isActive
            ? 'bg-[var(--editor-bg)] text-foreground'
            : 'bg-[var(--tab-inactive-bg)] text-muted-foreground active:bg-[var(--list-hover)]'
        )}
      >
        {isActive && (
          <span className="absolute left-0 right-0 top-0 h-0.5 bg-foreground" />
        )}
        {isPinned && (
          <Pin className="h-3 w-3 shrink-0 text-foreground" fill="currentColor" />
        )}
        <Icon
          className="h-3.5 w-3.5 shrink-0 md:h-4 md:w-4"
          style={{ color: iconInfo.color }}
          strokeWidth={1.5}
        />
        <span className={cn('flex-1 truncate', tab.isDirty && 'italic')}>
          {file.name}
        </span>

        {/* Hover actions: pin/unpin + close */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation()
              haptic(10)
              togglePinTab(tab.id)
              toast.success(isPinned ? 'Tab un-pinned' : 'Tab di-pin')
            }}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded transition-all hover:bg-[var(--list-hover)] active:scale-90"
            aria-label={isPinned ? 'Unpin tab' : 'Pin tab'}
            title={isPinned ? 'Unpin tab' : 'Pin tab'}
          >
            {isPinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              haptic(10)
              closeTab(tab.id)
            }}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded transition-all hover:bg-[var(--list-hover)] active:scale-90"
            aria-label="Close tab"
          >
            {tab.isDirty ? (
              <Circle className="h-2.5 w-2.5 fill-current" />
            ) : (
              <X className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        {/* Always-visible dirty indicator when not hovering */}
        {tab.isDirty && (
          <span className="shrink-0 opacity-100 group-hover:opacity-0 transition-opacity">
            <Circle className="h-2.5 w-2.5 fill-current" />
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="flex h-10 items-stretch overflow-x-auto border-b border-[var(--editor-border)] bg-[var(--tabs-bg)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:h-9">
      {pinnedTabs.map(tab => renderTab(tab, true))}
      {pinnedTabs.length > 0 && unpinnedTabs.length > 0 && (
        <div className="w-px bg-[var(--editor-border)] shrink-0" />
      )}
      {unpinnedTabs.map(tab => renderTab(tab, false))}

      {/* Mobile close-all + actions dropdown */}
      {openTabs.length > 1 && (
        <div className="flex shrink-0 items-center pr-1 md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex h-10 w-9 items-center justify-center rounded text-muted-foreground active:bg-[var(--list-hover)]"
                aria-label="More tab actions"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {activeTabId && (
                <>
                  <DropdownMenuItem onClick={() => togglePinTab(activeTabId)}>
                    {pinnedTabIds.includes(activeTabId) ? (
                      <><PinOff className="mr-2 h-4 w-4" /> Unpin Tab</>
                    ) : (
                      <><Pin className="mr-2 h-4 w-4" /> Pin Tab </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    const tab = openTabs.find(t => t.id === activeTabId)
                    if (tab) saveToDevice(tab.fileId)
                  }}>
                    <Save className="mr-2 h-4 w-4" /> Simpan ke Perangkat
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    const tab = openTabs.find(t => t.id === activeTabId)
                    if (tab) {
                      duplicateFile(tab.fileId)
                      toast.success('File diduplikat')
                    }
                  }}>
                    <CopyPlus className="mr-2 h-4 w-4" /> Duplikat File
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => activeTabId && closeOtherTabs(activeTabId)}>
                    Tutup Lainnya
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={closeAllTabs}>
                Tutup Semua
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <div className="flex-1" />
      <button
        onClick={closeAllTabs}
        title="Tutup Semua"
        className="hidden items-center px-3 text-xs text-muted-foreground hover:bg-[var(--list-hover)] hover:text-foreground md:flex"
      >
        Tutup Semua
      </button>
    </div>
  )
}
