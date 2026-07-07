'use client'

import { useState } from 'react'
import {
  Code2, Search, FilePlus, FolderPlus, Menu, Eye, Terminal as TerminalIcon, Rocket, Play,
  Upload, Download, Save, FileType2, Keyboard, HelpCircle, ShieldCheck,
  Files, Bot, Settings, Package, FileArchive,
} from 'lucide-react'
import {
  Menubar, MenubarContent, MenubarItem, MenubarMenu,
  MenubarSeparator, MenubarTrigger,
} from '@/components/ui/menubar'
import { useEditorStore } from '@/store/editor-store'
import { useFileOperations } from '@/hooks/use-file-operations'
import { promptFileName, promptFolderName } from '@/components/editor/prompt-dialog'
import { BugScanDialog } from '@/components/editor/bug-scan-dialog'
import { AboutDialog } from '@/components/editor/about-dialog'
import { ProjectManagerDialog } from '@/components/editor/project-manager-dialog'
import { toast } from 'sonner'

export function TopMenuBar() {
  const createFile = useEditorStore(s => s.createFile)
  const createFolder = useEditorStore(s => s.createFolder)
  const openTab = useEditorStore(s => s.openTab)
  const files = useEditorStore(s => s.files)
  const setCommandPaletteOpen = useEditorStore(s => s.setCommandPaletteOpen)
  const setSettingsOpen = useEditorStore(s => s.setSettingsOpen)
  const setTerminalOpen = useEditorStore(s => s.setTerminalOpen)
  const setActiveView = useEditorStore(s => s.setActiveView)
  const closeAllTabs = useEditorStore(s => s.closeAllTabs)
  const setMobileSidebarOpen = useEditorStore(s => s.setMobileSidebarOpen)
  const setMobileMenuOpen = useEditorStore(s => s.setMobileMenuOpen)
  const setMobileTerminalOpen = useEditorStore(s => s.setMobileTerminalOpen)
  const setQuickOpenOpen = useEditorStore(s => s.setQuickOpenOpen)
  const setDeployOpen = useEditorStore(s => s.setDeployOpen)
  const setRunPanelOpen = useEditorStore(s => s.setRunPanelOpen)
  const setShortcutsHelpOpen = useEditorStore(s => s.setShortcutsHelpOpen)
  const setApkEditorOpen = useEditorStore(s => s.setApkEditorOpen)
  const activeTabId = useEditorStore(s => s.activeTabId)
  const openTabs = useEditorStore(s => s.openTabs)
  const [scanOpen, setScanOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [projectManagerOpen, setProjectManagerOpen] = useState(false)

  const { openFromDeviceFSAccess, saveToDevice, saveAsToDevice, saveAllToDevice } = useFileOperations()

  const activeTab = openTabs.find(t => t.id === activeTabId)
  const activeFile = activeTab ? files[activeTab.fileId] : null
  const isIndoCode = activeFile?.language === 'indocode'
  const isHtml = activeFile?.language === 'html' || activeFile?.language === 'xml' || activeFile?.language === 'indocode'

  const handleDeploy = () => {
    if (!isHtml) {
      toast.error('Buka file HTML terlebih dahulu untuk deploy')
      return
    }
    setDeployOpen(true)
  }

  const handleRun = () => {
    if (!isIndoCode) {
      toast.error('Buka file .indo terlebih dahulu untuk menjalankan')
      return
    }
    setRunPanelOpen(true)
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

  return (
    <div className="flex h-12 items-center justify-between border-b border-[var(--editor-border)] bg-[var(--title-bar-bg)] px-2 md:h-9 md:px-3">
      {/* Logo + Mobile menu */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground active:bg-[var(--list-hover)] md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 px-1 md:px-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--list-hover)]">
            <Code2 className="h-4 w-4 text-white" strokeWidth={2} />
          </div>
          <span className="hidden text-xs font-bold tracking-tight sm:inline">ZCode Studio</span>
        </div>
      </div>

      {/* Desktop menus */}
      <Menubar className="hidden h-7 border-0 bg-transparent md:flex">
        <MenubarMenu>
          <MenubarTrigger className="h-7 text-xs">File</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={handleNewFile}>
              <FilePlus className="mr-2 h-4 w-4" />
              <span>File Baru</span>
              <span className="ml-auto text-xs text-muted-foreground">⌘N</span>
            </MenubarItem>
            <MenubarItem onClick={handleNewFolder}>
              <FolderPlus className="mr-2 h-4 w-4" />
              <span>Folder Baru</span>
              <span className="ml-auto text-xs text-muted-foreground">⌘⇧N</span>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={() => openFromDeviceFSAccess()}>
              <Upload className="mr-2 h-4 w-4" />
              <span>Buka dari Perangkat...</span>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem
              onClick={() => activeTabId && saveToDevice(openTabs.find(t => t.id === activeTabId)?.fileId || '')}
              disabled={!activeFile}
            >
              <Save className="mr-2 h-4 w-4" />
              <span>Simpan ke Perangkat</span>
              <span className="ml-auto text-xs text-muted-foreground">⌘S</span>
            </MenubarItem>
            <MenubarItem
              onClick={() => activeTabId && saveAsToDevice(openTabs.find(t => t.id === activeTabId)?.fileId || '')}
              disabled={!activeFile}
            >
              <Download className="mr-2 h-4 w-4" />
              <span>Simpan Sebagai...</span>
            </MenubarItem>
            <MenubarItem onClick={() => saveAllToDevice()}>
              <Save className="mr-2 h-4 w-4" />
              <span>Simpan Semua ke Perangkat</span>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={handleRun} disabled={!isIndoCode}>
              <Play className="mr-2 h-4 w-4" />
              <span>Jalankan IndoCode</span>
            </MenubarItem>
            <MenubarItem onClick={handleDeploy} disabled={!isHtml}>
              <Rocket className="mr-2 h-4 w-4" />
              <span>Deploy Project</span>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={() => setProjectManagerOpen(true)}>
              <FileArchive className="mr-2 h-4 w-4" />
              <span>Project Manager (ZIP + Cloud)</span>
            </MenubarItem>
            <MenubarItem onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              <span>Ekspor Project (JSON)</span>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={closeAllTabs}>
              <span>Tutup Semua Tab</span>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        <MenubarMenu>
          <MenubarTrigger className="h-7 text-xs">Tampilan</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={() => setActiveView('explorer')}>
              <Files className="mr-2 h-4 w-4" />
              <span>Explorer</span>
            </MenubarItem>
            <MenubarItem onClick={() => setActiveView('search')}>
              <Search className="mr-2 h-4 w-4" />
              <span>Pencarian</span>
            </MenubarItem>
            <MenubarItem onClick={() => setActiveView('ai')}>
              <Bot className="mr-2 h-4 w-4" />
              <span>AI Assistant</span>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={() => setTerminalOpen(!useEditorStore.getState().terminalOpen)}>
              <TerminalIcon className="mr-2 h-4 w-4" />
              <span>Toggle Terminal</span>
              <span className="ml-auto text-xs text-muted-foreground">⌘`</span>
            </MenubarItem>
            <MenubarItem onClick={() => setCommandPaletteOpen(true)}>
              <span>Command Palette</span>
              <span className="ml-auto text-xs text-muted-foreground">⌘⇧P</span>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        <MenubarMenu>
          <MenubarTrigger className="h-7 text-xs">Alat</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={() => setScanOpen(true)}>
              <ShieldCheck className="mr-2 h-4 w-4" />
              <span>Scan Bug (Semua File)</span>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={() => setApkEditorOpen(true)}>
              <Package className="mr-2 h-4 w-4" />
              <span>APK Editor (MT Style)</span>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={handleRun} disabled={!isIndoCode}>
              <Play className="mr-2 h-4 w-4" />
              <span>Jalankan IndoCode</span>
            </MenubarItem>
            <MenubarItem onClick={handleDeploy} disabled={!isHtml}>
              <Rocket className="mr-2 h-4 w-4" />
              <span>Deploy Project</span>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        <MenubarMenu>
          <MenubarTrigger className="h-7 text-xs">Bantuan</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={() => setSettingsOpen(true)}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Pengaturan</span>
              <span className="ml-auto text-xs text-muted-foreground">⌘,</span>
            </MenubarItem>
            <MenubarItem onClick={() => setShortcutsHelpOpen(true)}>
              <Keyboard className="mr-2 h-4 w-4" />
              <span>Shortcut Keyboard</span>
              <span className="ml-auto text-xs text-muted-foreground">?</span>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={() => setAboutOpen(true)}>
              <HelpCircle className="mr-2 h-4 w-4" />
              <span>Tentang</span>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>

      {/* Mobile quick actions */}
      <div className="flex items-center gap-0.5 md:hidden">
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground active:bg-[var(--list-hover)]"
          title="Open Files"
        >
          <Code2 className="h-5 w-5" />
        </button>
        <button
          onClick={() => setQuickOpenOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground active:bg-[var(--list-hover)]"
          title="Quick Open"
        >
          <Search className="h-5 w-5" />
        </button>
        <button
          onClick={() => setScanOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-emerald-400 active:bg-[var(--list-hover)]"
          title="Scan Bug"
        >
          <ShieldCheck className="h-5 w-5" />
        </button>
        <button
          onClick={() => setApkEditorOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-emerald-400 active:bg-[var(--list-hover)]"
          title="APK Editor"
        >
          <Package className="h-5 w-5" />
        </button>
        <button
          onClick={() => setMobileTerminalOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground active:bg-[var(--list-hover)]"
          title="Terminal"
        >
          <TerminalIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Desktop right side: search + action buttons */}
      <div className="hidden items-center gap-1.5 md:flex">
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex h-6 items-center gap-1.5 rounded-md bg-[var(--input-bg)] px-2 text-[11px] text-muted-foreground hover:bg-[var(--list-hover)]"
          title="Search files & commands"
        >
          <Search className="h-3 w-3" />
          <span>Search...</span>
          <kbd className="rounded bg-[var(--list-hover)] px-1 text-[10px]">⌘⇧P</kbd>
        </button>

        <button
          onClick={() => setScanOpen(true)}
          className="flex h-7 items-center gap-1.5 rounded-md bg-[var(--input-bg)] px-3 text-xs font-medium text-emerald-400 transition-all hover:bg-[var(--list-hover)] active:scale-95"
          title="Scan Bug"
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Scan Bug</span>
        </button>

        <button
          onClick={() => setApkEditorOpen(true)}
          className="flex h-7 items-center gap-1.5 rounded-md bg-gradient-to-r from-emerald-500/20 to-blue-500/20 px-3 text-xs font-medium text-emerald-400 transition-all hover:bg-[var(--list-hover)] active:scale-95"
          title="APK Editor (MT Manager Style)"
        >
          <Package className="h-3.5 w-3.5" />
          <span>APK Editor</span>
        </button>

        {isIndoCode && (
          <button
            onClick={handleRun}
            className="flex h-7 items-center gap-1.5 rounded-md bg-[var(--input-bg)] px-3 text-xs font-medium text-foreground transition-all hover:bg-[var(--list-hover)] active:scale-95"
            title="Run IndoCode (Full Screen)"
          >
            <Play className="h-3.5 w-3.5" />
            <span>Run</span>
          </button>
        )}

        <button
          onClick={handleDeploy}
          className="flex h-7 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: isHtml ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'var(--input-bg)',
            color: isHtml ? '#ffffff' : 'var(--muted-foreground)',
          }}
          title={isHtml ? 'Deploy Project' : 'Buka file HTML dulu'}
          disabled={!isHtml}
        >
          <Rocket className="h-3.5 w-3.5" />
          <span>Deploy</span>
        </button>
      </div>

      {/* Bug Scan Dialog */}
      <BugScanDialog open={scanOpen} onOpenChange={setScanOpen} />
      <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />
      <ProjectManagerDialog open={projectManagerOpen} onOpenChange={setProjectManagerOpen} />
    </div>
  )
}
