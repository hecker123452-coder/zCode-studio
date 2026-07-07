'use client'

import { useState, useMemo } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { FolderPlus, Check, FileCode2 } from 'lucide-react'
import { useEditorStore } from '@/store/editor-store'
import { PROJECT_TEMPLATES, PROJECT_TEMPLATE_CATEGORIES, type ProjectTemplate } from '@/lib/editor/project-templates'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface ProjectTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProjectTemplateDialog({ open, onOpenChange }: ProjectTemplateDialogProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const createFile = useEditorStore(s => s.createFile)
  const createFolder = useEditorStore(s => s.createFolder)
  const openTab = useEditorStore(s => s.openTab)
  const updateFileContent = useEditorStore(s => s.updateFileContent)

  const filteredTemplates = useMemo(() => {
    if (selectedCategory === 'all') return PROJECT_TEMPLATES
    return PROJECT_TEMPLATES.filter(t => t.category === selectedCategory)
  }, [selectedCategory])

  const handleCreate = (template: ProjectTemplate) => {
    // Create a folder for the project
    const folderName = template.name.toLowerCase().replace(/\s+/g, '-')
    const folderId = createFolder(folderName, null)

    // Create each file in the folder
    const createdFileIds: string[] = []
    for (const file of template.files) {
      const fileId = createFile(file.name, folderId)
      // Set content
      useEditorStore.getState().updateFileContent(fileId, file.content)
      createdFileIds.push(fileId)
    }

    // Open the first file
    if (createdFileIds.length > 0) {
      openTab(createdFileIds[0], false)
    }

    toast.success(`Project "${template.name}" dibuat (${template.files.length} files)`)
    onOpenChange(false)
  }

  const categories = ['all', ...Object.keys(PROJECT_TEMPLATE_CATEGORIES)]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] w-full max-w-2xl overflow-hidden p-0">
        <DialogHeader className="border-b border-[var(--editor-border)] px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <FolderPlus className="h-5 w-5" />
            New Project dari Template
          </DialogTitle>
          <DialogDescription className="text-xs">
            Pilih template untuk bikin project multi-file dengan boilerplate lengkap
          </DialogDescription>
        </DialogHeader>

        {/* Category filter */}
        <div className="flex gap-1 border-b border-[var(--editor-border)] px-5 py-3 overflow-x-auto">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                'shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                selectedCategory === cat
                  ? 'bg-foreground text-background'
                  : 'bg-[var(--input-bg)] text-muted-foreground hover:text-foreground'
              )}
            >
              {cat === 'all' ? '📚 All' : `${PROJECT_TEMPLATE_CATEGORIES[cat].icon} ${PROJECT_TEMPLATE_CATEGORIES[cat].label}`}
            </button>
          ))}
        </div>

        {/* Templates grid */}
        <div className="max-h-[55vh] overflow-y-auto p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredTemplates.map(template => (
              <button
                key={template.id}
                onClick={() => handleCreate(template)}
                className="group flex flex-col rounded-xl border border-[var(--editor-border)] bg-[var(--side-bar-bg)] p-4 text-left transition-all hover:border-foreground hover:shadow-md"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-2xl">{template.icon}</span>
                  <span className="rounded-full bg-[var(--input-bg)] px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {template.files.length} files
                  </span>
                </div>
                <h3 className="mb-1 text-sm font-semibold group-hover:text-foreground">
                  {template.name}
                </h3>
                <p className="mb-3 text-xs text-muted-foreground line-clamp-2">
                  {template.description}
                </p>
                <div className="mt-auto flex flex-wrap gap-1">
                  {template.files.map(f => (
                    <span
                      key={f.name}
                      className="inline-flex items-center gap-1 rounded bg-[var(--input-bg)] px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground"
                    >
                      <FileCode2 className="h-2 w-2" />
                      {f.name}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Belum ada template di kategori ini.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
