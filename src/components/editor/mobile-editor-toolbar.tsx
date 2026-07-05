'use client'

import {
  Undo2, Redo2, Search, Save, MoreVertical, Eye, Terminal as TerminalIcon,
  Wand2, ChevronsUpDown, Play, Download, Pin, PinOff, WrapText,
} from 'lucide-react'
import { useEditorStore } from '@/store/editor-store'
import { cn } from '@/lib/utils'
import { useFileOperations } from '@/hooks/use-file-operations'
import { promptGoToLine } from '@/components/editor/prompt-dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import type { editor } from 'monaco-editor'

interface MobileEditorToolbarProps {
  editor: editor.IStandaloneCodeEditor | null
}

export function MobileEditorToolbar({ editor }: MobileEditorToolbarProps) {
  const activeTabId = useEditorStore(s => s.activeTabId)
  const openTabs = useEditorStore(s => s.openTabs)
  const files = useEditorStore(s => s.files)
  const settings = useEditorStore(s => s.settings)
  const updateSettings = useEditorStore(s => s.updateSettings)
  const setMobileTerminalOpen = useEditorStore(s => s.setMobileTerminalOpen)
  const setShowPreviewMobile = useEditorStore(s => s.setShowPreviewMobile)
  const showPreviewMobile = useEditorStore(s => s.showPreviewMobile)
  const setRunPanelOpen = useEditorStore(s => s.setRunPanelOpen)
  const pinnedTabIds = useEditorStore(s => s.pinnedTabIds)
  const togglePinTab = useEditorStore(s => s.togglePinTab)

  const { saveToDevice, saveAsToDevice } = useFileOperations()

  const activeTab = openTabs.find(t => t.id === activeTabId)
  const activeFile = activeTab ? files[activeTab.fileId] : null
  const isIndoCode = activeFile?.language === 'indocode'
  const isPinned = activeTabId ? pinnedTabIds.includes(activeTabId) : false

  const haptic = (pattern: number = 8) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(pattern) } catch { /* Vibration API not supported — ignore */ }
    }
  }

  if (!activeFile) return null

  const isHtml = activeFile.language === 'html' || activeFile.language === 'xml'

  const triggerEditorAction = (action: string) => {
    if (editor) {
      editor.focus()
      editor.trigger('', action, null)
    }
  }

  const handleUndo = () => {
    haptic()
    triggerEditorAction('undo')
  }
  const handleRedo = () => {
    haptic()
    triggerEditorAction('redo')
  }
  const handleFind = () => {
    haptic()
    triggerEditorAction('actions.find')
  }
  const handleFormat = () => {
    haptic()
    if (editor) {
      const action = editor.getAction('editor.action.formatDocument')
      if (action) {
        action.run()
        toast.success('Document formatted')
      } else {
        toast.info('Formatter tidak tersedia buat bahasa ini ')
      }
    }
  }
  const handleGoToLine = async () => {
    haptic()
    if (editor) {
      const lineStr = await promptGoToLine()
      if (lineStr) {
        const line = parseInt(lineStr, 10)
        if (!isNaN(line) && line > 0) {
          const model = editor.getModel()
          if (model) {
            const lineCount = model.getLineCount()
            const targetLine = Math.min(line, lineCount)
            editor.revealLineInCenter(targetLine)
            editor.setPosition({ lineNumber: targetLine, column: 1 })
            editor.focus()
          }
        }
      }
    }
  }
  const handleSaveToDevice = () => {
    haptic(15)
    saveToDevice(activeFile.id)
  }
  const handleSaveAs = () => {
    haptic(15)
    saveAsToDevice(activeFile.id)
  }
  const handleToggleWordWrap = () => {
    haptic()
    updateSettings({ wordWrap: settings.wordWrap === 'on' ? 'off' : 'on' })
    toast.success(`Word wrap ${settings.wordWrap === 'on' ? 'mati' : 'nyala'}`)
  }
  const handleTogglePin = () => {
    haptic()
    if (activeTabId) {
      togglePinTab(activeTabId)
      toast.success(isPinned ? 'Tab un-pinned' : 'Tab di-pin')
    }
  }

  return (
    <div className="flex h-10 items-center gap-0.5 border-b border-[var(--editor-border)] bg-[var(--side-bar-bg)] px-1 md:hidden">
      <ToolbarButton
        icon={Undo2}
        onClick={handleUndo}
        label="Undo"
      />
      <ToolbarButton
        icon={Redo2}
        onClick={handleRedo}
        label="Redo"
      />
      <ToolbarButton
        icon={Search}
        onClick={handleFind}
        label="Find"
      />
      <ToolbarButton
        icon={Wand2}
        onClick={handleFormat}
        label="Format"
      />
      <ToolbarButton
        icon={Save}
        onClick={handleSaveToDevice}
        label="Save"
      />

      <div className="flex-1" />

      {/* Run button for IndoCode files */}
      {isIndoCode && (
        <ToolbarButton
          icon={Play}
          onClick={() => { haptic(20); setRunPanelOpen(true) }}
          label="Run"
        />
      )}

      {/* Toggle Live Preview for HTML */}
      {isHtml && (
        <ToolbarButton
          icon={Eye}
          onClick={() => { haptic(15); setShowPreviewMobile(!showPreviewMobile) }}
          label="Preview"
          active={showPreviewMobile}
        />
      )}

      <ToolbarButton
        icon={TerminalIcon}
        onClick={() => { haptic(15); setMobileTerminalOpen(true) }}
        label="Terminal"
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground active:bg-[var(--list-hover)] active:text-foreground"
            aria-label="More options"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={handleGoToLine}>
            <ChevronsUpDown className="mr-2 h-4 w-4" />
            <span>Go to Line...</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleToggleWordWrap}>
            <WrapText className="mr-2 h-4 w-4" />
            <span>Toggle Word Wrap ({settings.wordWrap === 'on' ? 'on' : 'off'})</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleTogglePin}>
            {isPinned ? (
              <><PinOff className="mr-2 h-4 w-4" /> Unpin Tab</>
            ) : (
              <><Pin className="mr-2 h-4 w-4" /> Pin Tab </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSaveToDevice}>
            <Save className="mr-2 h-4 w-4" />
            <span>Save to Device</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSaveAs}>
            <Download className="mr-2 h-4 w-4" />
            <span>Save As...</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

interface ToolbarButtonProps {
  icon: typeof Undo2
  onClick: () => void
  label: string
  active?: boolean
}

function ToolbarButton({ icon: Icon, onClick, label, active }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-lg transition-colors active:scale-90',
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground active:bg-[var(--list-hover)] active:text-foreground'
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}

