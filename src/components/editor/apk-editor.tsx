'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import JSZip from 'jszip'
import {
  Package, FileText, Image as ImageIcon, FileCode, File, Folder, FolderOpen,
  ChevronRight, ChevronDown, Download, Upload, X, Save, Loader2, AlertCircle,
  CheckCircle, Binary, RefreshCw, Search, FileArchive, ShieldCheck, Key,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { signAndDownloadApk, listKeystores, generateKeystore } from '@/lib/apk/signer'

// ===== Types =====

interface ApkEntry {
  path: string
  isDirectory: boolean
  content?: string // text content (if editable)
  binaryContent?: Uint8Array // binary content (images, dex, etc.)
  isModified?: boolean
  size: number
}

interface TreeNode {
  name: string
  path: string
  isDirectory: boolean
  children: TreeNode[]
  entry?: ApkEntry
}

// ===== Helpers =====

const TEXT_EXTENSIONS = [
  'txt', 'xml', 'json', 'md', 'smali', 'java', 'kt', 'js', 'ts', 'css', 'html',
  'properties', 'yaml', 'yml', 'cfg', 'conf', 'ini', 'sh', 'py', 'gradle',
  'version', 'MF', 'SF', 'RSA', 'DSA', 'EC',
]

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg']

function getExtension(filename: string): string {
  const parts = filename.split('.')
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ''
}

function isTextFile(path: string): boolean {
  const ext = getExtension(path)
  return TEXT_EXTENSIONS.includes(ext)
}

function isImageFile(path: string): boolean {
  const ext = getExtension(path)
  return IMAGE_EXTENSIONS.includes(ext)
}

function isBinaryFile(path: string): boolean {
  return !isTextFile(path) && !isImageFile(path)
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(path: string, isDir: boolean) {
  if (isDir) return <Folder className="h-3.5 w-3.5 text-amber-400" />
  const ext = getExtension(path)
  if (IMAGE_EXTENSIONS.includes(ext)) return <ImageIcon className="h-3.5 w-3.5 text-pink-400" />
  if (ext === 'smali' || ext === 'java' || ext === 'kt') return <FileCode className="h-3.5 w-3.5 text-orange-400" />
  if (ext === 'xml') return <FileCode className="h-3.5 w-3.5 text-blue-400" />
  if (ext === 'dex' || ext === 'arsc') return <Binary className="h-3.5 w-3.5 text-purple-400" />
  return <File className="h-3.5 w-3.5 text-muted-foreground" />
}

// Build tree from flat file list
function buildTree(entries: Map<string, ApkEntry>): TreeNode {
  const root: TreeNode = { name: '', path: '', isDirectory: true, children: [] }
  const dirMap = new Map<string, TreeNode>()
  dirMap.set('', root)

  const sortedPaths = Array.from(entries.keys()).sort()

  for (const path of sortedPaths) {
    const entry = entries.get(path)!
    const parts = path.split('/')
    let currentPath = ''
    let parentNode = root

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      currentPath = currentPath ? `${currentPath}/${part}` : part
      const isLast = i === parts.length - 1

      if (isLast) {
        // File node
        parentNode.children.push({
          name: part,
          path: currentPath,
          isDirectory: false,
          children: [],
          entry,
        })
      } else {
        // Directory node
        if (!dirMap.has(currentPath)) {
          const dirNode: TreeNode = {
            name: part,
            path: currentPath,
            isDirectory: true,
            children: [],
          }
          dirMap.set(currentPath, dirNode)
          parentNode.children.push(dirNode)
        }
        parentNode = dirMap.get(currentPath)!
      }
    }
  }

  return root
}

// ===== Component =====

interface ApkEditorProps {
  open: boolean
  onClose: () => void
}

export function ApkEditor({ open, onClose }: ApkEditorProps) {
  const [zip, setZip] = useState<JSZip | null>(null)
  const [entries, setEntries] = useState<Map<string, ApkEntry>>(new Map())
  const [tree, setTree] = useState<TreeNode | null>(null)
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(['']))
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [apkName, setApkName] = useState<string>('')
  const [editingContent, setEditingContent] = useState<string>('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [hexData, setHexData] = useState<string | null>(null)
  const [signing, setSigning] = useState(false)
  const [keystoreAlias, setKeystoreAlias] = useState('zcode-default')
  const [showSignDialog, setShowSignDialog] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load APK file
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setLoading(true)
    try {
      const arrayBuffer = await file.arrayBuffer()
      const loadedZip = await JSZip.loadAsync(arrayBuffer)

      const newEntries = new Map<string, ApkEntry>()

      const filePromises: Promise<void>[] = []
      loadedZip.forEach((relativePath, zipEntry) => {
        if (zipEntry.dir) return // skip directories

        filePromises.push(
          (async () => {
            try {
              const isText = isTextFile(relativePath)
              let content: string | undefined
              let binaryContent: Uint8Array | undefined

              if (isText) {
                content = await zipEntry.async('string')
              } else {
                binaryContent = await zipEntry.async('uint8array')
              }

              newEntries.set(relativePath, {
                path: relativePath,
                isDirectory: false,
                content,
                binaryContent,
                size: content ? content.length : (binaryContent?.length || 0),
              })
            } catch (err) {
              console.error(`Failed to load ${relativePath}:`, err)
            }
          })()
        )
      })

      await Promise.all(filePromises)

      setZip(loadedZip)
      setEntries(newEntries)
      setTree(buildTree(newEntries))
      setApkName(file.name)
      setSelectedPath(null)
      setEditingContent('')
      setImagePreview(null)
      setHexData(null)
      setHasUnsavedChanges(false)

      toast.success(`APK loaded: ${file.name} (${newEntries.size} files)`)
    } catch (err) {
      console.error('APK load error:', err)
      toast.error('Gagal load APK. Pastikan file valid APK/ZIP.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Select file
  const handleSelectFile = useCallback(async (path: string) => {
    const entry = entries.get(path)
    if (!entry) return

    setSelectedPath(path)
    setHasUnsavedChanges(false)

    if (isTextFile(path)) {
      setEditingContent(entry.content || '')
      setImagePreview(null)
      setHexData(null)
    } else if (isImageFile(path) && entry.binaryContent) {
      // Create blob URL for image preview
      const blob = new Blob([entry.binaryContent as BlobPart], { type: `image/${getExtension(path)}` })
      const url = URL.createObjectURL(blob)
      setImagePreview(url)
      setEditingContent('')
      setHexData(null)
    } else if (isBinaryFile(path) && entry.binaryContent) {
      // Generate hex view
      const bytes = entry.binaryContent
      const hexLines: string[] = []
      const chunkSize = 16
      for (let i = 0; i < Math.min(bytes.length, 4096); i += chunkSize) {
        const chunk = bytes.slice(i, i + chunkSize)
        const hex = Array.from(chunk).map(b => b.toString(16).padStart(2, '0')).join(' ')
        const ascii = Array.from(chunk).map(b => (b >= 32 && b < 127) ? String.fromCharCode(b) : '.').join('')
        hexLines.push(`${i.toString(16).padStart(8, '0')}  ${hex.padEnd(chunkSize * 3, ' ')}  ${ascii}`)
      }
      if (bytes.length > 4096) {
        hexLines.push(`... (${formatBytes(bytes.length)} total, showing first 4096 bytes)`)
      }
      setHexData(hexLines.join('\n'))
      setEditingContent('')
      setImagePreview(null)
    }
  }, [entries])

  // Toggle directory expand
  const toggleDir = useCallback((path: string) => {
    setExpandedDirs(prev => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }, [])

  // Save edited content
  const handleSave = useCallback(() => {
    if (!selectedPath) return

    setEntries(prev => {
      const next = new Map(prev)
      const entry = next.get(selectedPath)
      if (entry) {
        next.set(selectedPath, {
          ...entry,
          content: editingContent,
          isModified: true,
          size: editingContent.length,
        })
      }
      return next
    })

    setHasUnsavedChanges(false)
    toast.success(`Saved: ${selectedPath}`)
  }, [selectedPath, editingContent])

  // Repackage APK and download
  const handleDownload = useCallback(async () => {
    if (!zip) return

    setLoading(true)
    try {
      const newZip = new JSZip()

      // Copy all files from original zip
      for (const [path, entry] of entries) {
        if (entry.isModified && entry.content !== undefined) {
          // Use modified content
          newZip.file(path, entry.content)
        } else if (entry.binaryContent) {
          // Use original binary content
          newZip.file(path, entry.binaryContent)
        } else if (entry.content !== undefined) {
          // Use original text content
          newZip.file(path, entry.content)
        }
      }

      const blob = await newZip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      })

      // Download
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = apkName.replace(/\.apk$/i, '') + '-modified.apk'
      a.click()
      URL.revokeObjectURL(url)

      toast.success('APK di-download! Sign ulang dengan apksigner sebelum install.')
    } catch (err) {
      console.error('Download error:', err)
      toast.error('Gagal download APK')
    } finally {
      setLoading(false)
    }
  }, [zip, entries, apkName])

  // Build a fresh JSZip from current entries (with modifications applied)
  const buildCurrentZip = useCallback(async (): Promise<JSZip | null> => {
    if (!zip) return null
    const newZip = new JSZip()
    for (const [path, entry] of entries) {
      if (entry.isModified && entry.content !== undefined) {
        newZip.file(path, entry.content)
      } else if (entry.binaryContent) {
        newZip.file(path, entry.binaryContent)
      } else if (entry.content !== undefined) {
        newZip.file(path, entry.content)
      }
    }
    return newZip
  }, [zip, entries])

  // Sign APK in-browser using Web Crypto API + download
  const handleSignAndDownload = useCallback(async () => {
    setSigning(true)
    try {
      const newZip = await buildCurrentZip()
      if (!newZip) {
        toast.error('No APK loaded')
        return
      }

      toast.info('Signing APK dengan Web Crypto API...', { duration: 3000 })

      const result = await signAndDownloadApk(newZip, keystoreAlias)

      if (!result.success) {
        throw new Error(result.error || 'Signing failed')
      }

      // Download signed APK
      const url = URL.createObjectURL(result.apkBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = apkName.replace(/\.apk$/i, '') + '-signed.apk'
      a.click()
      URL.revokeObjectURL(url)

      toast.success('APK berhasil di-sign & di-download! Siap install di HP.', { duration: 5000 })
      setShowSignDialog(false)
    } catch (err) {
      console.error('Sign error:', err)
      toast.error('Gagal sign APK: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setSigning(false)
    }
  }, [buildCurrentZip, keystoreAlias, apkName])

  // Filter tree by search
  const filteredTree = useCallback((node: TreeNode, query: string): TreeNode | null => {
    if (!query) return node
    const lowerQuery = query.toLowerCase()

    if (node.isDirectory) {
      const filteredChildren = node.children
        .map(child => filteredTree(child, query))
        .filter((child): child is TreeNode => child !== null)

      if (filteredChildren.length === 0) return null
      return { ...node, children: filteredChildren }
    } else {
      return node.name.toLowerCase().includes(lowerQuery) ? node : null
    }
  }, [])

  // Render tree node
  const renderNode = (node: TreeNode, depth: number = 0): React.ReactNode => {
    if (node.name === '') {
      // Root — render children
      return node.children
        .sort((a, b) => {
          if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
          return a.name.localeCompare(b.name)
        })
        .map(child => renderNode(child, depth))
    }

    const isExpanded = expandedDirs.has(node.path)
    const isSelected = selectedPath === node.path

    return (
      <div key={node.path}>
        <button
          onClick={() => node.isDirectory ? toggleDir(node.path) : handleSelectFile(node.path)}
          className={cn(
            'flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-xs hover:bg-[var(--list-hover)]',
            isSelected && 'bg-[var(--list-active)]'
          )}
          style={{ paddingLeft: `${depth * 12 + 4}px` }}
        >
          {node.isDirectory ? (
            <span className="shrink-0">
              {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </span>
          ) : (
            <span className="w-3 shrink-0" />
          )}
          {getFileIcon(node.path, node.isDirectory)}
          <span className={cn('truncate', node.entry?.isModified && 'text-emerald-400 font-medium')}>
            {node.name}
          </span>
          {node.entry?.isModified && (
            <span className="ml-auto shrink-0 rounded bg-emerald-500/20 px-1 text-[9px] font-bold text-emerald-400">
              MOD
            </span>
          )}
        </button>
        {node.isDirectory && isExpanded && (
          <div>
            {node.children
              .sort((a, b) => {
                if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
                return a.name.localeCompare(b.name)
              })
              .map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  // Stats
  const totalFiles = entries.size
  const modifiedFiles = Array.from(entries.values()).filter(e => e.isModified).length
  const totalSize = Array.from(entries.values()).reduce((sum, e) => sum + e.size, 0)

  if (!open) return null

  const displayTree = tree ? (searchQuery ? filteredTree(tree, searchQuery) : tree) : null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--editor-bg)] animate-fade-in">
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-[var(--editor-border)] bg-[var(--title-bar-bg)] px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-blue-500">
            <Package className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              APK Editor
              <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">
                MT-STYLE
              </span>
            </h2>
            <p className="text-[10px] text-muted-foreground">
              {apkName ? `${apkName} · ${totalFiles} files · ${modifiedFiles} modified` : 'No APK loaded'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".apk,.zip,.jar"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            disabled={loading}
          >
            {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-1.5 h-3.5 w-3.5" />}
            Upload APK
          </Button>
          <Button
            onClick={handleDownload}
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            disabled={!zip || loading}
            title="Download tanpa sign (perlu sign ulang manual)"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Download (Unsigned)
          </Button>
          <Button
            onClick={() => setShowSignDialog(true)}
            size="sm"
            className="h-8 bg-gradient-to-r from-emerald-500 to-blue-500 text-xs text-white hover:opacity-90"
            disabled={!zip || loading || signing}
            title="Sign APK di browser pakai Web Crypto API + download"
          >
            {signing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />}
            Sign & Download
          </Button>
          <Button onClick={onClose} size="sm" variant="ghost" className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Security notice */}
      <div className="flex items-center gap-2 border-b border-emerald-500/20 bg-emerald-500/5 px-4 py-2 text-[11px] text-emerald-400">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
        <span>
          <strong>Sign APK langsung di browser!</strong> Pakai Web Crypto API (RSA 2048-bit + SHA-256). Tidak butuh Java/apksigner. Klik <strong>"Sign & Download"</strong> → APK siap install di HP. Keystore disimpan di IndexedDB browser lo.
        </span>
      </div>

      {/* Sign Dialog */}
      {showSignDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 animate-fade-in" onClick={() => !signing && setShowSignDialog(false)}>
          <div
            className="w-full max-w-md rounded-2xl border border-[var(--editor-border)] bg-[var(--side-bar-bg)] p-6 shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-blue-500">
                <Key className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Sign APK</h3>
                <p className="text-[11px] text-muted-foreground">Web Crypto API · RSA 2048-bit · SHA-256</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="rounded-lg bg-[var(--input-bg)] p-3">
                <p className="mb-2 font-medium text-foreground">Cara kerja:</p>
                <ol className="space-y-1 text-muted-foreground">
                  <li>1. Generate/load RSA 2048-bit keypair (disimpan di IndexedDB)</li>
                  <li>2. Build MANIFEST.MF (SHA-256 digest tiap file)</li>
                  <li>3. Build CERT.SF (SHA-256 digest tiap manifest entry)</li>
                  <li>4. Sign CERT.SF → CERT.RSA (PKCS#7 SignedData)</li>
                  <li>5. Download APK yang siap install</li>
                </ol>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                  Keystore Alias
                </label>
                <Input
                  value={keystoreAlias}
                  onChange={(e) => setKeystoreAlias(e.target.value)}
                  placeholder="zcode-default"
                  className="h-8 text-xs"
                  disabled={signing}
                />
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Keystore disimpan di browser. Pakai alias yang sama untuk APK lain.
                </p>
              </div>

              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2 text-[10px] text-amber-400">
                <strong>Catatan:</strong> APK di-sign dengan self-signed certificate. Android akan tampilkan warning "unknown publisher" saat install — klik "Install anyway". Untuk publish ke Play Store, gunakan keystore resmi.
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <Button
                onClick={() => setShowSignDialog(false)}
                variant="outline"
                size="sm"
                className="flex-1"
                disabled={signing}
              >
                Batal
              </Button>
              <Button
                onClick={handleSignAndDownload}
                size="sm"
                className="flex-1 bg-gradient-to-r from-emerald-500 to-blue-500 text-white hover:opacity-90"
                disabled={signing}
              >
                {signing ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Signing...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                    Sign & Download
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {!zip ? (
        // Empty state
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--list-hover)] animate-pulse-glow">
            <FileArchive className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="mb-2 text-lg font-semibold">APK Editor — MT Manager Style</h3>
          <p className="mb-6 max-w-md text-sm text-muted-foreground">
            Upload file APK (.apk) untuk mulai edit. Lo bisa edit file text (XML, smali, json, assets),
            view gambar (icon, drawable), dan liat hex untuk binary (DEX, ARSC).
          </p>
          <div className="grid max-w-2xl gap-3 sm:grid-cols-3">
            <FeatureCard icon={FileText} title="Edit Text Files" desc="XML, smali, json, assets" />
            <FeatureCard icon={ImageIcon} title="View Images" desc="PNG, JPG, icon, drawable" />
            <FeatureCard icon={Binary} title="Hex Viewer" desc="DEX, ARSC, binary files" />
          </div>
          <Button
            onClick={() => fileInputRef.current?.click()}
            className="mt-6 h-11 px-8"
            size="lg"
          >
            <Upload className="mr-2 h-4 w-4" />
            Pilih File APK
          </Button>
        </div>
      ) : (
        // Editor layout
        <div className="flex flex-1 overflow-hidden">
          {/* File tree sidebar */}
          <div className="flex w-72 flex-col border-r border-[var(--editor-border)] bg-[var(--side-bar-bg)]">
            <div className="flex items-center gap-2 border-b border-[var(--editor-border)] px-3 py-2">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search files..."
                className="h-7 border-0 bg-transparent px-0 text-xs focus-visible:ring-0"
              />
            </div>
            <ScrollArea className="flex-1">
              <div className="p-1">
                {displayTree ? renderNode(displayTree) : (
                  <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                    No files match "{searchQuery}"
                  </p>
                )}
              </div>
            </ScrollArea>
            <div className="border-t border-[var(--editor-border)] px-3 py-1.5 text-[10px] text-muted-foreground">
              {totalFiles} files · {formatBytes(totalSize)}
            </div>
          </div>

          {/* Editor area */}
          <div className="flex flex-1 flex-col">
            {selectedPath ? (
              <>
                {/* File header */}
                <div className="flex h-9 items-center justify-between border-b border-[var(--editor-border)] bg-[var(--title-bar-bg)] px-3">
                  <div className="flex items-center gap-2 text-xs">
                    {getFileIcon(selectedPath, false)}
                    <span className="font-mono">{selectedPath}</span>
                    {entries.get(selectedPath)?.isModified && (
                      <span className="rounded bg-emerald-500/20 px-1 text-[9px] font-bold text-emerald-400">
                        MODIFIED
                      </span>
                    )}
                    <span className="text-muted-foreground">
                      · {formatBytes(entries.get(selectedPath)?.size || 0)}
                    </span>
                  </div>
                  {isTextFile(selectedPath) && (
                    <Button
                      onClick={handleSave}
                      size="sm"
                      className="h-7 text-xs"
                      disabled={!hasUnsavedChanges}
                    >
                      <Save className="mr-1.5 h-3 w-3" />
                      {hasUnsavedChanges ? 'Save*' : 'Saved'}
                    </Button>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden">
                  {isTextFile(selectedPath) ? (
                    <textarea
                      value={editingContent}
                      onChange={(e) => {
                        setEditingContent(e.target.value)
                        setHasUnsavedChanges(true)
                      }}
                      className="h-full w-full resize-none bg-[var(--editor-bg)] p-4 font-mono text-xs leading-relaxed text-foreground outline-none"
                      spellCheck={false}
                    />
                  ) : imagePreview ? (
                    <div className="flex h-full items-center justify-center bg-black/20 p-8">
                      <img
                        src={imagePreview}
                        alt={selectedPath}
                        className="max-h-full max-w-full object-contain"
                        style={{ imageRendering: 'pixelated' }}
                      />
                    </div>
                  ) : hexData ? (
                    <ScrollArea className="h-full">
                      <pre className="p-4 font-mono text-[11px] leading-relaxed text-foreground whitespace-pre">
                        {hexData}
                      </pre>
                    </ScrollArea>
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      <p>Cannot preview this file type</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center text-center">
                <FileText className="mb-3 h-12 w-12 opacity-30" />
                <p className="text-sm text-muted-foreground">Pilih file di sidebar untuk mulai edit</p>
                <p className="mt-1 text-xs text-muted-foreground/70">
                  Text files bisa di-edit langsung · Images di-preview · Binary di hex view
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function FeatureCard({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-[var(--editor-border)] bg-[var(--side-bar-bg)] p-3 text-left">
      <Icon className="mb-2 h-5 w-5 text-emerald-400" />
      <h4 className="text-xs font-semibold">{title}</h4>
      <p className="mt-0.5 text-[10px] text-muted-foreground">{desc}</p>
    </div>
  )
}
