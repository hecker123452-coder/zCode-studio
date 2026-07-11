'use client'

import { useEffect, useState, useCallback, useSyncExternalStore } from 'react'
import type { editor } from 'monaco-editor'
import {
  PanelGroup, Panel, PanelResizeHandle,
} from 'react-resizable-panels'
import { useEditorStore } from '@/store/editor-store'
import { useIsMobile } from '@/hooks/use-mobile-editor'
import { TopMenuBar } from '@/components/editor/top-menu-bar'
import { ActivityBar } from '@/components/editor/activity-bar'
import { FileExplorer } from '@/components/editor/file-explorer'
import { SearchPanel } from '@/components/editor/search-panel'
import { AIAssistant } from '@/components/editor/ai-assistant'
import { SnippetsPanel } from '@/components/editor/snippets-panel'
import { EditorTabs } from '@/components/editor/editor-tabs'
import { CodeEditor } from '@/components/editor/code-editor'
import { StatusBar } from '@/components/editor/status-bar'
import { CommandPalette } from '@/components/editor/command-palette'
import { SettingsPanel } from '@/components/editor/settings-panel'
import { Terminal } from '@/components/editor/terminal'
import { LivePreview } from '@/components/editor/live-preview'
import { SourceControlPanel } from '@/components/editor/source-control-panel'
import { EditorBreadcrumb } from '@/components/editor/editor-breadcrumb'
import { BottomPanel } from '@/components/editor/bottom-panel'
import { MobileBottomNav } from '@/components/editor/mobile-bottom-nav'
import { MobileMenu } from '@/components/editor/mobile-menu'
import { MobileSidebar } from '@/components/editor/mobile-sidebar'
import { MobileAIModal } from '@/components/editor/mobile-ai-modal'
import { MobileTerminal } from '@/components/editor/mobile-terminal'
import { MobileEditorToolbar } from '@/components/editor/mobile-editor-toolbar'
import { RunPanel } from '@/components/editor/run-panel'
import { DeployDialog } from '@/components/editor/deploy-dialog'
import { ShortcutsHelpModal } from '@/components/editor/shortcuts-help'
import { PromptDialog, promptFileName, promptFolderName } from '@/components/editor/prompt-dialog'
import { AiCodeHelper } from '@/components/editor/ai-code-helper'
import { AiQuickCode } from '@/components/editor/ai-quick-code'
import { ApkEditor } from '@/components/editor/apk-editor'
import { useFileOperations, isBinaryFile, readFileAsText, readFileAsDataURL } from '@/hooks/use-file-operations'
import { toast } from 'sonner'

