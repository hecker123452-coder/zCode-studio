'use client'

import { useState } from 'react'
import JSZip from 'jszip'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Upload, Download, Cloud, RefreshCw, Trash2, Loader2, FileArchive } from 'lucide-react'
import { useEditorStore } from '@/store/editor-store'
import { toast } from 'sonner'
import {
  uploadProjectToCloud, listCloudProjects, loadCloudProject,
  deleteCloudProject, type CloudProject,
} from '@/lib/supabase'

interface ProjectManagerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProjectManagerDialog({ open, onOpenChange }: ProjectManagerDialogProps) {
  const [loading, setLoading] = useState(false)
  const [cloudProjects, setCloudProjects] = useState<CloudProject[]>([])
  const [tab, setTab] = useState<'local' | 'cloud'>('local')

  const files = useEditorStore(s => s.files)
  const rootFileIds = useEditorStore(s => s.rootFileIds)
  const createFile = useEditorStore(s => s.createFile)
  const createFolder = useEditorStore(s => s.createFolder)
  const updateFileContent = useEditorStore(s => s.updateFileContent)
  const openTab = useEditorStore(s => s.openTab)

  // Export project as ZIP
  const handleExportZip = async () => {
    setLoading(true)
    try {
      const zip = new JSZip()
      const allFiles = Object.values(files).filter(f => f.type === 'file')

      for (const file of allFiles) {
        // Build path
        let path = file.name
        let parentId = file.parentId
        while (parentId && files[parentId]) {
          path = files[parentId].name + '/' + path
          parentId = files[parentId].parentId
        }
        zip.file(path, file.content || '')
      }

      const blob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `zcode-project-${Date.now()}.zip`
      a.click()
      URL.revokeObjectURL(url)

      toast.success(`Project diekspor sebagai ZIP (${allFiles.length} files)`)
    } catch (err) {
      toast.error('Gagal ekspor: ' + (err instanceof Error ? err.message : 'Unknown'))
    } finally {
      setLoading(false)
    }
  }

  // Import project from ZIP
  const handleImportZip = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    event.target.value = ''

