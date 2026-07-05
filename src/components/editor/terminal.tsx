'use client'

import { useState, useRef, useEffect } from 'react'
import { Terminal as TerminalIcon, X, Plus, ChevronDown, Trash2 } from 'lucide-react'
import { useEditorStore } from '@/store/editor-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

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
                                       
ZCode Studio Terminal v1.0.0
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

  const runCommand = (cmd: string) => {
    const trimmed = cmd.trim()
    addLine('input', `${cwd} $ ${cmd}`)

    if (!trimmed) return

    setHistory(prev => [...prev, trimmed])
    setHistoryIndex(-1)

    const [command, ...args] = trimmed.split(/\s+/)

    switch (command.toLowerCase()) {
      case 'help':
        addLine('output', `Available commands:
  help              Show this help message
  ls                List files in current directory
  cat <file>        Display file content
  open <file>       Open file in editor
  clear             Clear terminal
  echo <text>       Print text
  date              Show current date and time
  whoami            Show current user
  pwd               Show current directory
  cd <dir>          Change directory (simulated)
  tree              Show file tree
  stats             Show project statistics
  theme             Show current theme info
  neofetch          System info
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
      runCommand(input)
      setInput('')
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