export default function Home() {
  const activeView = useEditorStore(s => s.activeView)
  const setActiveView = useEditorStore(s => s.setActiveView)
  const terminalOpen = useEditorStore(s => s.terminalOpen)
  const setTerminalOpen = useEditorStore(s => s.setTerminalOpen)
  const setCommandPaletteOpen = useEditorStore(s => s.setCommandPaletteOpen)
  const setSettingsOpen = useEditorStore(s => s.setSettingsOpen)
  const setQuickOpenOpen = useEditorStore(s => s.setQuickOpenOpen)
  const setMobileSidebarOpen = useEditorStore(s => s.setMobileSidebarOpen)
  const setMobileTerminalOpen = useEditorStore(s => s.setMobileTerminalOpen)
  const createFile = useEditorStore(s => s.createFile)
  const createFolder = useEditorStore(s => s.createFolder)
  const openTab = useEditorStore(s => s.openTab)
  const activeTabId = useEditorStore(s => s.activeTabId)
  const openTabs = useEditorStore(s => s.openTabs)
  const files = useEditorStore(s => s.files)
  const setMobileAIOpen = useEditorStore(s => s.setMobileAIOpen)
  const setShowPreviewMobile = useEditorStore(s => s.setShowPreviewMobile)
  const showPreviewMobile = useEditorStore(s => s.showPreviewMobile)
  const setRunPanelOpen = useEditorStore(s => s.setRunPanelOpen)
  const setDeployOpen = useEditorStore(s => s.setDeployOpen)
  const deployOpen = useEditorStore(s => s.deployOpen)
  const setShortcutsHelpOpen = useEditorStore(s => s.setShortcutsHelpOpen)
  const apkEditorOpen = useEditorStore(s => s.apkEditorOpen)
  const setApkEditorOpen = useEditorStore(s => s.setApkEditorOpen)

  const { saveToDevice, openFromDeviceFSAccess } = useFileOperations()

  const [cursorPos, setCursorPos] = useState({ line: 1, column: 1 })
  const [language, setLanguage] = useState('plaintext')
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const isMobile = useIsMobile()
  const [monacoEditor, setMonacoEditor] = useState<editor.IStandaloneCodeEditor | null>(null)

  // Use useSyncExternalStore to subscribe to zustand persist hydration
  const isHydrated = useSyncExternalStore(
    (callback) => {
      const unsubFinish = useEditorStore.persist.onFinishHydration(callback)
      return () => unsubFinish()
    },
    () => useEditorStore.persist.hasHydrated(),
    () => false
  )

  const isInEditor = () => {
    const active = document.activeElement
    return active?.closest('.monaco-editor') !== null
  }

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey

      // Esc - Close fullscreen RunPanel
      if (e.key === 'Escape' && useEditorStore.getState().runPanelOpen) {
        e.preventDefault()
        setRunPanelOpen(false)
        return
      }

      // Ctrl+Shift+P - Command palette
      if (ctrl && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
        e.preventDefault()
        setCommandPaletteOpen(true)
        return
      }

      // Ctrl+P - Quick open (but only when not in editor)
      if (ctrl && !e.shiftKey && (e.key === 'P' || e.key === 'p') && !isInEditor()) {
        e.preventDefault()
        setQuickOpenOpen(true)
        return
      }

      // Ctrl+B - Toggle sidebar (desktop only)
      if (ctrl && (e.key === 'B' || e.key === 'b') && !isMobile) {
        e.preventDefault()
        setSidebarVisible(v => !v)
        return
      }

      // Ctrl+` - Toggle terminal
      if (ctrl && e.key === '`') {
        e.preventDefault()
        if (isMobile) {
          setMobileTerminalOpen(!useEditorStore.getState().mobileTerminalOpen)
        } else {
          setTerminalOpen(!useEditorStore.getState().terminalOpen)
        }
        return
      }

      // Ctrl+, - Settings
      if (ctrl && e.key === ',') {
        e.preventDefault()
        setSettingsOpen(true)
        return
      }

      // Ctrl+N - New file
      if (ctrl && !e.shiftKey && (e.key === 'N' || e.key === 'n')) {
        e.preventDefault()
        const name = await promptFileName()
        if (name) {
          const id = createFile(name, null)
          openTab(id, false)
        }
        return
      }

      // Ctrl+Shift+N - New folder
      if (ctrl && e.shiftKey && (e.key === 'N' || e.key === 'n')) {
        e.preventDefault()
        const name = await promptFolderName()
        if (name) createFolder(name, null)
        return
      }

      // Ctrl+S - Save to Device (active file)
      if (ctrl && (e.key === 'S' || e.key === 's') && !e.shiftKey) {
        e.preventDefault()
        const tab = useEditorStore.getState().openTabs.find(t => t.id === useEditorStore.getState().activeTabId)
        if (tab) {
          saveToDevice(tab.fileId)
        } else {
          toast.info('Belum ada file aktif ')
        }
        return
      }

      // ? (Shift+/) - Show shortcuts help
      if (e.key === '?' && !ctrl && !isInEditor()) {
        e.preventDefault()
        setShortcutsHelpOpen(true)
        return
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setCommandPaletteOpen, setQuickOpenOpen, setTerminalOpen, setSettingsOpen, createFile, createFolder, openTab, setMobileTerminalOpen, isMobile, setRunPanelOpen, setShortcutsHelpOpen, saveToDevice])

  // Drag & drop file import (desktop)
  useEffect(() => {
    if (isMobile) return // Skip on mobile (no drag-drop)

    const handleDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'copy'
      }
    }

    const handleDrop = async (e: DragEvent) => {
      if (!e.dataTransfer?.files || e.dataTransfer.files.length === 0) return
      e.preventDefault()

      const fileList = e.dataTransfer.files
      const { importFile } = useEditorStore.getState()
      let imported = 0
      for (let i = 0; i < fileList.length; i++) {
        const f = fileList[i]
        try {
          const isBinary = isBinaryFile(f.name)
          let content = ''
          if (isBinary) {
            content = await readFileAsDataURL(f)
          } else {
            content = await readFileAsText(f)
          }
          const id = importFile(f.name, content, null, { isBinary })
          openTab(id, false)
          imported++
        } catch (err) {
          console.error('Drop import failed', err)
        }
      }
      if (imported > 0) {
        toast.success(`Dropped ${imported} file${imported > 1 ? 's' : ''}  `)
      }
    }

    window.addEventListener('dragover', handleDragOver)
    window.addEventListener('drop', handleDrop)
    return () => {
      window.removeEventListener('dragover', handleDragOver)
      window.removeEventListener('drop', handleDrop)
    }
  }, [isMobile, openTab])

  // LOCK VIEWPORT on mobile only.
  // Previously this effect ran unconditionally (empty dep array), which meant
  // it blocked Ctrl+/-, Ctrl+0, and Ctrl+wheel zoom on DESKTOP browsers too —
  // a real accessibility regression for desktop users who rely on browser zoom.
  //
  // Now we gate the entire listener set on `isMobile`. On desktop, none of
  // these listeners are attached, so the browser's native zoom works normally.
  // On mobile (or inside a WebView APK), all the anti-pinch-zoom / anti-
  // double-tap-zoom / anti-keyboard-zoom defenses are active as before.
  useEffect(() => {
    if (!isMobile) return

    const preventPinch = (e: TouchEvent) => {
      // Block multi-touch gestures (pinch zoom, two-finger scroll/zoom)
      if (e.touches.length > 1) {
        e.preventDefault()
      }
    }
    const preventGesture = (e: Event) => {
      // Block Safari iOS pinch gesture event
      e.preventDefault()
    }
    const preventWheelZoom = (e: WheelEvent) => {
      // Block Ctrl+wheel zoom (mobile browsers — trackpad pinch is rare but
      // possible on iPad/tablet with keyboard)
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
      }
    }
    const preventKeyZoom = (e: KeyboardEvent) => {
      // Block Ctrl+/- and Ctrl+0 zoom shortcuts (mobile browsers — relevant
      // when an external keyboard is attached to a tablet)
      if ((e.ctrlKey || e.metaKey) && ['+', '-', '=', '0'].includes(e.key)) {
        e.preventDefault()
      }
    }
    const preventDoubleTapZoom = (e: TouchEvent) => {
      // Block double-tap zoom on iOS Safari
      const now = Date.now()
      const last = (window as any).__lastTap || 0
      if (now - last < 300) {
        e.preventDefault()
      }
      ;(window as any).__lastTap = now
    }

    document.addEventListener('touchmove', preventPinch, { passive: false })
    document.addEventListener('gesturestart', preventGesture, { passive: false })
    document.addEventListener('gesturechange', preventGesture, { passive: false })
    document.addEventListener('gestureend', preventGesture, { passive: false })
    document.addEventListener('wheel', preventWheelZoom, { passive: false })
    document.addEventListener('keydown', preventKeyZoom)
    document.addEventListener('touchend', preventDoubleTapZoom, { passive: false })

    return () => {
      document.removeEventListener('touchmove', preventPinch)
      document.removeEventListener('gesturestart', preventGesture)
      document.removeEventListener('gesturechange', preventGesture)
      document.removeEventListener('gestureend', preventGesture)
      document.removeEventListener('wheel', preventWheelZoom)
      document.removeEventListener('keydown', preventKeyZoom)
      document.removeEventListener('touchend', preventDoubleTapZoom)
    }
  }, [isMobile])

  // Close mobile drawers when switching to desktop
  useEffect(() => {
    if (!isMobile) {
      setMobileSidebarOpen(false)
      setMobileAIOpen(false)
      setMobileTerminalOpen(false)
    }
  }, [isMobile, setMobileSidebarOpen, setMobileAIOpen, setMobileTerminalOpen])

  const activeTab = openTabs.find(t => t.id === activeTabId)
  const activeFile = activeTab ? files[activeTab.fileId] : null

  // Compute showPreview directly without effect
  // Show preview for HTML, XML, and IndoCode (which can contain HTML)
  const showPreview = activeFile?.language === 'html' || activeFile?.language === 'xml' || activeFile?.language === 'indocode'

  // Auto-close mobile preview when switching to non-previewable file
  // We intentionally only depend on `activeFile?.id` and `activeFile?.language`
  // (not the whole `activeFile` object) — otherwise this effect would re-run
  // every time the user types in the editor (since file content changes
  // produce a new activeFile reference), which would close the preview
  // mid-typing. The eslint-disable below silences the exhaustive-deps rule
  // for this intentional optimization.
  useEffect(() => {
    if (showPreviewMobile && activeFile && activeFile.language !== 'html' && activeFile.language !== 'xml' && activeFile.language !== 'indocode') {
      setShowPreviewMobile(false)
    }
     
  }, [activeFile?.id, activeFile?.language, showPreviewMobile, setShowPreviewMobile])

  const handleCursorChange = useCallback((pos: { line: number; column: number }) => {
    setCursorPos(pos)
  }, [])

  const handleLanguageChange = useCallback((lang: string) => {
    setLanguage(lang)
  }, [])

  const renderSidePanel = () => {
    switch (activeView) {
      case 'explorer': return <FileExplorer />
      case 'search': return <SearchPanel />
      case 'git': return <SourceControlPanel />
      case 'ai': return <AIAssistant />
      case 'snippets': return <SnippetsPanel />
      default: return <FileExplorer />
    }
  }

  if (!isHydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#1e1e1e] text-white animate-fade-in">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white mx-auto" />
          <p className="text-sm text-white/60 animate-pulse">Loading ZCode Studio...</p>
        </div>
      </div>
    )
  }

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="flex h-screen flex-col overflow-hidden bg-[var(--editor-bg)] pb-14 text-foreground">
        {/* Top Menu Bar */}
        <TopMenuBar />

        {/* Main content - editor + preview (toggleable) */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <EditorTabs />
          {activeFile && <EditorBreadcrumb fileId={activeFile.id} />}
          <MobileEditorToolbar editor={monacoEditor} />

          {/* Editor/Preview split - show preview when toggled for HTML files */}
          {showPreviewMobile && activeFile && (activeFile.language === 'html' || activeFile.language === 'xml' || activeFile.language === 'indocode') ? (
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 overflow-hidden border-b border-[var(--editor-border)]">
                <LivePreview
                  fileId={activeFile.id}
                  isMobile
                  onClose={() => setShowPreviewMobile(false)}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-hidden">
              <CodeEditor
                onCursorChange={handleCursorChange}
                onLanguageChange={handleLanguageChange}
                isMobile={isMobile}
                onReady={setMonacoEditor}
              />
            </div>
          )}
        </div>

        {/* Status Bar - simplified for mobile */}
        <MobileStatusBar cursorPos={cursorPos} language={language} />

        {/* Mobile overlays */}
        <MobileBottomNav />
        <MobileMenu />
        <MobileSidebar />
        <MobileAIModal />
        <MobileTerminal />

        {/* Shared modals */}
        <CommandPalette />
        <SettingsPanel />
        <RunPanel />
        <DeployDialog open={deployOpen} onOpenChange={(o) => setDeployOpen(o)} />
        <ShortcutsHelpModal />
        <PromptDialog />
        <AiCodeHelper />
        <AiQuickCode />
        <ApkEditor open={apkEditorOpen} onClose={() => setApkEditorOpen(false)} />
      </div>
    )
  }

  // Desktop Layout
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--editor-bg)] text-foreground">
      {/* Top Menu Bar */}
      <TopMenuBar />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Activity Bar */}
        <ActivityBar />

        {/* Resizable panels */}
        <div className="flex-1 overflow-hidden">
          <PanelGroup direction="horizontal" autoSaveId="zcode-main">
            {/* Side panel */}
            {sidebarVisible && (
              <>
                <Panel
                  id="sidebar"
                  order={1}
                  defaultSize={20}
                  minSize={12}
                  maxSize={40}
                  className="bg-[var(--side-bar-bg)]"
                >
                  {renderSidePanel()}
                </Panel>
                <PanelResizeHandle className="w-px bg-[var(--editor-border)] transition-colors hover:bg-[var(--list-hover)]" />
              </>
            )}

            {/* Editor + Bottom panel */}
            <Panel id="editor-area" order={2} minSize={30}>
              <PanelGroup direction="vertical" autoSaveId="zcode-editor">
                <Panel id="editor-main" order={1} minSize={20}>
                  <PanelGroup direction="horizontal" autoSaveId="zcode-editor-split">
                    <Panel id="editor" order={1} minSize={30}>
                      <div className="flex h-full flex-col bg-[var(--editor-bg)]">
                        <EditorTabs />
                        {activeFile && <EditorBreadcrumb fileId={activeFile.id} />}
                        <div className="flex-1 overflow-hidden">
                          <CodeEditor
                            onCursorChange={handleCursorChange}
                            onLanguageChange={handleLanguageChange}
                            isMobile={false}
                            onReady={setMonacoEditor}
                          />
                        </div>
                      </div>
                    </Panel>

                    {showPreview && activeFile && (
                      <>
                        <PanelResizeHandle className="w-px bg-[var(--editor-border)] transition-colors hover:bg-[var(--list-hover)]" />
                        <Panel id="preview" order={2} defaultSize={40} minSize={20}>
                          <LivePreview fileId={activeFile.id} />
                        </Panel>
                      </>
                    )}
                  </PanelGroup>
                </Panel>

                {terminalOpen && (
                  <>
                    <PanelResizeHandle className="h-px bg-[var(--editor-border)] transition-colors hover:bg-[var(--list-hover)]" />
                    <Panel
                      id="bottom"
                      order={2}
                      defaultSize={30}
                      minSize={10}
                      maxSize={70}
                    >
                      <BottomPanel />
                    </Panel>
                  </>
                )}
              </PanelGroup>
            </Panel>
          </PanelGroup>
        </div>
      </div>

      {/* Status Bar */}
      <StatusBar cursorPos={cursorPos} language={language} />

      {/* Modals & Overlays */}
      <CommandPalette />
      <SettingsPanel />
      <RunPanel />
      <DeployDialog open={deployOpen} onOpenChange={(o) => setDeployOpen(o)} />
      <ShortcutsHelpModal />
      <PromptDialog />
      <AiCodeHelper />
      <AiQuickCode />
      <ApkEditor open={apkEditorOpen} onClose={() => setApkEditorOpen(false)} />
    </div>
  )
}

