'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import Editor, { type OnMount, type OnChange } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { useEditorStore } from '@/store/editor-store'
import { defineMonacoThemes, getMonacoOptions } from '@/lib/editor/themes'
import { registerIndoCodeLanguage } from '@/lib/editor/indocode'
import { Code2, FileText, Sparkles } from 'lucide-react'
import { FilePreview } from './file-preview'
import { isImageFile, isMarkdownFile } from '@/hooks/use-file-operations'
import { promptGoToLine } from '@/components/editor/prompt-dialog'
import { debouncedRequestCompletion, cancelPendingCompletion } from '@/lib/ai/inline-completion'

interface CodeEditorProps {
  onCursorChange?: (position: { line: number; column: number }) => void
  onLanguageChange?: (lang: string) => void
  isMobile?: boolean
  onUndo?: () => void
  onRedo?: () => void
  onFind?: () => void
  onFormat?: () => void
  onGoToLine?: () => void
  onReady?: (editor: editor.IStandaloneCodeEditor) => void
}

export function CodeEditor({
  onCursorChange, onLanguageChange, isMobile = false,
  onUndo, onRedo, onFind, onFormat, onGoToLine, onReady,
}: CodeEditorProps) {
  const activeTabId = useEditorStore(s => s.activeTabId)
  const openTabs = useEditorStore(s => s.openTabs)
  const files = useEditorStore(s => s.files)
  const settings = useEditorStore(s => s.settings)
  const theme = useEditorStore(s => s.theme)
  const updateFileContent = useEditorStore(s => s.updateFileContent)
  const markTabDirty = useEditorStore(s => s.markTabDirty)
  const setCommandPaletteOpen = useEditorStore(s => s.setCommandPaletteOpen)
  const setQuickOpenOpen = useEditorStore(s => s.setQuickOpenOpen)
  const setSettingsOpen = useEditorStore(s => s.setSettingsOpen)
  const setTerminalOpen = useEditorStore(s => s.setTerminalOpen)
  const setMobileTerminalOpen = useEditorStore(s => s.setMobileTerminalOpen)

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null)
  const [themesDefined, setThemesDefined] = useState(false)
  // Debounce timer for content updates - prevents lag when pasting large content
  const updateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastFileIdRef = useRef<string | null>(null)

  const activeTab = openTabs.find(t => t.id === activeTabId)
  const activeFile = activeTab ? files[activeTab.fileId] : null

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco
    defineMonacoThemes(monaco)
    registerIndoCodeLanguage(monaco)
    setThemesDefined(true)

    // === Multi-cursor shortcuts (Ctrl+D, Ctrl+Shift+L) ===
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyD, () => {
      editor.trigger('', 'editor.action.addSelectionToNextFindMatch', null)
    })
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyL, () => {
      editor.trigger('', 'editor.action.selectHighlights', null)
    })

    // === AI Inline Completion (Copilot-style) ===
    // Only trigger on content change, not every cursor move
    // Uses debounced API call (800ms) to avoid spamming
    let lastCompletionRequest = 0
    monaco.languages.registerInlineCompletionsProvider('*', {
      provideInlineCompletions: async (model, position) => {
        if (isMobile) return { items: [] }

        // Rate limit: max 1 request per 2 seconds
        const now = Date.now()
        if (now - lastCompletionRequest < 2000) return { items: [] }
        lastCompletionRequest = now

        const code = model.getValue()
        // Only suggest for substantial code (> 20 chars)
        if (code.trim().length < 20) return { items: [] }

        // Only suggest for code languages, not plaintext
        const language = model.getLanguageId?.() || 'plaintext'
        if (language === 'plaintext' || language === 'markdown') return { items: [] }

        // Get the line at cursor position
        const lineContent = model.getLineContent(position.lineNumber)
        // Only suggest if cursor is at end of a line with content
        if (lineContent.trim().length < 3) return { items: [] }

        return new Promise((resolve) => {
          debouncedRequestCompletion(
            { code, language, fileName: activeFile?.name || 'untitled' },
            (response) => {
              if (response.suggestion && response.suggestion.length > 5) {
                resolve({
                  items: [{
                    insertText: response.suggestion,
                    range: {
                      startLineNumber: position.lineNumber,
                      startColumn: position.column,
                      endLineNumber: position.lineNumber,
                      endColumn: position.column,
                    },
                  }],
                })
              } else {
                resolve({ items: [] })
              }
            }
          )
        })
      },
      freeInlineCompletions: () => {},
    })

    // Keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyP, () => {
      setCommandPaletteOpen(true)
    })
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyP, () => {
      setQuickOpenOpen(true)
    })
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Comma, () => {
      setSettingsOpen(true)
    })
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Backquote, () => {
      if (isMobile) {
        setMobileTerminalOpen(!useEditorStore.getState().mobileTerminalOpen)
      } else {
        setTerminalOpen(!useEditorStore.getState().terminalOpen)
      }
    })

    // Add editor actions for undo/redo/find/format - exposed via callbacks
    editor.addAction({
      id: 'zcode-undo',
      label: 'Undo',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyZ],
      run: async () => { editor.trigger('', 'undo', null); onUndo?.() },
    })
    editor.addAction({
      id: 'zcode-redo',
      label: 'Redo',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyZ],
      run: async () => { editor.trigger('', 'redo', null); onRedo?.() },
    })
    editor.addAction({
      id: 'zcode-find',
      label: 'Find',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF],
      run: async () => { editor.trigger('', 'actions.find', null); onFind?.() },
    })
    editor.addAction({
      id: 'zcode-find-replace',
      label: 'Find & Replace',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyH],
      run: async () => {
        editor.trigger('', 'editor.action.startFindReplaceAction', null)
        onFind?.()
      },
    })
    editor.addAction({
      id: 'zcode-format',
      label: 'Format Document',
      keybindings: [monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF],
      run: async () => { editor.getAction('editor.action.formatDocument')?.run(); onFormat?.() },
    })
    editor.addAction({
      id: 'zcode-goto-line',
      label: 'Go to Line...',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyG],
      run: async () => {
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
        onGoToLine?.()
      },
    })

    editor.onDidChangeCursorPosition((e) => {
      onCursorChange?.({ line: e.position.lineNumber, column: e.position.column })
    })

    onLanguageChange?.(activeFile?.language || 'plaintext')
    onReady?.(editor)
  }

  const handleChange: OnChange = (value) => {
    if (!activeFile || value === undefined) return

    // Clear previous timer
    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current)
    }

    // For small changes (< 100 chars diff), update immediately for responsiveness
    // For large changes (paste), debounce to prevent lag
    const currentContent = activeFile.content || ''
    const diffSize = Math.abs(value.length - currentContent.length)

    if (diffSize < 100) {
      updateFileContent(activeFile.id, value)
      // Mark tab as dirty (unsaved to device) — user can see the indicator
      if (value !== currentContent) {
        markTabDirty(activeFile.id, true)
      }
    } else {
      // Large change - debounce 300ms
      updateTimerRef.current = setTimeout(() => {
        updateFileContent(activeFile.id, value)
        markTabDirty(activeFile.id, true)
        updateTimerRef.current = null
      }, 300)
    }
  }

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current)
      }
      cancelPendingCompletion()
    }
  }, [])

  // Flush pending update when switching files
  useEffect(() => {
    if (lastFileIdRef.current && lastFileIdRef.current !== activeFile?.id) {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current)
        updateTimerRef.current = null
      }
    }
    lastFileIdRef.current = activeFile?.id || null
  }, [activeFile?.id])

  // Depend on `activeFile?.id` and `?.language` (not the whole activeFile) —
  // otherwise the effect would re-run every time the user types.
  useEffect(() => {
    if (activeFile) {
      onLanguageChange?.(activeFile.language || 'plaintext')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFile?.id, activeFile?.language, onLanguageChange])

  if (!activeFile) {
    return <WelcomeScreen />
  }

  // For image files, render image preview instead of Monaco
  if (isImageFile(activeFile.name)) {
    return <FilePreview fileId={activeFile.id} />
  }

  // For markdown files, render markdown preview with toggle
  if (isMarkdownFile(activeFile.name)) {
    return <FilePreview fileId={activeFile.id} />
  }

  return (
    <div className="relative h-full w-full bg-[var(--editor-bg)]">
      <Editor
        height="100%"
        path={activeFile.id}
        language={activeFile.language}
        value={activeFile.content}
        theme={theme}
        onMount={handleMount}
        onChange={handleChange}
        options={getMonacoOptions(settings, isMobile)}
        loading={
          <div className="flex h-full items-center justify-center bg-[var(--editor-bg)]">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Code2 className="h-5 w-5 animate-pulse" />
              <span className="text-sm">Loading editor...</span>
            </div>
          </div>
        }
        beforeMount={(monaco) => {
          defineMonacoThemes(monaco)
          registerIndoCodeLanguage(monaco)
        }}
      />
    </div>
  )
}

