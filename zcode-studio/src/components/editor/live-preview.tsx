'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { Eye, RefreshCw, ExternalLink, Smartphone, Monitor, Tablet, Loader2, ArrowLeft } from 'lucide-react'
import { useEditorStore } from '@/store/editor-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { transpileIndoCode, isIndoHTML, getIndoCodeRuntimeHelpers } from '@/lib/editor/indocode'

type Device = 'desktop' | 'tablet' | 'mobile'

const deviceWidths: Record<Device, number> = {
  desktop: 1280,
  tablet: 768,
  mobile: 375,
}

interface LivePreviewProps {
  fileId: string
  isMobile?: boolean
  onClose?: () => void
}

export function LivePreview({ fileId, isMobile = false, onClose }: LivePreviewProps) {
  const [device, setDevice] = useState<Device>(isMobile ? 'mobile' : 'desktop')
  const [refreshKey, setRefreshKey] = useState(0)
  const files = useEditorStore(s => s.files)

  const file = files[fileId]
  const html = file?.content || ''

  // Debounce HTML content to prevent lag on paste/typing
  const [debouncedHtml, setDebouncedHtml] = useState(html)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastHtmlRef = useRef(html)

  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    // Show refreshing indicator if content actually changed
    const hasChanged = html !== lastHtmlRef.current
    if (hasChanged) {
      // Use microtask to defer state update (avoid effect-cascade warning)
      Promise.resolve().then(() => setIsRefreshing(true))
    }

    debounceTimer.current = setTimeout(() => {
      setDebouncedHtml(html)
      lastHtmlRef.current = html
      setIsRefreshing(false)
    }, 400) // 400ms debounce - good balance between responsiveness and performance

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [html])

  // Build the preview HTML - only recompute when debounced content changes
  const previewHtml = useMemo(() => {
    if (!debouncedHtml) {
      return '<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;padding:24px;color:#888;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#fafafa;"><div style="text-align:center;"><div style="font-size:48px;margin-bottom:12px;"></div><h2 style="margin:0 0 8px;color:#555;">No content to preview</h2><p style="margin:0;color:#999;font-size:14px;">Start typing HTML to see live preview</p></div></body></html>'
    }

    // Detect IndoCode HTML and transpile to standard HTML before rendering
    let processedHtml = debouncedHtml
    try {
      if (isIndoHTML(debouncedHtml)) {
        const result = transpileIndoCode(debouncedHtml)
        if (result.success && result.code) {
          processedHtml = result.code
          // Inject runtime helpers (defines __ambilElemen, __aturSelang, canvas polyfills, etc.)
          const helpers = getIndoCodeRuntimeHelpers()
          const helperScript = '<script>\n' + helpers + '\n</script>'
          if (processedHtml.includes('<head>')) {
            processedHtml = processedHtml.replace('<head>', '<head>' + helperScript)
          } else if (processedHtml.includes('<body>')) {
            processedHtml = processedHtml.replace('<body>', '<body>' + helperScript)
          } else {
            processedHtml = helperScript + processedHtml
          }
        }
      }
    } catch (e) {
      console.error('IndoCode transpile error in Live Preview:', e)
    }

    let result = processedHtml

    // Inline CSS files referenced via <link rel="stylesheet" href="...">
    try {
      result = result.replace(
        /<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi,
        (match, href) => {
          const fileName = href.split('/').pop() || href
          const cssFile = Object.values(files).find(f => f.name === fileName && f.type === 'file')
          if (cssFile?.content) {
            return `<style>\n${cssFile.content}\n</style>`
          }
          return match
        }
      )

      // Inline JS files referenced via <script src="...">
      result = result.replace(
        /<script[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi,
        (match, src) => {
          const fileName = src.split('/').pop() || src
          const jsFile = Object.values(files).find(f => f.name === fileName && f.type === 'file')
          if (jsFile?.content) {
            return `<script>\n${jsFile.content}\n</script>`
          }
          return match
        }
      )
    } catch (e) {
      console.error('Preview processing error:', e)
    }

    return result
    // `refreshKey` is intentionally a dependency — bumping it forces recompute
    // even when `debouncedHtml` and `files` haven't changed (used by the
    // Refresh button). The exhaustive-deps rule flags it as "unnecessary"
    // because it's a state counter, not data — but that's exactly the point.
     
  }, [debouncedHtml, files, refreshKey])

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true)
    setRefreshKey(k => k + 1)
    // Force immediate update (bypass debounce)
    setDebouncedHtml(html)
    setTimeout(() => setIsRefreshing(false), 300)
  }, [html])

  const handleOpenExternal = useCallback(() => {
    const blob = new Blob([previewHtml], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 10000)
  }, [previewHtml])

  if (!file) return null

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Preview Header */}
      <div className={cn(
        'flex items-center justify-between border-b border-[var(--editor-border)] bg-[var(--side-bar-bg)] px-2',
        isMobile ? 'h-12' : 'h-8'
      )}>
        <div className="flex items-center gap-2 min-w-0">
          {isMobile && onClose && (
            <button
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground active:bg-[var(--list-hover)] active:text-foreground"
              aria-label="Close preview"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <Eye className="h-3.5 w-3.5 shrink-0 text-foreground" />
          <span className="text-xs font-medium shrink-0">Live Preview</span>
          <span className="text-[10px] text-muted-foreground truncate">({file.name})</span>
          {isRefreshing && (
            <Loader2 className="h-3 w-3 shrink-0 animate-spin text-foreground" />
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Device selector */}
          <div className="flex items-center gap-0.5 rounded border border-[var(--editor-border)] p-0.5">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setDevice('desktop')}
              className={cn(isMobile ? 'h-7 w-7' : 'h-5 w-5', device === 'desktop' && 'bg-[var(--list-hover)]')}
              title="Desktop"
            >
              <Monitor className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setDevice('tablet')}
              className={cn(isMobile ? 'h-7 w-7' : 'h-5 w-5', device === 'tablet' && 'bg-[var(--list-hover)]')}
              title="Tablet"
            >
              <Tablet className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setDevice('mobile')}
              className={cn(isMobile ? 'h-7 w-7' : 'h-5 w-5', device === 'mobile' && 'bg-[var(--list-hover)]')}
              title="Mobile"
            >
              <Smartphone className="h-3 w-3" />
            </Button>
          </div>

          <Button
            size="icon"
            variant="ghost"
            className={isMobile ? 'h-7 w-7' : 'h-5 w-5'}
            onClick={handleRefresh}
            title="Refresh"
          >
            <RefreshCw className={cn('h-3 w-3', isRefreshing && 'animate-spin')} />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            className={isMobile ? 'h-7 w-7' : 'h-5 w-5'}
            onClick={handleOpenExternal}
            title="Open in new tab"
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Preview iframe - locked: NO scroll, NO drag, fills container exactly */}
      <div
        className="flex flex-1 items-stretch justify-center overflow-hidden bg-gray-100 p-0"
        style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
      >
        <iframe
          key={`${refreshKey}-${device}`}
          srcDoc={previewHtml}
          title="Live Preview"
          sandbox="allow-scripts allow-modals allow-popups allow-forms allow-pointer-lock allow-same-origin"
          className="h-full bg-white"
          style={{
            width: '100%',
            maxWidth: device === 'desktop' ? '100%' : `${deviceWidths[device]}px`,
            height: '100%',
            border: 'none',
            borderRadius: '0',
            pointerEvents: 'auto',
            // Prevent text selection / drag inside iframe container
            userSelect: 'none',
            WebkitUserSelect: 'none',
            WebkitTouchCallout: 'none',
          }}
          draggable={false}
        />
      </div>
    </div>
  )
}
