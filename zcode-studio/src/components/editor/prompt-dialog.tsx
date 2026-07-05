'use client'

import { useState, useEffect, useRef } from 'react'
import { FilePlus, FolderPlus, ArrowRight } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

type DialogType = 'file' | 'folder' | 'goto'

interface PromptDialogState {
  open: boolean
  type: DialogType
  resolve: ((value: string | null) => void) | null
}

// Module-level state + listeners (simple pub-sub)
let dialogState: PromptDialogState = { open: false, type: 'file', resolve: null }
const listeners: Set<() => void> = new Set()

function notify() {
  // Use setTimeout(0) to ensure React state updates happen outside event handler
  setTimeout(() => {
    listeners.forEach(fn => fn())
  }, 0)
}

export function showPromptDialog(type: DialogType): Promise<string | null> {
  return new Promise((resolve) => {
    dialogState = { open: true, type, resolve }
    notify()
  })
}

export function PromptDialog() {
  // Use state to track open + type so re-render happens on notify
  const [isOpen, setIsOpen] = useState(false)
  const [dialogType, setDialogType] = useState<DialogType>('file')
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const resolveRef = useRef<((value: string | null) => void) | null>(null)

  useEffect(() => {
    const listener = () => {
      setIsOpen(dialogState.open)
      setDialogType(dialogState.type)
      resolveRef.current = dialogState.resolve
      if (dialogState.open) {
        setValue('')
        setTimeout(() => {
          inputRef.current?.focus()
          inputRef.current?.select()
        }, 50)
      }
    }
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  }, [])

  const handleClose = () => {
    resolveRef.current?.(null)
    dialogState = { open: false, type: 'file', resolve: null }
    setIsOpen(false)
  }

  const handleConfirm = () => {
    const v = value.trim()
    resolveRef.current?.(v || null)
    dialogState = { open: false, type: 'file', resolve: null }
    setIsOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleConfirm() }
    else if (e.key === 'Escape') { e.preventDefault(); handleClose() }
  }

  const config = {
    file: { title: 'File Baru', icon: FilePlus, placeholder: 'namafile.html', confirm: 'Buat File' },
    folder: { title: 'Folder Baru', icon: FolderPlus, placeholder: 'nama-folder', confirm: 'Buat Folder' },
    goto: { title: 'Ke Baris', icon: ArrowRight, placeholder: '42', confirm: 'Ke Baris' },
  }[dialogType]

  const Icon = config.icon

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent className="w-full max-w-md overflow-hidden p-0 sm:rounded-2xl">
        <DialogHeader className="border-b border-[var(--editor-border)] px-5 py-4">
          <DialogTitle className="flex items-center gap-2.5 text-base">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--list-hover)]">
              <Icon className="h-4 w-4" />
            </div>
            {config.title}
          </DialogTitle>
        </DialogHeader>
        <div className="p-5">
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={config.placeholder}
            className="bg-[var(--input-bg)] text-sm"
            autoComplete="off"
            spellCheck={false}
          />
          <div className="mt-4 flex gap-2">
            <Button variant="outline" onClick={handleClose} className="flex-1">Batal</Button>
            <Button onClick={handleConfirm} disabled={!value.trim()} className="flex-1">{config.confirm}</Button>
          </div>
          <p className="mt-3 text-center text-[10px] text-muted-foreground">
            <kbd className="rounded bg-[var(--input-bg)] px-1 py-0.5">Enter</kbd> konfirmasi ·{' '}
            <kbd className="rounded bg-[var(--input-bg)] px-1 py-0.5">Esc</kbd> batal
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export async function promptFileName(): Promise<string | null> {
  return showPromptDialog('file')
}

export async function promptFolderName(): Promise<string | null> {
  return showPromptDialog('folder')
}

export async function promptGoToLine(): Promise<string | null> {
  return showPromptDialog('goto')
}
