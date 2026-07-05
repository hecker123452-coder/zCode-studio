'use client'

import { useState } from 'react'
import {
  GitBranch, GitCommit, GitPullRequest, RefreshCw, Plus, Check,
  MoreHorizontal, FileEdit, FilePlus, FileMinus,
} from 'lucide-react'
import { useEditorStore } from '@/store/editor-store'
import { getFileIcon } from '@/lib/editor/file-icons'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'

export function SourceControlPanel() {
  const [commitMessage, setCommitMessage] = useState('')
  const files = useEditorStore(s => s.files)
  const rootFileIds = useEditorStore(s => s.rootFileIds)
  const openTab = useEditorStore(s => s.openTab)

  // Simulate "modified" files - just pick a few files as "modified"
  const allFiles = Object.values(files).filter(f => f.type === 'file')
  const modifiedFiles = allFiles.slice(0, 3) // Pretend first 3 files are modified
  const stagedFiles = allFiles.slice(3, 4) // Pretend 1 file is staged

  const handleCommit = () => {
    if (!commitMessage.trim()) {
      toast.error('Please enter a commit message')
      return
    }
    toast.success(`Committed: "${commitMessage}"`)
    setCommitMessage('')
  }

  return (
    <div className="flex h-full flex-col bg-[var(--side-bar-bg)]">
      {/* Header */}
      <div className="flex h-9 items-center justify-between px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span>Source Control</span>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-5 w-5" title="Refresh">
            <RefreshCw className="h-3 w-3" />
          </Button>
          <Button size="icon" variant="ghost" className="h-5 w-5" title="More">
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Commit input */}
      <div className="px-2 pb-2">
        <Input
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          placeholder="Message (⌘Enter to commit)"
          className="bg-[var(--input-bg)] text-[13px]"
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              handleCommit()
            }
          }}
        />
        <Button
          onClick={handleCommit}
          className="mt-1.5 w-full"
          size="sm"
        >
          <GitCommit className="mr-2 h-3.5 w-3.5" />
          Commit
        </Button>
      </div>

      {/* Branch info */}
      <div className="flex items-center gap-1.5 border-y border-[var(--editor-border)] bg-[var(--list-hover)] px-3 py-1.5 text-[11px]">
        <GitBranch className="h-3 w-3 text-foreground" />
        <span className="text-foreground">main</span>
        <span className="text-muted-foreground">{'->'}</span>
        <span className="text-muted-foreground">origin/main</span>
        <span className="ml-auto flex items-center gap-1 text-foreground">
          <GitPullRequest className="h-3 w-3" />
          <span>0</span>
        </span>
      </div>

      <ScrollArea className="flex-1">
        <div className="py-2">
          {/* Staged changes */}
          <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Staged Changes ({stagedFiles.length})
          </div>
          {stagedFiles.map(file => {
            const iconInfo = getFileIcon(file.name)
            const Icon = iconInfo.icon
            return (
              <div
                key={file.id}
                onClick={() => openTab(file.id, false)}
                className="flex h-[26px] cursor-pointer items-center gap-2 px-3 hover:bg-[var(--list-hover)]"
              >
                <span className="text-foreground">
                  <Check className="h-3.5 w-3.5" />
                </span>
                <Icon className="h-4 w-4 shrink-0" style={{ color: iconInfo.color }} strokeWidth={1.5} />
                <span className="flex-1 truncate text-[13px]">{file.name}</span>
                <span className="text-[10px] uppercase text-foreground">M</span>
              </div>
            )
          })}

          {/* Changes */}
          <div className="mt-2 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Changes ({modifiedFiles.length})
          </div>
          {modifiedFiles.map((file, idx) => {
            const iconInfo = getFileIcon(file.name)
            const Icon = iconInfo.icon
            const status = idx === 0 ? 'M' : idx === 1 ? 'U' : 'M'
            return (
              <div
                key={file.id}
                onClick={() => openTab(file.id, false)}
                className="group flex h-[26px] cursor-pointer items-center gap-2 px-3 hover:bg-[var(--list-hover)]"
              >
                <span className="opacity-0 group-hover:opacity-100">
                  <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                </span>
                <Icon className="h-4 w-4 shrink-0" style={{ color: iconInfo.color }} strokeWidth={1.5} />
                <span className="flex-1 truncate text-[13px]">{file.name}</span>
                <span
                  className={cn(
                    'text-[10px] uppercase font-bold',
                    status === 'M' ? 'text-foreground' : 'text-foreground'
                  )}
                >
                  {status}
                </span>
              </div>
            )
          })}

          {/* Empty state hint */}
          <div className="mt-4 px-3 py-2 text-[11px] text-muted-foreground">
            <p className="mb-2"> Tip: This is a simulated source control view.</p>
            <p>In a full version, this would connect to a real Git repository.</p>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
