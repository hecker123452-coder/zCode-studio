'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Rocket, Copy, Check, ExternalLink, Loader2, Trash2, Clock,
  Eye, FileCode2, X, Sparkles,
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useEditorStore } from '@/store/editor-store'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface DeployedProject {
  id: string
  fileName: string
  title: string
  createdAt: string
  views: number
  size: number
}

interface DeployDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeployDialog({ open, onOpenChange }: DeployDialogProps) {
  const [deploying, setDeploying] = useState(false)
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null)
  const [deployedId, setDeployedId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [projects, setProjects] = useState<DeployedProject[]>([])
  const [loadingList, setLoadingList] = useState(false)

  const activeTabId = useEditorStore(s => s.activeTabId)
  const openTabs = useEditorStore(s => s.openTabs)
  const files = useEditorStore(s => s.files)

  const activeTab = openTabs.find(t => t.id === activeTabId)
  const activeFile = activeTab ? files[activeTab.fileId] : null

  // Check if current file is deployable (HTML, XML, or IndoCode which can contain HTML)
  const canDeploy = activeFile &&
    (activeFile.language === 'html' || activeFile.language === 'xml' || activeFile.language === 'indocode') &&
    activeFile.content && activeFile.content.trim().length > 0

  const loadProjects = useCallback(async () => {
    setLoadingList(true)
    try {
      const res = await fetch('/api/deploy')
      const data = await res.json()
      if (data.projects) {
        setProjects(data.projects)
      }
    } catch (e) {
      console.error('Failed to load projects:', e)
    } finally {
      setLoadingList(false)
    }
  }, [])

  // Load list of deployed projects when dialog opens
  useEffect(() => {
    if (open) {
      loadProjects()
      // Reset deployed state when opening (only if no URL yet)
      if (!deployedUrl) {
        setDeployedId(null)
      }
    }
  }, [open, deployedUrl, loadProjects])

  const handleDeploy = async () => {
    if (!activeFile) return

    setDeploying(true)
    setDeployedUrl(null)
    setDeployedId(null)

    try {
      // Transpile IndoCode HTML to standard HTML before deploying
      let deployContent = activeFile.content || ''
      if (activeFile.language === 'indocode') {
        try {
          const { transpileIndoCode, isIndoHTML, getIndoCodeRuntimeHelpers } = await import('@/lib/editor/indocode')
          if (isIndoHTML(deployContent)) {
            const result = transpileIndoCode(deployContent)
            if (result.success) {
              deployContent = result.code
              // Inject runtime helpers
              const helpers = getIndoCodeRuntimeHelpers()
              const helperScript = '<script>\n' + helpers + '\n</script>'
              if (deployContent.includes('<head>')) {
                deployContent = deployContent.replace('<head>', '<head>' + helperScript)
              } else if (deployContent.includes('<body>')) {
                deployContent = deployContent.replace('<body>', '<body>' + helperScript)
              }
            }
          }
        } catch (e) {
          console.error('IndoCode transpile error during deploy:', e)
        }
      }

      const res = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html: deployContent,
          fileName: activeFile.name,
          title: activeFile.name.replace(/\.[^.]+$/, ''),
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Deploy failed')
      }

      const data = await res.json()
      setDeployedUrl(data.url)
      setDeployedId(data.id)
      toast.success('Berhasil di-deploy!')
      loadProjects()

      // Haptic feedback
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate([10, 30, 10, 30, 10]) } catch { /* Vibration API not supported — ignore */ }
      }
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Gagal deploy')
    } finally {
      setDeploying(false)
    }
  }

  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('Link tersalin ke clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Gagal menyalin link')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus project yang sudah di-deploy? Link tidak akan dapat diakses lagi.')) return
    try {
      await fetch(`/api/deploy?id=${id}`, { method: 'DELETE' })
      toast.success('Project dihapus')
      loadProjects()
      if (id === deployedId) {
        setDeployedUrl(null)
        setDeployedId(null)
      }
    } catch {
      toast.error('Gagal menghapus')
    }
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(mins / 60)
    const days = Math.floor(hours / 24)

    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return d.toLocaleDateString()
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-full max-w-md overflow-hidden p-0 sm:max-w-lg md:max-w-xl">
        <DialogHeader className="flex flex-row items-center justify-between border-b border-[var(--editor-border)] px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Rocket className="h-5 w-5" />
            Deploy Project 
          </DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-[var(--list-hover)] hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </DialogHeader>
        <DialogDescription className="sr-only">
          Deploy your HTML project to get a shareable link
        </DialogDescription>

        <div className="max-h-[70vh] overflow-y-auto">
          {/* Deploy Section */}
          <div className="border-b border-[var(--editor-border)] p-5">
            {canDeploy ? (
              <>
                <div className="mb-4 flex items-center gap-3 rounded-xl border border-[var(--editor-border)] bg-[var(--side-bar-bg)] p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--list-hover)]">
                    <FileCode2 className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{activeFile?.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {activeFile?.content?.length.toLocaleString() || 0} chars · Siap di-deploy
                    </div>
                  </div>
                </div>

                {!deployedUrl ? (
                  <Button
                    onClick={handleDeploy}
                    disabled={deploying}
                    className="w-full h-11 text-sm font-semibold"
                    size="lg"
                  >
                    {deploying ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Lagi Deploy...
                      </>
                    ) : (
                      <>
                        <Rocket className="mr-2 h-4 w-4" />
                        Deploy Sekarang
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="space-y-3">
                    {/* Success state */}
                    <div className="rounded-xl border border-[var(--editor-border)] bg-[var(--list-hover)] p-4">
                      <div className="mb-2 flex items-center gap-2 text-foreground">
                        <Sparkles className="h-4 w-4" />
                        <span className="text-sm font-semibold">Berhasil di-deploy!</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          readOnly
                          value={deployedUrl}
                          className="flex-1 truncate rounded-md border border-[var(--editor-border)] bg-[var(--input-bg)] px-3 py-2 text-xs font-mono"
                        />
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleCopy(deployedUrl)}
                          className="h-9 w-9 shrink-0"
                        >
                          {copied ? <Check className="h-4 w-4 text-foreground" /> : <Copy className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="icon"
                          asChild
                          className="h-9 w-9 shrink-0"
                        >
                          <a href={deployedUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </div>

                    <Button
                      onClick={handleDeploy}
                      variant="outline"
                      className="w-full"
                      size="sm"
                    >
                      <Rocket className="mr-2 h-3.5 w-3.5" />
                      Re-deploy
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--list-hover)]">
                  <FileCode2 className="h-7 w-7 text-muted-foreground" />
                </div>
                <h3 className="mb-1 text-sm font-semibold">Belum ada file buat di-deploy</h3>
                <p className="max-w-[260px] text-xs text-muted-foreground">
                  Buka file HTML terlebih dahulu untuk deploy dan mendapatkan link shareable.
                </p>
              </div>
            )}
          </div>

          {/* Previously Deployed */}
          <div className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Deployed Projects ({projects.length})
              </h3>
              {projects.length > 0 && (
                <button
                  onClick={loadProjects}
                  className="text-[10px] text-muted-foreground hover:text-foreground"
                >
                  Refresh
                </button>
              )}
            </div>

            {loadingList ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : projects.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                Belum ada project yang di-deploy.
              </div>
            ) : (
              <div className="space-y-2">
                {projects.map(p => {
                  const host = typeof window !== 'undefined' ? window.location.origin : ''
                  const url = `${host}/d/${p.id}`
                  return (
                    <div
                      key={p.id}
                      className={cn(
                        'group flex items-center gap-3 rounded-xl border border-[var(--editor-border)] bg-[var(--side-bar-bg)] p-3 transition-all',
                        p.id === deployedId && 'border-primary ring-1 ring-primary/30'
                      )}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--list-hover)]">
                        <FileCode2 className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{p.fileName}</span>
                          {p.id === deployedId && (
                            <span className="rounded-full bg-[var(--list-hover)] px-1.5 py-0.5 text-[9px] font-medium text-foreground">
                              NEW
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {formatDate(p.createdAt)}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Eye className="h-2.5 w-2.5" />
                            {p.views}
                          </span>
                          <span>{formatSize(p.size)}</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          onClick={() => handleCopy(url)}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-[var(--list-hover)] hover:text-foreground active:scale-95"
                          title="Copy link"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-[var(--list-hover)] hover:text-foreground active:scale-95"
                          title="Open"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-[var(--list-hover)] hover:text-foreground active:scale-95"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
