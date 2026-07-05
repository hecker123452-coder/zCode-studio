'use client'

import { useState, useRef, useEffect } from 'react'
import {
  ChevronRight, ChevronDown, FilePlus, FolderPlus, RefreshCw,
  MoreHorizontal, Trash2, Pencil, Copy, Download, Upload,
  Files, FileType2, ArrowDownAZ, ArrowUpAZ, Clock, CopyPlus,
  HardDriveDownload, Check,
} from 'lucide-react'
import { useEditorStore, type FileNode } from '@/store/editor-store'
import { getFileIcon } from '@/lib/editor/file-icons'
import { cn } from '@/lib/utils'
import { useFileOperations } from '@/hooks/use-file-operations'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel,
  DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ContextMenu, ContextMenuContent, ContextMenuItem,
  ContextMenuSeparator, ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { toast } from 'sonner'
import { FILE_TEMPLATES, TEMPLATE_CATEGORIES, type FileTemplate } from '@/lib/editor/file-templates'

type SortMode = 'name-asc' | 'name-desc' | 'modified-desc'

export function FileExplorer() {
  const rootFileIds = useEditorStore(s => s.rootFileIds)
  const files = useEditorStore(s => s.files)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [creatingIn, setCreatingIn] = useState<{ parentId: string | null; type: 'file' | 'folder' } | null>(null)
  const [sortMode, setSortMode] = useState<SortMode>('name-asc')
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false)
  const { openFromDeviceFSAccess } = useFileOperations()

  const sortFileIds = (fileIds: string[]): string[] => {
    const sorted = [...fileIds].sort((a, b) => {
      const fa = files[a]
      const fb = files[b]
      if (!fa || !fb) return 0
      // Folders always first (except in modified-desc)
      if (sortMode !== 'modified-desc' && fa.type !== fb.type) {
        return fa.type === 'folder' ? -1 : 1
      }
      if (sortMode === 'name-asc') return fa.name.localeCompare(fb.name)
      if (sortMode === 'name-desc') return fb.name.localeCompare(fa.name)
      if (sortMode === 'modified-desc') return fb.updatedAt - fa.updatedAt
      return 0
    })
    return sorted
  }

  const renderTree = (fileIds: string[], depth = 0) => {
    return sortFileIds(fileIds).map(id => {
      const file = files[id]
      if (!file) return null
      return (
        <FileTreeItem
          key={id}
          file={file}
          depth={depth}
          renamingId={renamingId}
          setRenamingId={setRenamingId}
          onCreateIn={setCreatingIn}
          sortMode={sortMode}
          sortFileIds={sortFileIds}
        >
          {file.type === 'folder' && file.expanded && file.children && file.children.length > 0 && (
            renderTree(file.children, depth + 1)
          )}
        </FileTreeItem>
      )
    })
  }

  return (
    <div className="flex h-full flex-col bg-[var(--side-bar-bg)]">
      {/* Header */}
      <div className="flex h-9 items-center justify-between px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span>Explorer</span>
        <div className="flex items-center gap-0.5">
          {/* Sort dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded p-1 hover:bg-[var(--list-hover)]" title="Sort">
                <ArrowDownAZ className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel className="text-xs">Urutkan</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSortMode('name-asc')}>
                <ArrowDownAZ className="mr-2 h-3.5 w-3.5" /> Nama (A-Z)
                {sortMode === 'name-asc' && <CheckIcon />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortMode('name-desc')}>
                <ArrowUpAZ className="mr-2 h-3.5 w-3.5" /> Nama (Z-A)
                {sortMode === 'name-desc' && <CheckIcon />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortMode('modified-desc')}>
                <Clock className="mr-2 h-3.5 w-3.5" /> Diubah Terakhir
                {sortMode === 'modified-desc' && <CheckIcon />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Main actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded p-1 hover:bg-[var(--list-hover)]">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="text-xs">Aksi</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setCreatingIn({ parentId: null, type: 'file' })}>
                <FilePlus className="mr-2 h-4 w-4" /> File Baru
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTemplatePickerOpen(true)}>
                <FileType2 className="mr-2 h-4 w-4" /> Dari Template
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCreatingIn({ parentId: null, type: 'folder' })}>
                <FolderPlus className="mr-2 h-4 w-4" /> Folder Baru
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => openFromDeviceFSAccess()}>
                <Upload className="mr-2 h-4 w-4" /> Buka dari Perangkat
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                const projectData = {
                  version: '1.0.0',
                  exportedAt: new Date().toISOString(),
                  files: Object.values(files).map(f => ({
                    name: f.name, type: f.type, content: f.content, language: f.language,
                  })),
                }
                const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url; a.download = `zcode-project-${Date.now()}.json`
                a.click(); URL.revokeObjectURL(url)
                toast.success('Project diekspor')
              }}>
                <Download className="mr-2 h-4 w-4" /> Ekspor Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1 px-2 pb-1">
        <button
          onClick={() => setCreatingIn({ parentId: null, type: 'file' })}
          className="rounded p-1 text-muted-foreground hover:bg-[var(--list-hover)] hover:text-foreground"
          title="File Baru"
        >
          <FilePlus className="h-4 w-4" />
        </button>
        <button
          onClick={() => setTemplatePickerOpen(true)}
          className="rounded p-1 text-muted-foreground hover:bg-[var(--list-hover)] hover:text-foreground"
          title="Dari Template"
        >
          <FileType2 className="h-4 w-4" />
        </button>
        <button
          onClick={() => setCreatingIn({ parentId: null, type: 'folder' })}
          className="rounded p-1 text-muted-foreground hover:bg-[var(--list-hover)] hover:text-foreground"
          title="Folder Baru"
        >
          <FolderPlus className="h-4 w-4" />
        </button>
        <button
          onClick={() => openFromDeviceFSAccess()}
          className="rounded p-1 text-muted-foreground hover:bg-[var(--list-hover)] hover:text-foreground"
          title="Buka dari Perangkat"
        >
          <HardDriveDownload className="h-4 w-4" />
        </button>
        <button
          className="ml-auto rounded p-1 text-muted-foreground hover:bg-[var(--list-hover)] hover:text-foreground"
          title="Segarkan"
          onClick={() => toast.info('Pohon file disegarkan')}
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden pb-4 [scrollbar-width:thin]">
        {creatingIn && creatingIn.parentId === null && (
          <CreateInput
            type={creatingIn.type}
            depth={0}
            onDone={() => setCreatingIn(null)}
          />
        )}
        {rootFileIds.length === 0 && !creatingIn ? (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">
            <Files className="mx-auto mb-2 h-8 w-8 opacity-30" />
            <p className="mb-3">Belum ada file.</p>
            <button
              onClick={() => openFromDeviceFSAccess()}
              className="rounded-lg bg-[var(--list-hover)] px-3 py-1.5 text-xs font-medium text-foreground hover:bg-[var(--list-active)]"
            >
              Buka dari Perangkat
            </button>
          </div>
        ) : (
          renderTree(rootFileIds)
        )}
      </div>

      {/* Template Picker Modal */}
      {templatePickerOpen && (
        <TemplatePicker
          onClose={() => setTemplatePickerOpen(false)}
        />
      )}
    </div>
  )
}

