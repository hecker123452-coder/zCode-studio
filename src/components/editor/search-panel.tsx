'use client'

import { useState, useMemo } from 'react'
import {
  Search, CaseSensitive, Regex, WholeWord, X,
  ChevronRight, ChevronDown, FileText,
} from 'lucide-react'
import { useEditorStore } from '@/store/editor-store'
import { getFileIcon } from '@/lib/editor/file-icons'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

interface SearchResult {
  fileId: string
  fileName: string
  matches: { line: number; text: string; before: string; match: string; after: string }[]
}

export function SearchPanel() {
  const [query, setQuery] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [useRegex, setUseRegex] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set())

  const files = useEditorStore(s => s.files)
  const openTab = useEditorStore(s => s.openTab)

  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim()) return []
    const allFiles = Object.values(files).filter(f => f.type === 'file')
    const searchResults: SearchResult[] = []

    let regex: RegExp
    try {
      let pattern = useRegex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      if (wholeWord) pattern = `\\b${pattern}\\b`
      regex = new RegExp(pattern, caseSensitive ? 'g' : 'gi')
    } catch {
      return []
    }

    for (const file of allFiles) {
      const content = file.content || ''
      const lines = content.split('\n')
      const matches: SearchResult['matches'] = []

      lines.forEach((line, idx) => {
        let match
        regex.lastIndex = 0
        while ((match = regex.exec(line)) !== null) {
          const start = match.index
          const end = start + match[0].length
          matches.push({
            line: idx + 1,
            text: line,
            before: line.substring(Math.max(0, start - 30), start),
            match: match[0],
            after: line.substring(end, Math.min(line.length, end + 30)),
          })
          if (match.index === regex.lastIndex) regex.lastIndex++
        }
      })

      if (matches.length > 0) {
        searchResults.push({
          fileId: file.id,
          fileName: file.name,
          matches,
        })
      }
    }

    return searchResults
  }, [query, caseSensitive, useRegex, wholeWord, files])

  const totalMatches = results.reduce((sum, r) => sum + r.matches.length, 0)
  const totalFiles = results.length

  const toggleExpand = (fileId: string) => {
    setExpandedFiles(prev => {
      const next = new Set(prev)
      if (next.has(fileId)) next.delete(fileId)
      else next.add(fileId)
      return next
    })
  }

  // Jump to a specific line in the active Monaco editor (used when clicking search results)
  const jumpToLineInEditor = (lineNum: number) => {
    if (!lineNum || lineNum < 1) return
    // Defer to allow file open to complete first
    setTimeout(() => {
      const editors = (window as any).monaco?.editor?.getEditors?.() || []
      if (editors.length > 0) {
        const ed = editors[0]
        const model = ed.getModel()
        const lineCount = model ? model.getLineCount() : 1
        const target = Math.min(lineNum, lineCount)
        ed.revealLineInCenter(target)
        ed.setPosition({ lineNumber: target, column: 1 })
        ed.focus()
      }
    }, 150)
  }

  return (
    <div className="flex h-full flex-col bg-[var(--side-bar-bg)]">
      {/* Header */}
      <div className="flex h-9 items-center px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Pencarian
      </div>

      {/* Search input */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari..."
            className="bg-[var(--input-bg)] pr-20 text-[13px]"
            autoFocus
          />
          <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setCaseSensitive(!caseSensitive)}
              className={cn(
                'h-6 w-6',
                caseSensitive && 'bg-[var(--list-active)] text-foreground'
              )}
              title="Case Sensitif"
            >
              <span className="text-[11px] font-bold">Aa</span>
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setWholeWord(!wholeWord)}
              className={cn(
                'h-6 w-6',
                wholeWord && 'bg-[var(--list-active)] text-foreground'
              )}
              title="Kata Persis"
            >
              <WholeWord className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setUseRegex(!useRegex)}
              className={cn(
                'h-6 w-6',
                useRegex && 'bg-[var(--list-active)] text-foreground'
              )}
              title="Regex"
            >
              <Regex className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Results count */}
      {query && (
        <div className="px-3 pb-2 text-[11px] text-muted-foreground">
          {totalMatches} hasil di {totalFiles} file
        </div>
      )}

      {/* Results */}
      <ScrollArea className="flex-1">
        <div className="pb-4">
          {query && totalMatches === 0 && (
            <div className="px-3 py-8 text-center text-xs text-muted-foreground">
              Tidak ada hasil ditemukan
            </div>
          )}
          {results.map(result => {
            const isExpanded = expandedFiles.has(result.fileId)
            const iconInfo = getFileIcon(result.fileName)
            const Icon = iconInfo.icon

            return (
              <div key={result.fileId}>
                <div
                  onClick={() => toggleExpand(result.fileId)}
                  className="flex h-[26px] cursor-pointer items-center gap-1 px-2 hover:bg-[var(--list-hover)]"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <Icon className="h-4 w-4" style={{ color: iconInfo.color }} strokeWidth={1.5} />
                  <span className="flex-1 truncate text-[13px]">{result.fileName}</span>
                  <span className="rounded-full bg-[var(--input-bg)] px-1.5 text-[10px] text-muted-foreground">
                    {result.matches.length}
                  </span>
                </div>

                {isExpanded && result.matches.map((match, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      openTab(result.fileId, false)
                      jumpToLineInEditor(match.line)
                    }}
                    className="flex cursor-pointer items-start gap-1 py-1 pl-7 pr-2 hover:bg-[var(--list-hover)] active:bg-[var(--list-active)]"
                    title="Klik untuk lompat ke baris ini"
                  >
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {match.line}:
                    </span>
                    <span className="truncate font-mono text-[12px]">
                      <span className="text-muted-foreground">{match.before}</span>
                      <span className="bg-yellow-500/30 text-foreground">{match.match}</span>
                      <span className="text-muted-foreground">{match.after}</span>
                    </span>
                  </div>
                ))}

                {!isExpanded && result.matches.slice(0, 2).map((match, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      toggleExpand(result.fileId)
                      openTab(result.fileId, false)
                      jumpToLineInEditor(match.line)
                    }}
                    className="flex cursor-pointer items-start gap-1 py-0.5 pl-7 pr-2 hover:bg-[var(--list-hover)] active:bg-[var(--list-active)]"
                    title="Klik untuk lompat ke baris ini"
                  >
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {match.line}:
                    </span>
                    <span className="truncate font-mono text-[12px]">
                      <span className="text-muted-foreground">{match.before}</span>
                      <span className="bg-yellow-500/30 text-foreground">{match.match}</span>
                    </span>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
