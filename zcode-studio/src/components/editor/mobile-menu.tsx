'use client'

import { useState } from 'react'
import {
  X, FilePlus, FolderPlus, Settings, Download, Save,
  CodeSquare, Command, Search, Bot, Rocket, Play,
  Upload, FileType2, Keyboard, HelpCircle, ShieldCheck,
  type LucideIcon,
} from 'lucide-react'
import { useEditorStore } from '@/store/editor-store'
import { cn } from '@/lib/utils'
import { useFileOperations } from '@/hooks/use-file-operations'
import { promptFileName, promptFolderName } from '@/components/editor/prompt-dialog'
import { BugScanDialog } from '@/components/editor/bug-scan-dialog'
import { toast } from 'sonner'

interface MenuItem {
  icon: LucideIcon
  label: string
  description?: string
  onClick: () => void
  shortcut?: string
  disabled?: boolean
}

export function MobileMenu() {
  const open = useEditorStore(s => s.mobileMenuOpen)
  const setOpen = useEditorStore(s => s.setMobileMenuOpen)
  const setSettingsOpen = useEditorStore(s => s.setSettingsOpen)
  const setCommandPaletteOpen = useEditorStore(s => s.setCommandPaletteOpen)
  const setQuickOpenOpen = useEditorStore(s => s.setQuickOpenOpen)
  const setMobileAIOpen = useEditorStore(s => s.setMobileAIOpen)
  const createFile = useEditorStore(s => s.createFile)
  const createFolder = useEditorStore(s => s.createFolder)
  const openTab = useEditorStore(s => s.openTab)
  const files = useEditorStore(s => s.files)
  const closeAllTabs = useEditorStore(s => s.closeAllTabs)
  const setDeployOpen = useEditorStore(s => s.setDeployOpen)
  const setRunPanelOpen = useEditorStore(s => s.setRunPanelOpen)
  const setShortcutsHelpOpen = useEditorStore(s => s.setShortcutsHelpOpen)
  const activeTabId = useEditorStore(s => s.activeTabId)
  const openTabs = useEditorStore(s => s.openTabs)
  const [scanOpen, setScanOpen] = useState(false)

  const { openFromDeviceFSAccess, saveToDevice, saveAsToDevice, saveAllToDevice } = useFileOperations()

  const activeTab = openTabs.find(t => t.id === activeTabId)
  const activeFile = activeTab ? files[activeTab.fileId] : null
  const isIndoCode = activeFile?.language === 'indocode'
  const isHtml = activeFile?.language === 'html' || activeFile?.language === 'xml' || activeFile?.language === 'indocode'

  if (!open) return null

  const handleAction = (action: () => void) => {
    setOpen(false)
    setTimeout(action, 200)
  }

  const handleNewFile = async () => {
    const name = await promptFileName()
    if (name) {
      const id = createFile(name, null)
      openTab(id, false)
      toast.success(`Dibuat: ${name}`)
    }
  }

  const handleNewFolder = async () => {
    const name = await promptFolderName()
    if (name) {
      createFolder(name, null)
      toast.success(`Folder dibuat: ${name}`)
    }
  }

  const handleExport = () => {
    const projectData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      files: Object.values(files).map(f => ({
        name: f.name,
        type: f.type,
        content: f.content,
        language: f.language,
      })),
    }
    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `zcode-project-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Project diekspor')
  }

  const handleDeploy = () => {
    if (!isHtml) {
      toast.error('Buka file HTML dulu, baru bisa di-deploy')
      return
    }
    setDeployOpen(true)
  }

  const handleRun = () => {
    if (!isIndoCode) {
      toast.error('Buka file .indo dulu, baru bisa dijalanin')
      return
    }
    setRunPanelOpen(true)
  }

  const handleSaveActive = () => {
    if (!activeTabId || !activeFile) {
      toast.error('Belum ada file aktif')
      return
    }
    saveToDevice(activeFile.id)
  }

  const menuItems: MenuItem[] = [
    { icon: Command, label: 'Command Palette', description: 'Semua perintah', onClick: () => handleAction(() => setCommandPaletteOpen(true)) },
    { icon: Search, label: 'Buka File Cepat', description: 'Cari file', onClick: () => handleAction(() => setQuickOpenOpen(true)), shortcut: '⌘P' },
    { icon: Bot, label: 'AI Assistant', description: 'Chat dengan AI', onClick: () => handleAction(() => setMobileAIOpen(true)) },
    { icon: FilePlus, label: 'File Baru', description: 'Buat file baru', onClick: () => handleAction(handleNewFile) },
    { icon: FolderPlus, label: 'Folder Baru', description: 'Buat folder baru', onClick: () => handleAction(handleNewFolder) },
    { icon: FileType2, label: 'Dari Template', description: 'File boilerplate', onClick: () => handleAction(() => { useEditorStore.getState().setActiveView('explorer'); toast.info('Buka sidebar -> Dari Template') }) },
    { icon: Download, label: 'Simpan ke Perangkat', description: 'Unduh file aktif', onClick: () => handleAction(handleSaveActive), disabled: !activeFile },
    { icon: Save, label: 'Simpan Semua', description: 'Unduh semua file terbuka', onClick: () => handleAction(saveAllToDevice) },
    { icon: Download, label: 'Ekspor Project', description: 'Unduh sebagai JSON', onClick: () => handleAction(handleExport) },
    { icon: CodeSquare, label: 'Tutup Semua Tab', description: 'Tutup semua tab terbuka', onClick: () => handleAction(closeAllTabs) },
    { icon: Keyboard, label: 'Shortcut Keyboard', description: 'Lihat semua shortcut', onClick: () => handleAction(() => setShortcutsHelpOpen(true)) },
    { icon: Settings, label: 'Pengaturan', description: 'Preferensi editor', onClick: () => handleAction(() => setSettingsOpen(true)) },
  ]

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 animate-in fade-in bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
        style={{ animationDuration: '200ms' }}
      />

      {/* Menu Sheet */}
      <div
        className="absolute bottom-0 left-0 right-0 max-h-[90vh] overflow-y-auto rounded-t-3xl bg-[var(--side-bar-bg)] pb-[max(1rem,env(safe-area-inset-bottom))] animate-in slide-in-from-bottom"
        style={{ animationDuration: '300ms' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="h-1 w-12 rounded-full bg-muted-foreground/40" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--editor-border)] px-4 py-3">
          <h2 className="text-base font-bold">Menu</h2>
          <button
            onClick={() => setOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--list-hover)] active:scale-95"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Big action buttons: Open + Save */}
        <div className="grid grid-cols-2 gap-2 p-3 pb-1">
          <button
            onClick={() => handleAction(() => openFromDeviceFSAccess())}
            className="flex flex-col items-center gap-1.5 rounded-2xl border border-[var(--list-active)] bg-[var(--list-hover)] p-4 text-foreground transition-all active:scale-95"
          >
            <Upload className="h-6 w-6" />
            <span className="text-xs font-semibold">Buka dari Perangkat</span>
            <span className="text-[10px] text-muted-foreground">Buka file dari perangkat</span>
          </button>
          <button
            onClick={() => handleAction(handleSaveActive)}
            disabled={!activeFile}
            className="flex flex-col items-center gap-1.5 rounded-2xl border p-4 transition-all active:scale-95 disabled:opacity-60"
            style={{
              background: activeFile ? 'linear-gradient(135deg, #10b981, #059669)' : 'var(--input-bg)',
              borderColor: activeFile ? 'transparent' : 'var(--editor-border)',
              color: activeFile ? '#ffffff' : 'var(--muted-foreground)',
            }}
          >
            <Save className="h-6 w-6" />
            <span className="text-xs font-semibold">Simpan ke Perangkat</span>
            <span className="text-[10px]" style={{ opacity: 0.8 }}>Simpan file aktif</span>
          </button>
        </div>

        {/* Big action buttons: Run + Deploy */}
        <div className="grid grid-cols-2 gap-2 px-3 pb-1">
          <button
            onClick={() => handleAction(handleRun)}
            disabled={!isIndoCode}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-2xl border p-3 transition-all active:scale-95',
              isIndoCode
                ? 'border-[var(--list-active)] bg-[var(--list-hover)] text-foreground'
                : 'border-[var(--editor-border)] bg-[var(--input-bg)] text-muted-foreground opacity-60'
            )}
          >
            <Play className="h-5 w-5" />
            <span className="text-xs font-semibold">Jalankan IndoCode</span>
            <span className="text-[10px] text-muted-foreground">Full Screen</span>
          </button>
          <button
            onClick={() => handleAction(handleDeploy)}
            disabled={!isHtml}
            className="flex flex-col items-center gap-1.5 rounded-2xl border p-3 transition-all active:scale-95 disabled:opacity-60"
            style={{
              background: isHtml ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'var(--input-bg)',
              borderColor: isHtml ? 'transparent' : 'var(--editor-border)',
              color: isHtml ? '#ffffff' : 'var(--muted-foreground)',
            }}
          >
            <Rocket className="h-5 w-5" />
            <span className="text-xs font-semibold">Deploy</span>
            <span className="text-[10px]" style={{ opacity: 0.8 }}>HTML Project</span>
          </button>
        </div>

        {/* Big action button: Scan Bug (full width, prominent) */}
        <div className="px-3 pb-1">
          <button
            onClick={() => handleAction(() => setScanOpen(true))}
            className="flex w-full flex-col items-center gap-1.5 rounded-2xl border border-transparent p-3 transition-all active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#ffffff',
            }}
          >
            <ShieldCheck className="h-5 w-5" />
            <span className="text-xs font-semibold">Scan Bug</span>
            <span className="text-[10px]" style={{ opacity: 0.85 }}>Cek bug di semua file / file aktif / upload</span>
          </button>
        </div>

        {/* Menu items */}
        <div className="px-3 pb-2 pt-2">
          <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Aksi
          </div>
          {menuItems.map((item, idx) => {
            const Icon = item.icon
            return (
              <button
                key={idx}
                onClick={item.onClick}
                disabled={item.disabled}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 transition-colors active:bg-[var(--list-hover)] hover:bg-[var(--list-hover)] disabled:opacity-50"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--list-hover)]">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium">{item.label}</div>
                  {item.description && (
                    <div className="text-xs text-muted-foreground">{item.description}</div>
                  )}
                </div>
                {item.shortcut && (
                  <kbd className="rounded bg-[var(--input-bg)] px-2 py-0.5 text-[10px]">{item.shortcut}</kbd>
                )}
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--editor-border)] px-4 py-3 text-center">
          <p className="text-[10px] text-muted-foreground">ZCode Studio v2.4</p>
        </div>
      </div>

      {/* Bug Scan Dialog */}
      <BugScanDialog open={scanOpen} onOpenChange={setScanOpen} />
    </div>
  )
}