function CheckIcon() {
  return <Check className="ml-auto h-3.5 w-3.5 text-foreground" />
}

interface FileTreeItemProps {
  file: FileNode
  depth: number
  renamingId: string | null
  setRenamingId: (id: string | null) => void
  onCreateIn: (data: { parentId: string | null; type: 'file' | 'folder' }) => void
  sortMode: SortMode
  sortFileIds: (ids: string[]) => string[]
  children?: React.ReactNode
}

function FileTreeItem({ file, depth, renamingId, setRenamingId, onCreateIn, sortMode, sortFileIds, children }: FileTreeItemProps) {
  const toggleFolder = useEditorStore(s => s.toggleFolder)
  const openTab = useEditorStore(s => s.openTab)
  const deleteFile = useEditorStore(s => s.deleteFile)
  const renameFile = useEditorStore(s => s.renameFile)
  const duplicateFile = useEditorStore(s => s.duplicateFile)
  const activeTabId = useEditorStore(s => s.activeTabId)
  const openTabs = useEditorStore(s => s.openTabs)
  const { saveToDevice, saveAsToDevice } = useFileOperations()
  const [showCreateChild, setShowCreateChild] = useState<'file' | 'folder' | null>(null)

  const isActive = openTabs.some(t => t.fileId === file.id && t.id === activeTabId)
  const isOpen = openTabs.some(t => t.fileId === file.id)

  const isRenaming = renamingId === file.id
  const iconInfo = getFileIcon(file.name)
  const Icon = iconInfo.icon

  const handleClick = () => {
    if (file.type === 'folder') {
      toggleFolder(file.id)
    } else {
      openTab(file.id, true)
    }
  }

  const handleDuplicate = () => {
    const newId = duplicateFile(file.id)
    if (newId) {
      toast.success(`Diduplikat: ${file.name}`)
    }
  }

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            onClick={handleClick}
            onDoubleClick={() => file.type === 'file' && openTab(file.id, false)}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            className={cn(
              'group flex h-9 cursor-pointer items-center gap-1 pr-2 text-sm transition-colors md:h-[26px]',
              'hover:bg-[var(--list-hover)] active:bg-[var(--list-active)]',
              isActive && 'bg-[var(--list-active)]',
              isOpen && !isActive && 'text-foreground',
              !isOpen && !isActive && 'text-[var(--list-foreground)]'
            )}
          >
            {file.type === 'folder' ? (
              file.expanded ? (
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              )
            ) : (
              <span className="w-3.5 shrink-0" />
            )}

            <Icon
              className="h-4 w-4 shrink-0"
              style={{ color: iconInfo.color }}
              strokeWidth={1.5}
            />

            {isRenaming ? (
              <RenameInput
                initial={file.name}
                onDone={(newName) => {
                  if (newName && newName !== file.name) {
                    renameFile(file.id, newName)
                  }
                  setRenamingId(null)
                }}
              />
            ) : (
              <span className="truncate text-[13px]">{file.name}</span>
            )}

            {file.type === 'file' && file.fileHandle && (
              <span className="ml-auto shrink-0 text-[9px] text-muted-foreground" title="Linked to device"></span>
            )}
            {file.type === 'file' && isOpen && !file.fileHandle && (
              <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-foreground opacity-60" />
            )}
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent className="w-52">
          {file.type === 'folder' ? (
            <>
              <ContextMenuItem onClick={() => { toggleFolder(file.id); setShowCreateChild('file') }}>
                <FilePlus className="mr-2 h-4 w-4" /> File Baru
              </ContextMenuItem>
              <ContextMenuItem onClick={() => { toggleFolder(file.id); setShowCreateChild('folder') }}>
                <FolderPlus className="mr-2 h-4 w-4" /> Folder Baru
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          ) : (
            <>
              <ContextMenuItem onClick={() => openTab(file.id, false)}>
                <FilePlus className="mr-2 h-4 w-4" /> Buka
              </ContextMenuItem>
              <ContextMenuItem onClick={handleDuplicate}>
                <CopyPlus className="mr-2 h-4 w-4" /> Duplikat
              </ContextMenuItem>
              <ContextMenuItem onClick={() => saveToDevice(file.id)}>
                <Download className="mr-2 h-4 w-4" /> Simpan ke Perangkat
              </ContextMenuItem>
              <ContextMenuItem onClick={() => saveAsToDevice(file.id)}>
                <Download className="mr-2 h-4 w-4" /> Simpan Sebagai...
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={() => navigator.clipboard?.writeText(file.content || '')}>
                <Copy className="mr-2 h-4 w-4" /> Salin Konten
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          )}
          <ContextMenuItem onClick={() => setRenamingId(file.id)}>
            <Pencil className="mr-2 h-4 w-4" /> Ubah Nama
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => deleteFile(file.id)}
            className="text-foreground"
          >
            <Trash2 className="mr-2 h-4 w-4" /> Hapus
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {showCreateChild && file.type === 'folder' && file.expanded && (
        <CreateInput
          type={showCreateChild}
          depth={depth + 1}
          parentId={file.id}
          onDone={() => setShowCreateChild(null)}
        />
      )}

      {children}
    </>
  )
}

