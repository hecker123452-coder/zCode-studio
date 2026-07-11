'use client'

import { useState, useMemo } from 'react'
import {
  GitBranch, GitCommit, RefreshCw, Plus, Check,
  MoreHorizontal, FileEdit, FilePlus, FileMinus,
  RotateCcw, Trash2, History, ChevronDown, ChevronRight,
} from 'lucide-react'
import { useEditorStore, type FileNode } from '@/store/editor-store'
import { getFileIcon } from '@/lib/editor/file-icons'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

interface ModifiedFile {
  fileId: string
  file: FileNode
  status: 'modified' | 'added' | 'deleted'
}

function statusColor(status: ModifiedFile['status']): string {
  if (status === 'added') return 'text-emerald-400'
  if (status === 'deleted') return 'text-red-400'
  return 'text-amber-400'
}

function statusLabel(status: ModifiedFile['status']): string {
  if (status === 'added') return 'A'
  if (status === 'deleted') return 'D'
  return 'M'
}

export function SourceControlPanel() {
  const [commitMessage, setCommitMessage] = useState('')
  const [showHistory, setShowHistory] = useState(false)

  const files = useEditorStore(s => s.files)
  const openTab = useEditorStore(s => s.openTab)
  const getModifiedFiles = useEditorStore(s => s.getModifiedFiles)
  const createCommit = useEditorStore(s => s.createCommit)
  const restoreCommit = useEditorStore(s => s.restoreCommit)
  const stageFile = useEditorStore(s => s.stageFile)
  const unstageFile = useEditorStore(s => s.unstageFile)
  const discardChanges = useEditorStore(s => s.discardChanges)
  const stagedFileIds = useEditorStore(s => s.stagedFileIds)
  const commits = useEditorStore(s => s.commits)

  // Recompute modified files whenever files change
  const modifiedFiles: ModifiedFile[] = useMemo(() => getModifiedFiles(), [files])  

  const staged = modifiedFiles.filter(f => stagedFileIds.includes(f.fileId))
  const unstaged = modifiedFiles.filter(f => !stagedFileIds.includes(f.fileId))

  const handleCommit = () => {
    if (!commitMessage.trim()) {
      toast.error('Tulis pesan commit dulu')
      return
    }
    if (staged.length === 0) {
      toast.error('Stage file dulu (klik + di sebelah file)')
      return
    }
    const id = createCommit(commitMessage)
    toast.success(`Commit berhasil: "${commitMessage}"`)
    setCommitMessage('')
  }

  const handleDiscard = (fileId: string, fileName: string) => {
    if (!confirm(`Buang perubahan di ${fileName}? Tidak bisa di-undo.`)) return
    discardChanges(fileId)
    toast.success(`Perubahan ${fileName} dibuang`)
  }

  const handleRestore = (commitId: string, message: string) => {
    if (!confirm(`Restore ke commit "${message}"? Perubahan yang belum di-commit akan hilang.`)) return
    restoreCommit(commitId)
    toast.success(`Restored ke: ${message}`)
    setShowHistory(false)
  }

  const handleStageAll = () => {
    unstaged.forEach(f => stageFile(f.fileId))
  }

  const handleCommitAll = () => {
    // Stage all then commit
    modifiedFiles.forEach(f => stageFile(f.fileId))
    if (modifiedFiles.length === 0) {
      toast.error('Tidak ada perubahan untuk di-commit')
      return
    }
    if (!commitMessage.trim()) {
      toast.error('Tulis pesan commit dulu')
      return
    }
    const id = createCommit(commitMessage)
    toast.success(`Commit ${modifiedFiles.length} file: "${commitMessage}"`)
    setCommitMessage('')
  }

  const formatDate = (ts: number) => {
    const diff = Date.now() - ts
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(mins / 60)
    const days = Math.floor(hours / 24)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return new Date(ts).toLocaleDateString('id-ID')
  }

  const statusIcon = (status: ModifiedFile['status']) => {
    if (status === 'added') return <FilePlus className="h-3 w-3 text-emerald-400" />
    if (status === 'deleted') return <FileMinus className="h-3 w-3 text-red-400" />
    return <FileEdit className="h-3 w-3 text-amber-400" />
  }

  return (
    <div className="flex h-full flex-col bg-[var(--side-bar-bg)]">
      {/* Header */}
      <div className="flex h-9 items-center justify-between px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span>Source Control</span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={handleStageAll}
            className="rounded p-1 hover:bg-[var(--list-hover)]"
            title="Stage all changes"
            disabled={unstaged.length === 0}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={cn('rounded p-1 hover:bg-[var(--list-hover)]', showHistory && 'bg-[var(--list-hover)]')}
            title="Toggle history"
          >
            <History className="h-3.5 w-3.5" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded p-1 hover:bg-[var(--list-hover)]">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleCommitAll} disabled={modifiedFiles.length === 0}>
                <GitCommit className="mr-2 h-3.5 w-3.5" />
                <span>Commit All</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleStageAll} disabled={unstaged.length === 0}>
                <Plus className="mr-2 h-3.5 w-3.5" />
                <span>Stage All</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  if (commits.length === 0) {
                    toast.info('Belum ada commit')
                    return
                  }
                  handleRestore(commits[0].id, commits[0].message)
                }}
                disabled={commits.length === 0}
              >
                <RotateCcw className="mr-2 h-3.5 w-3.5" />
                <span>Undo Last Commit</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Commit message input */}
      <div className="border-b border-[var(--editor-border)] p-2">
        <Input
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          placeholder="Pesan commit (mis: 'fix bug login')"
          className="mb-2 h-8 bg-[var(--input-bg)] text-xs"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault()
              handleCommit()
            }
          }}
        />
        <Button
          onClick={handleCommit}
          size="sm"
          className="h-7 w-full text-xs"
          disabled={staged.length === 0 || !commitMessage.trim()}
        >
          <GitCommit className="mr-1.5 h-3.5 w-3.5" />
          Commit ({staged.length} staged)
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {modifiedFiles.length === 0 && commits.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <GitBranch className="mb-2 h-8 w-8 opacity-30" />
              <p className="text-xs text-muted-foreground">Belum ada perubahan</p>
              <p className="mt-1 text-[10px] text-muted-foreground/70">
                Edit file untuk mulai track changes
              </p>
            </div>
          )}

          {/* Staged changes */}
          {staged.length > 0 && (
            <div className="mb-3">
              <div className="mb-1 flex items-center gap-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <Check className="h-3 w-3 text-emerald-400" />
                <span>Staged Changes ({staged.length})</span>
              </div>
              <div className="space-y-0.5">
                {staged.map(({ fileId, file, status }) => (
                  <FileRow
                    key={fileId}
                    file={file}
                    status={status}
                    onOpen={() => file.name !== '(deleted)' && openTab(fileId, false)}
                    onStageToggle={() => unstageFile(fileId)}
                    onDiscard={() => handleDiscard(fileId, file.name)}
                    staged
                  />
                ))}
              </div>
            </div>
          )}

          {/* Unstaged changes */}
          {unstaged.length > 0 && (
            <div className="mb-3">
              <div className="mb-1 flex items-center gap-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <FileEdit className="h-3 w-3 text-amber-400" />
                <span>Changes ({unstaged.length})</span>
              </div>
              <div className="space-y-0.5">
                {unstaged.map(({ fileId, file, status }) => (
                  <FileRow
                    key={fileId}
                    file={file}
                    status={status}
                    onOpen={() => file.name !== '(deleted)' && openTab(fileId, false)}
                    onStageToggle={() => stageFile(fileId)}
                    onDiscard={() => handleDiscard(fileId, file.name)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Commit history */}
          {showHistory && commits.length > 0 && (
            <div>
              <div className="mb-1 flex items-center gap-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <History className="h-3 w-3" />
                <span>History ({commits.length})</span>
              </div>
              <div className="space-y-1">
                {commits.map((commit) => (
                  <div
                    key={commit.id}
                    className="rounded-md border border-[var(--editor-border)] bg-[var(--input-bg)] p-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">{commit.message}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatDate(commit.createdAt)} · {commit.files.length} files
                        </p>
                      </div>
                      <button
                        onClick={() => handleRestore(commit.id, commit.message)}
                        className="shrink-0 rounded p-1 text-muted-foreground hover:bg-[var(--list-hover)] hover:text-foreground"
                        title="Restore ke commit ini"
                      >
                        <RotateCcw className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showHistory && commits.length === 0 && (
            <div className="py-4 text-center text-xs text-muted-foreground">
              Belum ada commit. Buat commit pertama lo!
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer stats */}
      <div className="border-t border-[var(--editor-border)] px-3 py-1.5 text-[10px] text-muted-foreground">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1">
            <GitBranch className="h-3 w-3" />
            main
          </span>
          <span>
            {modifiedFiles.length} changes · {commits.length} commits
          </span>
        </div>
      </div>
    </div>
  )
}

interface FileRowProps {
  file: FileNode
  status: ModifiedFile['status']
  onOpen: () => void
  onStageToggle: () => void
  onDiscard: () => void
  staged?: boolean
}

function FileRow({ file, status, onOpen, onStageToggle, onDiscard, staged }: FileRowProps) {
  const iconInfo = getFileIcon(file.name)
  const Icon = iconInfo.icon
  return (
    <div className="group flex items-center gap-1 rounded-md px-1 py-1 hover:bg-[var(--list-hover)]">
      <span className="shrink-0">
        <Icon className="h-3.5 w-3.5" style={{ color: iconInfo.color }} />
      </span>
      <button
        onClick={onOpen}
        className="min-w-0 flex-1 truncate text-left text-xs hover:text-foreground"
        title={file.name}
      >
        {file.name}
      </button>
      <span className={cn('shrink-0 text-[10px] font-bold', statusColor(status))}>
        {statusLabel(status)}
      </span>
      <div className="flex shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={onStageToggle}
          className="rounded p-0.5 text-muted-foreground hover:bg-[var(--list-active)] hover:text-foreground"
          title={staged ? 'Unstage' : 'Stage'}
        >
          {staged ? <ChevronDown className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
        </button>
        {!staged && (
          <button
            onClick={onDiscard}
            className="rounded p-0.5 text-muted-foreground hover:bg-[var(--list-active)] hover:text-red-400"
            title="Discard changes"
          >
            <RotateCcw className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  )
}
