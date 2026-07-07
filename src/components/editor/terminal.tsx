'use client'

import { useState, useRef, useEffect } from 'react'
import { Terminal as TerminalIcon, X, Plus, ChevronDown, Trash2 } from 'lucide-react'
import { useEditorStore } from '@/store/editor-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { transpileIndoCode } from '@/lib/editor/indocode'

interface TerminalLine {
  type: 'input' | 'output' | 'error' | 'system'
  content: string
}

const SYSTEM_BANNER = `
██╗ ██████╗ ██████╗ ██████╗ ███████╗
║║║╚════██║╚════██║╚════██║██╔════╝
║║║ █████╔╝ █████╔╝ █████╔╝█████╗
╚═╝ ██╔═══╝ ██╔═══╝ ██╔═══╝ ██╔══╝
    ███████╗ ███████╗ ███████╗███████╗
    ╚══════╝ ╚══════╝ ╚══════╝╚══════╝

ZCode Studio Terminal v2.0.0
Type 'help' to see available commands.
`

export function Terminal() {
  const [lines, setLines] = useState<TerminalLine[]>([
    { type: 'system', content: SYSTEM_BANNER },
  ])
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [cwd, setCwd] = useState('~')

  const files = useEditorStore(s => s.files)
  const rootFileIds = useEditorStore(s => s.rootFileIds)
  const openTab = useEditorStore(s => s.openTab)
  const setTerminalOpen = useEditorStore(s => s.setTerminalOpen)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [lines])

  const addLine = (type: TerminalLine['type'], content: string) => {
    setLines(prev => [...prev, { type, content }])
  }

  const runCommand = async (cmd: string) => {
    const trimmed = cmd.trim()
    addLine('input', `${cwd} $ ${cmd}`)

    if (!trimmed) return

    setHistory(prev => [...prev, trimmed])
    setHistoryIndex(-1)

    const [command, ...args] = trimmed.split(/\s+/)

    switch (command.toLowerCase()) {
      case 'help':
        addLine('output', `ZCode Terminal v2.0 — Available commands:

FILE OPS:
  ls                List files
  cat <file>        Show file content
  open <file>       Open file in editor
  tree              Show file tree
  stats             Project statistics
  find <name>       Find file by name

CODE OPS:
  run <file.indo>   Run IndoCode file (transpile + show JS output)
  transpile <file>  Transpile IndoCode → JavaScript
  format <file>     Basic code formatter (trim trailing whitespace)
  minify <file>     Minify JS/CSS (basic)
  count <file>      Count lines, words, chars

GIT (LOCAL):
  git status        Show modified files (vs last commit)
  git log           Show commit history
  git commit <msg>  Create commit snapshot
  git diff <file>   Show diff for file

AI:
  ai <prompt>       Ask AI a question (prints response)

UTILITY:
  help              This help
  clear             Clear terminal
  echo <text>       Print text
  date              Current date/time
  pwd               Current directory
  whoami            Current user
  neofetch          System info
  theme             Show theme
  exit              Close terminal`)
        break

      case 'ls':
        const items = rootFileIds.map(id => files[id]).filter(Boolean)
        const folders = items.filter(i => i.type === 'folder')
        const fileList = items.filter(i => i.type === 'file')
        const output = [
          ...folders.map(f => ` ${f.name}/`),
          ...fileList.map(f => ` ${f.name}`),
        ].join('  ')
        addLine('output', output || '(empty)')
        break

      case 'cat':
        if (!args[0]) {
          addLine('error', 'Usage: cat <filename>')
          break
        }
        const catFile = Object.values(files).find(f => f.name === args[0] && f.type === 'file')
        if (catFile) {
          addLine('output', catFile.content || '(empty file)')
        } else {
          addLine('error', `cat: ${args[0]}: No such file`)
        }
        break

      case 'open':
        if (!args[0]) {
          addLine('error', 'Usage: open <filename>')
          break
        }
        const openFile = Object.values(files).find(f => f.name === args[0] && f.type === 'file')
        if (openFile) {
          openTab(openFile.id, false)
          addLine('output', `Opening ${args[0]}...`)
        } else {
          addLine('error', `open: ${args[0]}: No such file`)
        }
        break

      case 'clear':
      case 'cls':
        setLines([])
        break

      case 'echo':
        addLine('output', args.join(' '))
        break

      case 'date':
        addLine('output', new Date().toString())
        break

      case 'whoami':
        addLine('output', 'zcode-developer')
        break

      case 'pwd':
        addLine('output', `/home/zcode${cwd === '~' ? '' : '/' + cwd}`)
        break

      case 'cd':
        if (!args[0] || args[0] === '~' || args[0] === '/') {
          setCwd('~')
        } else if (args[0] === '..') {
          setCwd('~')
        } else {
          const dir = Object.values(files).find(f => f.name === args[0] && f.type === 'folder')
          if (dir) {
            setCwd(args[0])
          } else {
            addLine('error', `cd: ${args[0]}: No such directory`)
          }
        }
        break

      case 'tree':
        const buildTree = (parentId: string | null, prefix = ''): string[] => {
          const items = Object.values(files)
            .filter(f => f.parentId === parentId)
            .sort((a, b) => {
              if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
              return a.name.localeCompare(b.name)
            })
          const result: string[] = []
          items.forEach((item, idx) => {
            const isLast = idx === items.length - 1
            const icon = item.type === 'folder' ? '' : ''
            result.push(`${prefix}${isLast ? '└── ' : '├── '}${icon} ${item.name}`)
            if (item.type === 'folder' && item.children) {
              result.push(...buildTree(item.id, prefix + (isLast ? '    ' : '│   ')))
            }
          })
          return result
        }
        addLine('output', '~\n' + buildTree(null).join('\n'))
        break

      case 'stats':
        const allFiles = Object.values(files).filter(f => f.type === 'file')
        const allFolders = Object.values(files).filter(f => f.type === 'folder')
        const totalLines = allFiles.reduce((sum, f) => sum + (f.content?.split('\n').length || 0), 0)
        const totalChars = allFiles.reduce((sum, f) => sum + (f.content?.length || 0), 0)
        const languages = new Set(allFiles.map(f => f.language))
        addLine('output', `Project Statistics:
  Files:      ${allFiles.length}
  Folders:    ${allFolders.length}
  Lines:      ${totalLines.toLocaleString()}
  Characters: ${totalChars.toLocaleString()}
  Languages:  ${languages.size} (${[...languages].join(', ')})`)
        break

      case 'theme':
        const currentTheme = useEditorStore.getState().theme
        const uiTheme = useEditorStore.getState().uiTheme
        addLine('output', `Editor Theme: ${currentTheme}
UI Theme: ${uiTheme}`)
        break

      case 'neofetch':
        addLine('output', `       _-_         zcode-developer@zcode-studio
    /~~   ~~\\       --------------------
 ~-~|~~~~~~|       OS:       ZCode Studio Web
    |    |       Editor:   Monaco (VS Code engine)
    |______|       Theme:    ${useEditorStore.getState().theme}
                  Shell:    zsh-simulated
 /  \\____/  \\      Files:    ${Object.values(files).filter(f => f.type === 'file').length}
/    ~    ~   \\    Memory:   ${(JSON.stringify(files).length / 1024).toFixed(2)} KB
\\   ~      ~  /
 \\___~~~~___/     `)
        break

      // === NEW: Code operations ===
      case 'run': {
        if (!args[0]) {
          addLine('error', 'Usage: run <file.indo>')
          break
        }
        const runFile = Object.values(files).find(f => f.name === args[0] && f.type === 'file')
        if (!runFile) {
          addLine('error', `run: ${args[0]}: No such file`)
          break
        }
        if (runFile.language !== 'indocode') {
          addLine('error', `run: ${args[0]} is not an IndoCode file (.indo)`)
          break
        }
        addLine('output', `Running ${args[0]}...`)
        const result = transpileIndoCode(runFile.content || '')
        if (result.success) {
          addLine('output', `✓ Transpile success. JavaScript output:`)
          addLine('output', '---')
          addLine('output', result.code)
          addLine('output', '---')
          addLine('output', 'Open Run Panel (Ctrl+Shift+R) untuk menjalankan dengan UI penuh.')
        } else {
          addLine('error', `✗ Transpile failed:`)
          result.errors.forEach(err => {
            addLine('error', `  Line ${err.line}: ${err.message}`)
          })
        }
        break
      }

      case 'transpile': {
        if (!args[0]) {
          addLine('error', 'Usage: transpile <file.indo>')
          break
        }
        const transFile = Object.values(files).find(f => f.name === args[0] && f.type === 'file')
        if (!transFile) {
          addLine('error', `transpile: ${args[0]}: No such file`)
          break
        }
        if (transFile.language !== 'indocode') {
          addLine('error', `transpile: ${args[0]} is not IndoCode`)
          break
        }
        const result = transpileIndoCode(transFile.content || '')
        if (result.success) {
          addLine('output', result.code)
        } else {
          addLine('error', 'Transpile errors:')
          result.errors.forEach(err => addLine('error', `  L${err.line}: ${err.message}`))
        }
        break
      }

      case 'format': {
        if (!args[0]) {
          addLine('error', 'Usage: format <file>')
          break
        }
        const fmtFile = Object.values(files).find(f => f.name === args[0] && f.type === 'file')
        if (!fmtFile) {
          addLine('error', `format: ${args[0]}: No such file`)
          break
        }
        const content = fmtFile.content || ''
        // Basic formatting: trim trailing whitespace, ensure final newline
        const formatted = content
          .split('\n')
          .map(line => line.replace(/\s+$/, ''))
          .join('\n')
          .replace(/\n{3,}/g, '\n\n') + '\n'
        const savedLines = content.split('\n').length
        const newLines = formatted.split('\n').length
        useEditorStore.getState().updateFileContent(fmtFile.id, formatted)
        addLine('output', `✓ Formatted ${args[0]} (${savedLines} → ${newLines} lines, trimmed trailing whitespace)`)
        break
      }

      case 'minify': {
        if (!args[0]) {
          addLine('error', 'Usage: minify <file>')
          break
        }
        const minFile = Object.values(files).find(f => f.name === args[0] && f.type === 'file')
        if (!minFile) {
          addLine('error', `minify: ${args[0]}: No such file`)
          break
        }
        const content = minFile.content || ''
        const originalSize = content.length
        // Basic minification: remove comments, collapse whitespace
        let minified = content
          .replace(/\/\*[\s\S]*?\*\//g, '') // block comments
          .replace(/\/\/.*$/gm, '') // line comments
          .replace(/\s+/g, ' ') // collapse whitespace
          .replace(/\s*([{}();,:])\s*/g, '$1') // trim around punctuation
          .trim()
        const newSize = minified.length
        const savings = ((1 - newSize / originalSize) * 100).toFixed(1)
        addLine('output', `✓ Minified ${args[0]}`)
        addLine('output', `  Original: ${originalSize} chars`)
        addLine('output', `  Minified: ${newSize} chars (-${savings}%)`)
        addLine('output', `  Output:`)
        addLine('output', minified.slice(0, 500) + (minified.length > 500 ? '...' : ''))
        break
      }

      case 'count': {
        if (!args[0]) {
          addLine('error', 'Usage: count <file>')
          break
        }
        const countFile = Object.values(files).find(f => f.name === args[0] && f.type === 'file')
        if (!countFile) {
          addLine('error', `count: ${args[0]}: No such file`)
          break
        }
        const content = countFile.content || ''
        const lines = content.split('\n').length
        const words = content.split(/\s+/).filter(Boolean).length
        const chars = content.length
        const charsNoSpaces = content.replace(/\s/g, '').length
        addLine('output', `${args[0]}:
  Lines:         ${lines}
  Words:         ${words}
  Characters:    ${chars}
  Chars (no sp): ${charsNoSpaces}`)
        break
      }

      case 'find': {
        if (!args[0]) {
          addLine('error', 'Usage: find <name>')
          break
        }
        const query = args[0].toLowerCase()
        const matches = Object.values(files).filter(f =>
          f.type === 'file' && f.name.toLowerCase().includes(query)
        )
        if (matches.length === 0) {
          addLine('output', `No files matching "${args[0]}"`)
        } else {
          addLine('output', `Found ${matches.length} file(s):`)
          matches.forEach(f => addLine('output', `  ${f.name}`))
        }
        break
      }

      // === NEW: Git (local source control) ===
      case 'git': {
        const subcommand = args[0]?.toLowerCase()
        const store = useEditorStore.getState()

        if (subcommand === 'status') {
          const modified = store.getModifiedFiles()
          if (modified.length === 0) {
            addLine('output', 'On branch main\nNo changes since last commit.')
          } else {
            addLine('output', `On branch main\nChanges not staged for commit:`)
            modified.forEach(m => {
              const symbol = m.status === 'added' ? '??' : m.status === 'deleted' ? ' D' : ' M'
              addLine('output', `  ${symbol}  ${m.file.name}`)
            })
            addLine('output', `\nUse "git commit <msg>" to snapshot changes.`)
          }
        } else if (subcommand === 'log') {
          if (store.commits.length === 0) {
            addLine('output', 'No commits yet.')
          } else {
            addLine('output', `Commit history (${store.commits.length}):`)
            store.commits.forEach((c, i) => {
              addLine('output', `\ncommit ${c.id}`)
              addLine('output', `Author: zcode-developer <dev@zcode.studio>`)
              addLine('output', `Date:   ${new Date(c.createdAt).toLocaleString('id-ID')}`)
              addLine('output', `\n    ${c.message}`)
            })
          }
        } else if (subcommand === 'commit') {
          const message = args.slice(1).join(' ')
          if (!message) {
            addLine('error', 'Usage: git commit <message>')
            break
          }
          const modified = store.getModifiedFiles()
          if (modified.length === 0) {
            addLine('error', 'Nothing to commit. No changes since last commit.')
            break
          }
          const id = store.createCommit(message)
          addLine('output', `[main ${id.slice(-7)}] ${message}`)
          addLine('output', ` ${modified.length} files changed`)
        } else if (subcommand === 'diff') {
          const fileName = args[1]
          if (!fileName) {
            addLine('error', 'Usage: git diff <file>')
            break
          }
          const file = Object.values(files).find(f => f.name === fileName && f.type === 'file')
          if (!file) {
            addLine('error', `git diff: ${fileName}: No such file`)
            break
          }
          const snapshot = store.savedSnapshots[file.id]
          if (snapshot === undefined) {
            addLine('output', `New file (no previous commit)`)
          } else if (snapshot === file.content) {
            addLine('output', `No changes in ${fileName}`)
          } else {
            // Simple line-by-line diff
            const oldLines = snapshot.split('\n')
            const newLines = (file.content || '').split('\n')
            addLine('output', `diff --git a/${fileName} b/${fileName}`)
            addLine('output', `--- ${oldLines.length} lines`)
            addLine('output', `+++ ${newLines.length} lines`)
            const maxLines = Math.max(oldLines.length, newLines.length)
            let added = 0, removed = 0
            for (let i = 0; i < Math.min(maxLines, 50); i++) { // cap at 50 lines
              const oldL = oldLines[i]
              const newL = newLines[i]
              if (oldL === newL) continue
              if (oldL === undefined && newL !== undefined) {
                addLine('output', `+ ${newL}`)
                added++
              } else if (newL === undefined && oldL !== undefined) {
                addLine('output', `- ${oldL}`)
                removed++
              } else {
                addLine('output', `- ${oldL}`)
                addLine('output', `+ ${newL}`)
                added++
                removed++
              }
            }
            if (maxLines > 50) addLine('output', `... (${maxLines - 50} more lines)`)
            addLine('output', `\n${added} additions, ${removed} deletions`)
          }
        } else {
          addLine('error', `git: '${subcommand}' is not a git command. Try: status, log, commit, diff`)
        }
        break
      }

      // === NEW: AI query ===
      case 'ai': {
        const prompt = args.join(' ')
        if (!prompt) {
          addLine('error', 'Usage: ai <your question>')
          break
        }
        addLine('output', `🤖 Asking AI: "${prompt}"`)
        addLine('output', '   (thinking...)')
        try {
          const res = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: [{ role: 'user', content: prompt }],
              stream: false,
            }),
          })
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const data = await res.json()
          addLine('output', `\n🤖 AI:`)
          // Split long responses into multiple lines
          const reply = data.reply || '(no response)'
          reply.split('\n').forEach((line: string) => addLine('output', line))
        } catch (err) {
          addLine('error', `AI error: ${(err as Error).message}`)
        }
        break
      }

      case 'exit':
        setTerminalOpen(false)
        break

      case '':
        break

      default:
        addLine('error', `zsh: command not found: ${command}. Type 'help' for available commands.`)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const cmd = input
      setInput('')
      runCommand(cmd)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (history.length > 0) {
        const newIdx = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1)
        setHistoryIndex(newIdx)
        setInput(history[newIdx])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex !== -1) {
        const newIdx = historyIndex + 1
        if (newIdx >= history.length) {
          setHistoryIndex(-1)
          setInput('')
        } else {
          setHistoryIndex(newIdx)
          setInput(history[newIdx])
        }
      }
    } else if (e.key === 'l' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      setLines([])
    }
  }

  return (
    <div className="flex h-full flex-col bg-[var(--terminal-bg)] text-[var(--terminal-fg)]">
      {/* Terminal Header */}
      <div className="flex h-8 items-center justify-between border-b border-[var(--editor-border)] px-2">
        <div className="flex items-center gap-2">
          <TerminalIcon className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">TERMINAL</span>
          <Button size="icon" variant="ghost" className="h-5 w-5">
            <ChevronDown className="h-3 w-3" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5"
            onClick={() => setLines([{ type: 'system', content: SYSTEM_BANNER }])}
            title="Clear"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5"
            onClick={() => setTerminalOpen(false)}
            title="Close"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Terminal Output */}
      <div
        ref={scrollRef}
        onClick={() => inputRef.current?.focus()}
        className="flex-1 cursor-text overflow-y-auto p-2 font-mono text-[12px] leading-relaxed"
      >
        {lines.map((line, i) => (
          <div
            key={i}
            className={cn(
              'whitespace-pre-wrap break-all',
              line.type === 'error' && 'text-foreground font-bold',
              line.type === 'system' && 'text-muted-foreground',
              line.type === 'input' && 'text-foreground',
              line.type === 'output' && 'text-[var(--terminal-fg)]'
            )}
          >
            {line.content}
          </div>
        ))}
        {/* Input line */}
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">{cwd}</span>
          <span className="text-muted-foreground">$</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent font-mono text-[12px] text-foreground outline-none"
            autoFocus
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  )
}