interface CreateInputProps {
  type: 'file' | 'folder'
  depth: number
  parentId?: string | null
  onDone: () => void
}

function CreateInput({ type, depth, parentId = null, onDone }: CreateInputProps) {
  const createFile = useEditorStore(s => s.createFile)
  const createFolder = useEditorStore(s => s.createFolder)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const handleSubmit = (value: string) => {
    if (value.trim()) {
      if (type === 'file') {
        const id = createFile(value.trim(), parentId)
        useEditorStore.getState().openTab(id, false)
      } else {
        createFolder(value.trim(), parentId)
      }
    }
    onDone()
  }

  return (
    <div
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
      className="flex h-[26px] items-center gap-1 pr-2"
    >
      <span className="w-3.5 shrink-0" />
      {type === 'folder' ? (
        <FolderPlus className="h-4 w-4 shrink-0 text-muted-foreground" />
      ) : (
        <FilePlus className="h-4 w-4 shrink-0 text-muted-foreground" />
      )}
      <input
        ref={inputRef}
        placeholder={type === 'file' ? 'filename.ext' : 'folder name'}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleSubmit((e.target as HTMLInputElement).value)
          } else if (e.key === 'Escape') {
            onDone()
          }
        }}
        onBlur={(e) => handleSubmit(e.target.value)}
        className="w-full bg-[var(--input-bg)] px-1.5 py-0.5 text-[13px] outline-none ring-1 ring-primary"
      />
    </div>
  )
}