function WelcomeScreen() {
  const openTab = useEditorStore(s => s.openTab)
  const files = useEditorStore(s => s.files)
  const rootFileIds = useEditorStore(s => s.rootFileIds)
  const setCommandPaletteOpen = useEditorStore(s => s.setCommandPaletteOpen)
  const setSettingsOpen = useEditorStore(s => s.setSettingsOpen)
  const setMobileAIOpen = useEditorStore(s => s.setMobileAIOpen)

  // Find README
  const readmeId = rootFileIds.find(id => files[id]?.name.toLowerCase().includes('readme'))
  const recentFiles = rootFileIds
    .map(id => files[id])
    .filter(f => f && f.type === 'file')
    .slice(0, 6)

  return (
    <div className="flex h-full w-full items-center justify-center bg-[var(--editor-bg)] p-4 md:p-8">
      <div className="w-full max-w-md text-center animate-fade-in">
        <div className="mb-4 flex justify-center md:mb-6">
          <div className="relative">
            <div className="absolute -inset-4 rounded-full bg-foreground/20 blur-2xl animate-pulse" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--list-hover)] md:h-20 md:w-20 animate-scale-in">
              <Code2 className="h-8 w-8 text-white md:h-10 md:w-10" strokeWidth={1.5} />
            </div>
          </div>
        </div>

        <h1 className="mb-2 text-3xl font-bold md:text-4xl">
          ZCode Studio
        </h1>
        <p className="mb-6 text-sm text-muted-foreground md:mb-8 md:text-base">
          A powerful web-based code editor inspired by Acode
        </p>

        {/* Mobile: Quick Action Cards */}
        <div className="mb-4 grid grid-cols-2 gap-2 md:hidden">
          <button
            onClick={() => readmeId && openTab(readmeId, false)}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-[var(--editor-border)] bg-[var(--side-bar-bg)] p-3 transition-all active:scale-95"
          >
            <FileText className="h-5 w-5 text-foreground" />
            <span className="text-xs font-medium">README</span>
          </button>
          <button
            onClick={() => setMobileAIOpen(true)}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-[var(--editor-border)] bg-[var(--side-bar-bg)] p-3 transition-all active:scale-95"
          >
            <Sparkles className="h-5 w-5 text-foreground" />
            <span className="text-xs font-medium">Ask AI</span>
          </button>
        </div>

        <div className="rounded-xl border border-[var(--editor-border)] bg-[var(--side-bar-bg)] p-3 text-left md:hidden">
          <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold">
            <FileText className="h-4 w-4 text-foreground" />
            Recent Files
          </h3>
          <div className="space-y-0.5 text-xs">
            {recentFiles.slice(0, 4).map(file => (
              <button
                key={file.id}
                onClick={() => openTab(file.id, false)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-muted-foreground active:bg-[var(--list-hover)] active:text-foreground"
              >
                <FileText className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{file.name}</span>
              </button>
            ))}
            {recentFiles.length === 0 && (
              <p className="px-2 py-2 text-muted-foreground">No recent files</p>
            )}
          </div>
        </div>

        {/* Desktop: Quick Start + Recent */}
        <div className="hidden gap-4 sm:grid-cols-2 md:grid">
          <div className="rounded-xl border border-[var(--editor-border)] bg-[var(--side-bar-bg)] p-4 text-left">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-foreground" />
              Quick Start
            </h3>
            <div className="space-y-1 text-xs text-muted-foreground">
              <button
                onClick={() => readmeId && openTab(readmeId, false)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 hover:bg-[var(--list-hover)] hover:text-foreground"
              >
                <FileText className="h-3.5 w-3.5" /> Open README.md
              </button>
              <button
                onClick={() => setCommandPaletteOpen(true)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 hover:bg-[var(--list-hover)] hover:text-foreground"
              >
                <kbd className="rounded bg-[var(--input-bg)] px-1.5 py-0.5 text-[10px]">⌘⇧P</kbd>
                <span>Command Palette</span>
              </button>
              <button
                onClick={() => setSettingsOpen(true)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 hover:bg-[var(--list-hover)] hover:text-foreground"
              >
                <kbd className="rounded bg-[var(--input-bg)] px-1.5 py-0.5 text-[10px]">⌘,</kbd>
                <span>Open Settings</span>
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--editor-border)] bg-[var(--side-bar-bg)] p-4 text-left">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <FileText className="h-4 w-4 text-foreground" />
              Recent Files
            </h3>
            <div className="space-y-1 text-xs">
              {recentFiles.slice(0, 4).map(file => (
                <button
                  key={file.id}
                  onClick={() => openTab(file.id, false)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-muted-foreground hover:bg-[var(--list-hover)] hover:text-foreground"
                >
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{file.name}</span>
                </button>
              ))}
              {recentFiles.length === 0 && (
                <p className="px-2 py-1.5 text-muted-foreground">No recent files</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
