'use client'

import { ChevronRight, Folder } from 'lucide-react'
import { useEditorStore } from '@/store/editor-store'
import { getFileIcon } from '@/lib/editor/file-icons'

export function EditorBreadcrumb({ fileId }: { fileId: string }) {
  const files = useEditorStore(s => s.files)

  // Build path segments
  const segments: { name: string; id: string; type: 'file' | 'folder' }[] = []
  let currentId: string | null = fileId
  while (currentId) {
    const f = files[currentId]
    if (!f) break
    segments.unshift({ name: f.name, id: f.id, type: f.type })
    currentId = f.parentId
  }

  if (segments.length === 0) return null

  const lastSegment = segments[segments.length - 1]
  const iconInfo = getFileIcon(lastSegment.name)
  const Icon = iconInfo.icon

  return (
    <div className="flex h-7 items-center gap-0.5 border-b border-[var(--editor-border)] bg-[var(--editor-bg)] px-3 text-[12px] text-muted-foreground">
      {segments.map((seg, idx) => {
        const isLast = idx === segments.length - 1
        const segIconInfo = getFileIcon(seg.name)
        const SegIcon = segIconInfo.icon

        return (
          <div key={seg.id} className="flex items-center gap-0.5">
            {idx > 0 && <ChevronRight className="h-3 w-3 opacity-50" />}
            {seg.type === 'folder' ? (
              <>
                <Folder className="h-3.5 w-3.5" style={{ color: '#dcb67a' }} strokeWidth={1.5} />
                <span className="hover:text-foreground">{seg.name}</span>
              </>
            ) : (
              <>
                <SegIcon className="h-3.5 w-3.5" style={{ color: segIconInfo.color }} strokeWidth={1.5} />
                <span className={isLast ? 'text-foreground' : 'hover:text-foreground'}>
                  {seg.name}
                </span>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