interface RenameInputProps {
  initial: string
  onDone: (value: string) => void
}

function RenameInput({ initial, onDone }: RenameInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  return (
    <input
      ref={inputRef}
      defaultValue={initial}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          onDone((e.target as HTMLInputElement).value)
        } else if (e.key === 'Escape') {
          onDone(initial)
        }
      }}
      onBlur={(e) => onDone(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      className="w-full bg-[var(--input-bg)] px-1.5 py-0.5 text-[13px] outline-none ring-1 ring-primary"
    />
  )
}

// ============== Template Picker Modal ==============

function TemplatePicker({ onClose }: { onClose: () => void }) {
  const importFile = useEditorStore(s => s.importFile)
  const openTab = useEditorStore(s => s.openTab)
  const [category, setCategory] = useState<string>('web')

  const filtered = FILE_TEMPLATES.filter(t => t.category === category)

  const handleSelect = (tpl: FileTemplate) => {
    const id = importFile(tpl.filename, tpl.content, null, { language: undefined })
    openTab(id, false)
    toast.success(`Buat ${tpl.filename} dari template ${tpl.icon}`)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-2xl border border-[var(--editor-border)] bg-[var(--side-bar-bg)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-12 items-center justify-between border-b border-[var(--editor-border)] px-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <FileType2 className="h-4 w-4" /> Dari Template
          </h2>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-[var(--list-hover)]"></button>
        </div>

        <div className="flex flex-col md:flex-row">
          {/* Categories */}
          <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible border-b md:border-b-0 md:border-r border-[var(--editor-border)] p-2 md:w-40 shrink-0">
            {Object.entries(TEMPLATE_CATEGORIES).map(([key, cat]) => (
              <button
                key={key}
                onClick={() => setCategory(key)}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors',
                  category === key
                    ? 'bg-[var(--list-hover)] text-foreground'
                    : 'text-muted-foreground hover:bg-[var(--list-hover)]'
                )}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Templates */}
          <div className="flex-1 overflow-y-auto p-3 max-h-[60vh] md:max-h-[70vh]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filtered.map(tpl => (
                <button
                  key={tpl.id}
                  onClick={() => handleSelect(tpl)}
                  className="flex items-start gap-3 rounded-xl border border-[var(--editor-border)] bg-[var(--input-bg)] p-3 text-left transition-all hover:border-[var(--list-active)] hover:bg-[var(--list-hover)] active:scale-[0.98]"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--list-hover)] text-xl">
                    {tpl.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{tpl.name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{tpl.filename}</div>
                    <div className="mt-1 text-xs text-muted-foreground line-clamp-2">{tpl.description}</div>
                  </div>
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="col-span-2 py-8 text-center text-xs text-muted-foreground">
                  Belum ada template di kategori ini
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
