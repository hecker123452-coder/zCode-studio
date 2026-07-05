'use client'

import { useEffect } from 'react'
import { Keyboard, X, Globe, FileCode, Bot, type LucideIcon } from 'lucide-react'
import { useEditorStore } from '@/store/editor-store'

interface Shortcut {
  keys: string
  action: string
}

const SHORTCUT_GROUPS: { title: string; icon: LucideIcon; shortcuts: Shortcut[] }[] = [
  {
    title: 'Global',
    icon: Globe,
    shortcuts: [
      { keys: '⌘⇧P', action: 'Command Palette' },
      { keys: '⌘P', action: 'Quick Open File' },
      { keys: '⌘B', action: 'Toggle Sidebar (desktop)' },
      { keys: '⌘`', action: 'Toggle Terminal' },
      { keys: '⌘,', action: 'Settings' },
      { keys: '⌘N', action: 'New File' },
      { keys: '⌘⇧N', action: 'New Folder' },
      { keys: '?', action: 'Show this help' },
      { keys: 'Esc', action: 'Close Run Panel / Dialog' },
    ],
  },
  {
    title: 'Editor',
    icon: FileCode,
    shortcuts: [
      { keys: '⌘Z', action: 'Undo' },
      { keys: '⌘⇧Z', action: 'Redo' },
      { keys: '⌘F', action: 'Find in File' },
      { keys: '⌘⇧F', action: 'Find in Files' },
      { keys: '⌘⇧Alt+F', action: 'Format Document' },
      { keys: '⌘G', action: 'Go to Line...' },
      { keys: '⌘S', action: 'Save to Device' },
      { keys: '⌘D', action: 'Multi-cursor (Monaco default)' },
    ],
  },
  {
    title: 'AI & Run',
    icon: Bot,
    shortcuts: [
      { keys: 'Run button', action: 'Run IndoCode (full screen)' },
      { keys: 'Esc', action: 'Exit Run Panel' },
      { keys: 'Deploy button', action: 'Deploy HTML to /d/:id' },
    ],
  },
]

export function ShortcutsHelpModal() {
  const open = useEditorStore(s => s.shortcutsHelpOpen)
  const setOpen = useEditorStore(s => s.setShortcutsHelpOpen)

  // Escape closes the modal (since we don't use Radix Dialog here)
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handler, { capture: true })
    return () => window.removeEventListener('keydown', handler, { capture: true })
  }, [open, setOpen])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl border border-[var(--editor-border)] bg-[var(--side-bar-bg)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex h-12 items-center justify-between border-b border-[var(--editor-border)] px-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Keyboard className="h-4 w-4" /> Keyboard Shortcuts
          </h2>
          <button
            onClick={() => setOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-[var(--list-hover)] hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-4" style={{ maxHeight: 'calc(85vh - 48px)' }}>
          <div className="space-y-5">
            {SHORTCUT_GROUPS.map(group => {
              const GroupIcon = group.icon
              return (
                <div key={group.title}>
                  <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <GroupIcon className="h-3.5 w-3.5" />
                    <span>{group.title}</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {group.shortcuts.map((s, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-lg border border-[var(--editor-border)] bg-[var(--input-bg)] px-3 py-2 text-xs"
                      >
                        <span className="text-muted-foreground">{s.action}</span>
                        <kbd className="rounded bg-[var(--list-hover)] px-2 py-1 font-mono text-[10px] font-medium text-foreground">
                          {s.keys}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}

            {/* Tips */}
            <div className="rounded-xl border border-[var(--editor-border)] bg-[var(--input-bg)] p-3 text-xs text-muted-foreground">
              <p className="mb-1 font-semibold text-foreground">Tips:</p>
              <ul className="space-y-1 ml-4 list-disc">
                <li>Klik kanan file di Explorer untuk menu context (Rename, Duplicate, Save, dll)</li>
                <li>Seret file dari komputer ke editor untuk impor cepat</li>
                <li>Tombol tengah mouse (scroll click) di tab untuk menutup cepat</li>
                <li>Hover tab untuk melihat tombol pin - pinned tab menempel di kiri</li>
                <li>Buka file gambar (.png/.jpg) untuk melihat preview dengan zoom</li>
                <li>Buka file .md untuk melihat markdown preview split view</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