    setLoading(true)
    try {
      const arrayBuffer = await file.arrayBuffer()
      const zip = await JSZip.loadAsync(arrayBuffer)

      const folderMap = new Map<string, string>() // path -> folderId

      const filePaths = Object.keys(zip.files).filter(p => !zip.files[p].dir)

      for (const path of filePaths) {
        const content = await zip.files[path].async('string')
        const parts = path.split('/')
        const fileName = parts[parts.length - 1]
        const dirParts = parts.slice(0, -1)

        // Create/find parent folders
        let parentId: string | null = null
        let currentPath = ''
        for (const dir of dirParts) {
          currentPath = currentPath ? currentPath + '/' + dir : dir
          if (folderMap.has(currentPath)) {
            parentId = folderMap.get(currentPath)!
          } else {
            const folderId = createFolder(dir, parentId)
            folderMap.set(currentPath, folderId)
            parentId = folderId
          }
        }

        // Create file
        const fileId = createFile(fileName, parentId)
        useEditorStore.getState().updateFileContent(fileId, content)
        openTab(fileId, false)
      }

      toast.success(`Project diimpor dari ZIP (${filePaths.length} files)`)
      onOpenChange(false)
    } catch (err) {
      toast.error('Gagal import ZIP: ' + (err instanceof Error ? err.message : 'Format tidak valid'))
    } finally {
      setLoading(false)
    }
  }

  // Upload to cloud
  const handleUploadCloud = async () => {
    setLoading(true)
    try {
      const allFiles = Object.values(files).filter(f => f.type === 'file')
      const projectFiles = allFiles.map(f => ({
        name: f.name,
        type: 'file' as const,
        content: f.content || '',
        language: f.language,
        parentId: f.parentId,
      }))

      const projectName = `Project ${new Date().toLocaleString('id-ID')}`
      const result = await uploadProjectToCloud(projectName, projectFiles)

      if ('error' in result) {
        toast.error('Gagal upload: ' + result.error)
      } else {
        toast.success(`Project di-upload ke cloud! ID: ${result.id.substring(0, 8)}...`)
        handleListCloud()
      }
    } catch (err) {
      toast.error('Gagal upload cloud: ' + (err instanceof Error ? err.message : 'Unknown'))
    } finally {
      setLoading(false)
    }
  }

  // List cloud projects
  const handleListCloud = async () => {
    setLoading(true)
    setTab('cloud')
    try {
      const result = await listCloudProjects()
      if ('error' in result) {
        toast.error('Gagal load cloud: ' + result.error)
      } else {
        setCloudProjects(result.projects)
      }
    } finally {
      setLoading(false)
    }
  }

  // Load cloud project
  const handleLoadCloud = async (id: string) => {
    setLoading(true)
    try {
      const result = await loadCloudProject(id)
      if ('error' in result) {
        toast.error('Gagal load: ' + result.error)
        return
      }

      // Clear current project? Or merge? Let's just add files
      const projectFiles = result.project.data.files
      for (const pf of projectFiles) {
        const fileId = createFile(pf.name, null)
        useEditorStore.getState().updateFileContent(fileId, pf.content || '')
        openTab(fileId, false)
      }

      toast.success(`Cloud project loaded (${projectFiles.length} files)`)
      onOpenChange(false)
    } catch (err) {
      toast.error('Gagal load cloud project')
    } finally {
      setLoading(false)
    }
  }

  // Delete cloud project
  const handleDeleteCloud = async (id: string) => {
    if (!confirm('Hapus project dari cloud?')) return
    setLoading(true)
    try {
      const result = await deleteCloudProject(id)
      if ('error' in result) {
        toast.error('Gagal hapus: ' + result.error)
      } else {
        toast.success('Project dihapus dari cloud')
        handleListCloud()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="border-b border-[var(--editor-border)] px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileArchive className="h-5 w-5" />
            Project Manager
          </DialogTitle>
          <DialogDescription className="text-xs">
            Export/Import ZIP · Cloud Sync (Supabase)
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-[var(--editor-border)] px-5 py-2">
          <button
            onClick={() => setTab('local')}
            className={`rounded-full px-3 py-1 text-xs font-medium ${tab === 'local' ? 'bg-foreground text-background' : 'bg-[var(--input-bg)] text-muted-foreground'}`}
          >
            📦 Local (ZIP)
          </button>
          <button
            onClick={() => tab !== 'cloud' && handleListCloud()}
            className={`rounded-full px-3 py-1 text-xs font-medium ${tab === 'cloud' ? 'bg-foreground text-background' : 'bg-[var(--input-bg)] text-muted-foreground'}`}
          >
            ☁️ Cloud (Supabase)
          </button>
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-5">
          {tab === 'local' ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-[var(--editor-border)] bg-[var(--side-bar-bg)] p-4">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <Download className="h-4 w-4 text-emerald-400" />
                  Export as ZIP
                </h3>
                <p className="mb-3 text-xs text-muted-foreground">
                  Download semua file project sebagai .zip. Bisa di-import lagi nanti.
                </p>
                <Button onClick={handleExportZip} disabled={loading} className="w-full" size="sm">
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  Export ZIP
                </Button>
              </div>

              <div className="rounded-xl border border-[var(--editor-border)] bg-[var(--side-bar-bg)] p-4">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <Upload className="h-4 w-4 text-blue-400" />
                  Import from ZIP
                </h3>
                <p className="mb-3 text-xs text-muted-foreground">
                  Upload file .zip berisi project. File akan di-import ke editor.
                </p>
                <label className="block">
                  <input
                    type="file"
                    accept=".zip"
                    onChange={handleImportZip}
                    className="hidden"
                  />
                  <Button
                    onClick={(e) => e.currentTarget.previousElementSibling?.click()}
                    disabled={loading}
                    variant="outline"
                    className="w-full"
                    size="sm"
                  >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    Pilih File ZIP
                  </Button>
                </label>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Cloud Projects</h3>
                <div className="flex gap-1">
                  <Button onClick={handleUploadCloud} disabled={loading} size="sm" className="h-7 text-xs">
                    {loading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Cloud className="mr-1 h-3 w-3" />}
                    Upload Current
                  </Button>
                  <Button onClick={handleListCloud} disabled={loading} variant="outline" size="sm" className="h-7 w-7 p-0">
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {loading && cloudProjects.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                  Loading cloud projects...
                </div>
              ) : cloudProjects.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  <Cloud className="mx-auto mb-2 h-8 w-8 opacity-30" />
                  Belum ada project di cloud.
                  <br />
                  Klik "Upload Current" untuk sync.
                </div>
              ) : (
                <div className="space-y-2">
                  {cloudProjects.map(p => (
                    <div
                      key={p.id}
                      className="group flex items-center gap-3 rounded-lg border border-[var(--editor-border)] bg-[var(--side-bar-bg)] p-3"
                    >
                      <Cloud className="h-4 w-4 shrink-0 text-blue-400" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-medium">{p.name}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {new Date(p.updated_at).toLocaleString('id-ID')}
                        </div>
                      </div>
                      <button
                        onClick={() => handleLoadCloud(p.id)}
                        className="rounded p-1 text-muted-foreground hover:bg-[var(--list-hover)] hover:text-foreground"
                        title="Load"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteCloud(p.id)}
                        className="rounded p-1 text-muted-foreground hover:bg-[var(--list-hover)] hover:text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
