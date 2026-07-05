'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Command, FilePlus, FolderPlus, Settings as SettingsIcon, Terminal as TerminalIcon,
  Search as SearchIcon, RotateCcw, Download, Save, X, ChevronRight,
  Github, Bot, BookMarked, Files, GitBranch, ShieldCheck,
  type LucideIcon,
} from 'lucide-react'
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator, CommandShortcut,
} from '@/components/ui/command'
import { useEditorStore } from '@/store/editor-store'
import { promptFileName, promptFolderName } from '@/components/editor/prompt-dialog'
import { BugScanDialog } from '@/components/editor/bug-scan-dialog'

export function CommandPalette() {
  const open = useEditorStore(s => s.commandPaletteOpen)
  const setOpen = useEditorStore(s => s.setCommandPaletteOpen)
  const quickOpenOpen = useEditorStore(s => s.quickOpenOpen)
  const setQuickOpenOpen = useEditorStore(s => s.setQuickOpenOpen)
  const files = useEditorStore(s => s.files)
  const openTab = useEditorStore(s => s.openTab)
  const createFile = useEditorStore(s => s.createFile)
  const createFolder = useEditorStore(s => s.createFolder)
  const setSettingsOpen = useEditorStore(s => s.setSettingsOpen)
  const setTerminalOpen = useEditorStore(s => s.setTerminalOpen)
  const setActiveView = useEditorStore(s => s.setActiveView)
  const setAiHelperOpen = useEditorStore(s => s.setAiHelperOpen)
  const closeAllTabs = useEditorStore(s => s.closeAllTabs)
  const [scanOpen, setScanOpen] = useState(false)

  const close = () => {
    setOpen(false)
    setQuickOpenOpen(false)
  }

  const allFiles = Object.values(files).filter(f => f.type === 'file')

  const handleCommand = async (action: () => void) => {
    close()
    setTimeout(action, 50)
  }

  return (
    <>
      <CommandDialog open={open} onOpenChange={(o) => { if (!o) close() }}>
        <CommandInput placeholder="Ketik perintah atau cari..." />
        <CommandList className="max-h-[60vh] md:max-h-[400px]">
          <CommandEmpty>Tidak ada hasil.</CommandEmpty>

          <CommandGroup heading="File">
            <CommandItem onSelect={() => handleCommand(() => setQuickOpenOpen(true))}>
              <SearchIcon className="mr-2 h-4 w-4" />
              <span>Buka File...</span>
              <CommandShortcut>⌘P</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => handleCommand(async () => {
              const name = await promptFileName()
              if (name) {
                const id = createFile(name, null)
                openTab(id, false)
              }
            })}>
              <FilePlus className="mr-2 h-4 w-4" />
              <span>File Baru</span>
              <CommandShortcut>⌘N</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => handleCommand(async () => {
              const name = await promptFolderName()
              if (name) createFolder(name, null)
            })}>
              <FolderPlus className="mr-2 h-4 w-4" />
              <span>Folder Baru</span>
              <CommandShortcut>⌘⇧N</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => handleCommand(() => closeAllTabs())}>
              <X className="mr-2 h-4 w-4" />
              <span>Tutup Semua Tab</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Tampilan">
            <CommandItem onSelect={() => handleCommand(() => setActiveView('explorer'))}>
              <Files className="mr-2 h-4 w-4" />
              <span>Tampilkan Explorer</span>
            </CommandItem>
            <CommandItem onSelect={() => handleCommand(() => setActiveView('search'))}>
              <SearchIcon className="mr-2 h-4 w-4" />
              <span>Tampilkan Pencarian</span>
            </CommandItem>
            <CommandItem onSelect={() => handleCommand(() => setActiveView('git'))}>
              <GitBranch className="mr-2 h-4 w-4" />
              <span>Tampilkan Source Control</span>
            </CommandItem>
            <CommandItem onSelect={() => handleCommand(() => setActiveView('ai'))}>
              <Bot className="mr-2 h-4 w-4" />
              <span>Tampilkan AI Assistant</span>
            </CommandItem>
            <CommandItem onSelect={() => handleCommand(() => setActiveView('snippets'))}>
              <BookMarked className="mr-2 h-4 w-4" />
              <span>Tampilkan Snippets</span>
            </CommandItem>
            <CommandItem onSelect={() => handleCommand(() => setTerminalOpen(true))}>
              <TerminalIcon className="mr-2 h-4 w-4" />
              <span>Toggle Terminal</span>
              <CommandShortcut>⌘`</CommandShortcut>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Preferensi">
            <CommandItem onSelect={() => handleCommand(() => setSettingsOpen(true))}>
              <SettingsIcon className="mr-2 h-4 w-4" />
              <span>Buka Pengaturan</span>
              <CommandShortcut>⌘,</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => handleCommand(() => setScanOpen(true))}>
              <ShieldCheck className="mr-2 h-4 w-4" />
              <span>Scan Semua File untuk Bug</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="File Terbaru">
            {allFiles.slice(0, 8).map(file => (
              <CommandItem
                key={file.id}
                onSelect={() => handleCommand(() => openTab(file.id, false))}
              >
                <FilePlus className="mr-2 h-4 w-4" />
                <span>{file.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      {/* Quick Open */}
      <CommandDialog open={quickOpenOpen} onOpenChange={(o) => { if (!o) close() }}>
        <CommandInput placeholder="Cari file berdasarkan nama..." />
        <CommandList className="max-h-[60vh] md:max-h-[400px]">
          <CommandEmpty>Tidak ada file ditemukan.</CommandEmpty>
          <CommandGroup heading="File">
            {allFiles.map(file => (
              <CommandItem
                key={file.id}
                onSelect={() => handleCommand(() => openTab(file.id, false))}
                className="flex items-center gap-2"
              >
                <FilePlus className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{file.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {file.language}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      {/* Bug Scanner Dialog */}
      <BugScanDialog open={scanOpen} onOpenChange={setScanOpen} />
    </>
  )
}

function CheckIcon() {
  return <ChevronRight className="ml-auto h-4 w-4" />
}