// Mobile status bar - simplified
function MobileStatusBar({ cursorPos, language }: { cursorPos: { line: number; column: number }; language: string }) {
  const files = useEditorStore(s => s.files)
  const activeTabId = useEditorStore(s => s.activeTabId)
  const openTabs = useEditorStore(s => s.openTabs)
  const activeTab = openTabs.find(t => t.id === activeTabId)
  const activeFile = activeTab ? files[activeTab.fileId] : null
  const aiHelperOpen = useEditorStore(s => s.aiHelperOpen)
  const setAiHelperOpen = useEditorStore(s => s.setAiHelperOpen)
  const aiQuickCodeOpen = useEditorStore(s => s.aiQuickCodeOpen)
  const setAiQuickCodeOpen = useEditorStore(s => s.setAiQuickCodeOpen)

  if (!activeFile) {
    return (
      <div className="flex h-6 items-center justify-between border-t border-[var(--editor-border)] bg-[var(--title-bar-bg)] px-2 text-[10px] text-muted-foreground">
        <span className="font-medium">ZCode Studio</span>
        <div className="flex items-center gap-2">
          <button onClick={() => setAiHelperOpen(!aiHelperOpen)} className={aiHelperOpen ? 'text-blue-400 font-bold' : ''}>AI-Help</button>
          <button onClick={() => setAiQuickCodeOpen(!aiQuickCodeOpen)} className={aiQuickCodeOpen ? 'text-purple-400 font-bold' : ''}>AI-Code</button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-6 items-center justify-between border-t border-[var(--editor-border)] bg-[var(--title-bar-bg)] px-2 text-[10px] text-muted-foreground">
      <div className="flex items-center gap-2">
        <span className="font-medium capitalize">{language}</span>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => setAiHelperOpen(!aiHelperOpen)} className={aiHelperOpen ? 'text-blue-400 font-bold' : ''}>AI-Help</button>
        <button onClick={() => setAiQuickCodeOpen(!aiQuickCodeOpen)} className={aiQuickCodeOpen ? 'text-purple-400 font-bold' : ''}>AI-Code</button>
        <span>Ln {cursorPos.line}</span>
        <span>Col {cursorPos.column}</span>
      </div>
    </div>
  )
}
