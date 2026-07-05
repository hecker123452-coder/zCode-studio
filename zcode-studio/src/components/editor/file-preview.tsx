'use client'

import { useState, useMemo, useEffect } from 'react'
import { Image as ImageIcon, Download, ExternalLink, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import { useEditorStore } from '@/store/editor-store'
import { useFileOperations } from '@/hooks/use-file-operations'
import { cn } from '@/lib/utils'

interface FilePreviewProps {
  fileId: string
}

/**
 * Renders image preview OR markdown preview based on file type.
 * Used in place of Monaco editor for binary/image files.
 */
export function FilePreview({ fileId }: FilePreviewProps) {
  const file = useEditorStore(s => s.files[fileId])
  const { saveToDevice } = useFileOperations()

  if (!file) return null

  // Image files
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)
  const isMarkdown = ['md', 'markdown'].includes(ext)

  if (isImage) {
    return <ImagePreview fileId={fileId} />
  }

  if (isMarkdown) {
    return <MarkdownPreview fileId={fileId} />
  }

  // Fallback: show file info
  return (
    <div className="flex h-full flex-col items-center justify-center bg-[var(--editor-bg)] p-8 text-center">
      <ImageIcon className="mb-3 h-12 w-12 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        Preview gak tersedia buat file .{ext}
      </p>
      <button
        onClick={() => saveToDevice(fileId)}
        className="mt-3 rounded-lg bg-[var(--list-hover)] px-4 py-2 text-xs font-medium text-foreground hover:bg-[var(--list-active)]"
      >
        <Download className="mr-2 inline h-3.5 w-3.5" />
        Save to Device
      </button>
    </div>
  )
}

function ImagePreview({ fileId }: { fileId: string }) {
  const file = useEditorStore(s => s.files[fileId])
  const { saveToDevice } = useFileOperations()
  const [zoom, setZoom] = useState(1)

  if (!file) return null

  // Use content as data URL (binary files are stored as base64 data URLs)
  const src = file.content?.startsWith('data:') ? file.content : `data:image/${file.name.split('.').pop()};base64,${file.content || ''}`

  const fileSize = file.content ? Math.round(file.content.length * 0.75) : 0 // base64 → bytes approx
  const sizeStr = fileSize > 1024 * 1024
    ? `${(fileSize / (1024 * 1024)).toFixed(1)} MB`
    : fileSize > 1024
    ? `${(fileSize / 1024).toFixed(1)} KB`
    : `${fileSize} B`

  return (
    <div className="flex h-full flex-col bg-[var(--editor-bg)]">
      {/* Toolbar */}
      <div className="flex h-10 items-center justify-between border-b border-[var(--editor-border)] px-3">
        <div className="flex items-center gap-2 text-xs">
          <ImageIcon className="h-3.5 w-3.5" />
          <span className="font-medium">{file.name}</span>
          <span className="text-muted-foreground">{sizeStr}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom(z => Math.max(0.1, z - 0.1))}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-[var(--list-hover)] hover:text-foreground"
            title="Zoom out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="w-12 text-center text-[10px] text-muted-foreground">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(z => Math.min(5, z + 0.1))}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-[var(--list-hover)] hover:text-foreground"
            title="Zoom in"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-[var(--list-hover)] hover:text-foreground"
            title="Reset zoom"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => saveToDevice(fileId)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-[var(--list-hover)] hover:text-foreground"
            title="Save to device"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-[var(--list-hover)] hover:text-foreground"
            title="Open in new tab"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* Image */}
      <div className="flex-1 overflow-auto bg-[var(--editor-bg)] p-4" style={{
        backgroundImage: 'linear-gradient(45deg, #2a2a2a 25%, transparent 25%, transparent 75%, #2a2a2a 75%, #2a2a2a), linear-gradient(45deg, #2a2a2a 25%, #1a1a1a 25%, #1a1a1a 75%, #2a2a2a 75%, #2a2a2a)',
        backgroundSize: '20px 20px',
        backgroundPosition: '0 0, 10px 10px',
      }}>
        <div className="flex min-h-full items-center justify-center">
          <img
            src={src}
            alt={file.name}
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center', transition: 'transform 0.1s' }}
            className="max-w-none shadow-2xl"
          />
        </div>
      </div>
    </div>
  )
}

function MarkdownPreview({ fileId }: { fileId: string }) {
  const file = useEditorStore(s => s.files[fileId])
  const [view, setView] = useState<'split' | 'preview' | 'source'>('split')

  // Render markdown to HTML (simple inline renderer)
  const html = useMemo(() => renderMarkdown(file?.content || ''), [file?.content])

  if (!file) return null

  return (
    <div className="flex h-full flex-col bg-[var(--editor-bg)]">
      {/* Toolbar */}
      <div className="flex h-10 items-center justify-between border-b border-[var(--editor-border)] px-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-medium">{file.name}</span>
          <span className="text-muted-foreground">Markdown Preview</span>
        </div>
        <div className="flex items-center gap-1 rounded-md border border-[var(--editor-border)] p-0.5 text-[10px]">
          <button
            onClick={() => setView('source')}
            className={cn('rounded px-2 py-0.5', view === 'source' ? 'bg-[var(--list-hover)] text-foreground' : 'text-muted-foreground')}
          >
            Source
          </button>
          <button
            onClick={() => setView('split')}
            className={cn('rounded px-2 py-0.5', view === 'split' ? 'bg-[var(--list-hover)] text-foreground' : 'text-muted-foreground')}
          >
            Split
          </button>
          <button
            onClick={() => setView('preview')}
            className={cn('rounded px-2 py-0.5', view === 'preview' ? 'bg-[var(--list-hover)] text-foreground' : 'text-muted-foreground')}
          >
            Preview
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {view !== 'preview' && (
          <div className={cn('overflow-auto', view === 'split' ? 'w-1/2 border-r border-[var(--editor-border)]' : 'w-full')}>
            <pre className="p-4 text-[13px] font-mono whitespace-pre-wrap break-words text-[var(--list-foreground)]">{file.content}</pre>
          </div>
        )}
        {view !== 'source' && (
          <div className={cn('overflow-auto', view === 'split' ? 'w-1/2' : 'w-full')}>
            <div
              className="markdown-preview p-6 text-[14px] leading-relaxed text-[var(--list-foreground)]"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Simple markdown renderer. Handles:
 * - Headers (#, ##, ###)
 * - Bold (**text**)
 * - Italic (*text*)
 * - Code blocks (```)
 * - Inline code (`code`)
 * - Links ([text](url))
 * - Images (![alt](url))
 * - Lists (-, 1.)
 * - Tables
 * - Blockquotes (>)
 * - HR (---)
 */
function renderMarkdown(md: string): string {
  const lines = md.split('\n')
  let html = ''
  let inCodeBlock = false
  let codeBlockLang = ''
  let inList = false
  let listType: 'ul' | 'ol' | null = null
  let inTable = false
  let tableRows: string[][] = []

  const escapeHtml = (s: string) => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  const inline = (s: string) => {
    let r = escapeHtml(s)
    // Images
    r = r.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:6px;margin:8px 0" />')
    // Links
    r = r.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#6366f1;text-decoration:underline">$1</a>')
    // Bold
    r = r.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    r = r.replace(/__([^_]+)__/g, '<strong>$1</strong>')
    // Italic
    r = r.replace(/\*([^*]+)\*/g, '<em>$1</em>')
    r = r.replace(/_([^_]+)_/g, '<em>$1</em>')
    // Inline code
    r = r.replace(/`([^`]+)`/g, '<code style="background:#2a2a2a;padding:2px 6px;border-radius:3px;font-family:monospace;font-size:0.9em">$1</code>')
    return r
  }

  const flushList = () => {
    if (inList && listType) {
      html += `</${listType}>`
      inList = false
      listType = null
    }
  }

  const flushTable = () => {
    if (inTable && tableRows.length > 0) {
      html += '<table style="border-collapse:collapse;width:100%;margin:12px 0;font-size:13px">'
      const isHeader = tableRows.length >= 2
      tableRows.forEach((row, idx) => {
        const isHeaderRow = isHeader && idx === 0
        const skipRow = isHeader && idx === 1 // separator row |---|---|
        if (skipRow) return
        const tag = isHeaderRow ? 'th' : 'td'
        html += '<tr>'
        row.forEach(cell => {
          html += `<${tag} style="border:1px solid #444;padding:6px 10px;text-align:left;${isHeaderRow ? 'background:#2a2a2a;font-weight:bold' : ''}">${inline(cell.trim())}</${tag}>`
        })
        html += '</tr>'
      })
      html += '</table>'
      tableRows = []
      inTable = false
    }
  }

  for (const line of lines) {
    // Code block
    if (line.trim().startsWith('```')) {
      if (!inCodeBlock) {
        flushList()
        flushTable()
        inCodeBlock = true
        codeBlockLang = line.trim().substring(3)
        html += `<pre style="background:#1a1a1a;border:1px solid #333;border-radius:6px;padding:12px;overflow-x:auto;margin:10px 0"><code style="font-family:monospace;font-size:13px">`
      } else {
        html += '</code></pre>'
        inCodeBlock = false
        codeBlockLang = ''
      }
      continue
    }
    if (inCodeBlock) {
      html += escapeHtml(line) + '\n'
      continue
    }

    // Table row
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      flushList()
      inTable = true
      const cells = line.split('|').slice(1, -1)
      tableRows.push(cells)
      continue
    } else if (inTable) {
      flushTable()
    }

    // Empty line
    if (line.trim() === '') {
      flushList()
      html += '<br/>'
      continue
    }

    // Headers
    if (line.startsWith('# ')) {
      flushList()
      html += `<h1 style="font-size:1.8em;font-weight:bold;margin:16px 0 8px">${inline(line.substring(2))}</h1>`
      continue
    }
    if (line.startsWith('## ')) {
      flushList()
      html += `<h2 style="font-size:1.4em;font-weight:bold;margin:14px 0 6px">${inline(line.substring(3))}</h2>`
      continue
    }
    if (line.startsWith('### ')) {
      flushList()
      html += `<h3 style="font-size:1.15em;font-weight:bold;margin:12px 0 4px">${inline(line.substring(4))}</h3>`
      continue
    }
    if (line.startsWith('#### ')) {
      flushList()
      html += `<h4 style="font-size:1em;font-weight:bold;margin:10px 0 4px">${inline(line.substring(5))}</h4>`
      continue
    }

    // HR
    if (line.trim() === '---' || line.trim() === '***' || line.trim() === '___') {
      flushList()
      html += '<hr style="border:none;border-top:1px solid #444;margin:14px 0"/>'
      continue
    }

    // Blockquote
    if (line.startsWith('> ')) {
      flushList()
      html += `<blockquote style="border-left:3px solid #6366f1;padding-left:12px;margin:8px 0;color:#aaa;font-style:italic">${inline(line.substring(2))}</blockquote>`
      continue
    }

    // Unordered list
    if (line.match(/^[-*+]\s+/)) {
      if (!inList || listType !== 'ul') {
        flushList()
        inList = true
        listType = 'ul'
        html += '<ul style="margin:6px 0 6px 20px;list-style:disc">'
      }
      html += `<li style="margin:2px 0">${inline(line.replace(/^[-*+]\s+/, ''))}</li>`
      continue
    }

    // Ordered list
    if (line.match(/^\d+\.\s+/)) {
      if (!inList || listType !== 'ol') {
        flushList()
        inList = true
        listType = 'ol'
        html += '<ol style="margin:6px 0 6px 20px;list-style:decimal">'
      }
      html += `<li style="margin:2px 0">${inline(line.replace(/^\d+\.\s+/, ''))}</li>`
      continue
    }

    // Regular paragraph
    flushList()
    html += `<p style="margin:6px 0">${inline(line)}</p>`
  }

  flushList()
  flushTable()
  if (inCodeBlock) html += '</code></pre>'

  return html
}
