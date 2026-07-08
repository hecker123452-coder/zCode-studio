'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface FileNode {
  id: string
  name: string
  type: 'file' | 'folder'
  parentId: string | null
  content?: string
  language?: string
  children?: string[]
  expanded?: boolean
  createdAt: number
  updatedAt: number
  // For files imported from device storage — keep a handle so we can save back
  fileHandle?: any
  isBinary?: boolean
}

export interface Tab {
  id: string
  fileId: string
  isDirty: boolean
  preview: boolean
}

export interface EditorSettings {
  fontSize: number
  wordWrap: 'on' | 'off' | 'wordWrapColumn'
  tabSize: number
  minimap: boolean
  lineNumbers: 'on' | 'off' | 'relative'
  fontLigatures: boolean
  autoSave: boolean
  cursorBlinking: 'blink' | 'smooth' | 'phase' | 'expand' | 'solid'
  cursorSmoothCaretAnimation: boolean
  renderWhitespace: 'none' | 'boundary' | 'selection' | 'trailing' | 'all'
  bracketPairColorization: boolean
  smoothScrolling: boolean
  fontFamily: string
}

export type ThemeName = 'vs-dark' | 'light' | 'hc-black' | 'monokai' | 'dracula' | 'github' | 'solarized-dark' | 'solarized-light' | 'one-dark-pro' | 'nord'

interface EditorState {
  files: Record<string, FileNode>
  rootFileIds: string[]
  openTabs: Tab[]
  activeTabId: string | null
  settings: EditorSettings
  theme: ThemeName
  uiTheme: 'dark' | 'light'
  activeView: 'explorer' | 'search' | 'git' | 'ai' | 'snippets' | 'settings'
  terminalOpen: boolean
  bottomPanel: 'terminal' | 'problems' | 'output' | null
  commandPaletteOpen: boolean
  quickOpenOpen: boolean
  settingsOpen: boolean
  deployOpen: boolean
  fullscreenPreviewOpen: boolean
  mobileSidebarOpen: boolean
  mobileAIOpen: boolean
  mobileTerminalOpen: boolean
  mobileMenuOpen: boolean
  showPreviewMobile: boolean
  runPanelOpen: boolean
  shortcutsHelpOpen: boolean
  pinnedTabIds: string[]
  aiHelperOpen: boolean
  aiQuickCodeOpen: boolean
  apkEditorOpen: boolean

  // File operations
  createFile: (name: string, parentId: string | null) => string
  importFile: (name: string, content: string, parentId: string | null, opts?: { fileHandle?: any; isBinary?: boolean; language?: string }) => string
  createFolder: (name: string, parentId: string | null) => string
  duplicateFile: (id: string) => string | null
  deleteFile: (id: string) => void
  renameFile: (id: string, newName: string) => void
  moveFile: (id: string, newParentId: string | null) => void
  updateFileContent: (id: string, content: string) => void
  updateFileHandle: (id: string, handle: any) => void
  toggleFolder: (id: string) => void
  getFile: (id: string) => FileNode | undefined
  getPath: (id: string) => string
  getAllFiles: () => FileNode[]

  // Tab operations
  openTab: (fileId: string, preview?: boolean) => void
  closeTab: (tabId: string) => void
  setActiveTab: (tabId: string) => void
  markTabDirty: (fileId: string, dirty: boolean) => void
  closeOtherTabs: (tabId: string) => void
  closeAllTabs: () => void

  // Settings
  updateSettings: (settings: Partial<EditorSettings>) => void
  setTheme: (theme: ThemeName) => void
  setUiTheme: (theme: 'dark' | 'light') => void

  // UI
  setActiveView: (view: EditorState['activeView']) => void
  setTerminalOpen: (open: boolean) => void
  setBottomPanel: (panel: EditorState['bottomPanel']) => void
  setCommandPaletteOpen: (open: boolean) => void
  setQuickOpenOpen: (open: boolean) => void
  setSettingsOpen: (open: boolean) => void
  setMobileSidebarOpen: (open: boolean) => void
  setMobileAIOpen: (open: boolean) => void
  setMobileTerminalOpen: (open: boolean) => void
  setMobileMenuOpen: (open: boolean) => void
  setShowPreviewMobile: (open: boolean) => void
  setRunPanelOpen: (open: boolean) => void
  setDeployOpen: (open: boolean) => void
  setFullscreenPreviewOpen: (open: boolean) => void
  setShortcutsHelpOpen: (open: boolean) => void
  togglePinTab: (tabId: string) => void
  setAiHelperOpen: (open: boolean) => void
  setAiQuickCodeOpen: (open: boolean) => void
  setApkEditorOpen: (open: boolean) => void

  // === Source Control (real) ===
  // Track "saved" content per file — diff against current to detect modifications
  savedSnapshots: Record<string, string> // fileId -> last committed content
  commits: Commit[]
  createCommit: (message: string) => string // returns commit id
  restoreCommit: (commitId: string) => void
  getModifiedFiles: () => Array<{ fileId: string; file: FileNode; status: 'modified' | 'added' | 'deleted' }>
  stageFile: (fileId: string) => void
  unstageFile: (fileId: string) => void
  stagedFileIds: string[]
  discardChanges: (fileId: string) => void
}

interface Commit {
  id: string
  message: string
  createdAt: number
  files: Array<{ fileId: string; name: string; content: string; path: string }>
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

const getLanguageFromFilename = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const langMap: Record<string, string> = {
    js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
    ts: 'typescript', tsx: 'typescript',
    py: 'python',
    rb: 'ruby',
    php: 'php',
    go: 'go',
    rs: 'rust',
    java: 'java',
    kt: 'kotlin',
    swift: 'swift',
    c: 'c', h: 'c',
    cpp: 'cpp', cc: 'cpp', hpp: 'cpp',
    cs: 'csharp',
    html: 'html', htm: 'html',
    css: 'css', scss: 'scss', sass: 'scss', less: 'less',
    json: 'json',
    xml: 'xml',
    md: 'markdown', markdown: 'markdown',
    yml: 'yaml', yaml: 'yaml',
    sh: 'shell', bash: 'shell', zsh: 'shell',
    sql: 'sql',
    dockerfile: 'dockerfile',
    graphql: 'graphql', gql: 'graphql',
    vue: 'html',
    svelte: 'html',
    txt: 'plaintext',
    indo: 'indocode',
  }
  return langMap[ext] || 'plaintext'
}

// Initial sample files
const createInitialFiles = (): { files: Record<string, FileNode>, rootFileIds: string[] } => {
  const files: Record<string, FileNode> = {}
  const now = Date.now()

  // Root level files
  const readmeId = generateId()
  files[readmeId] = {
    id: readmeId, name: 'README.md', type: 'file', parentId: null,
    content: `# Welcome to ZCode Studio 

A powerful web-based code editor inspired by Acode, built with Next.js & Monaco Editor.

## Features

-  **Monaco Editor** — The same engine that powers VS Code
-  **File Explorer** — Full file system operations
-  **AI Assistant** — Get coding help from built-in AI
-  **Integrated Terminal** — Simulated terminal with commands
-  **Search in Files** — Find across the whole project with regex
- ⌨ **Command Palette** — Press \`Ctrl+Shift+P\` for commands
-  **Quick Open** — Press \`Ctrl+P\` to quickly open files
-  **Live Preview** — Preview HTML/CSS/JS in real-time
-  **Auto-save** — Your work persists in localStorage

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| \`Ctrl+Shift+P\` | Command Palette |
| \`Ctrl+P\` | Quick Open File |
| \`Ctrl+B\` | Toggle Sidebar |
| \`Ctrl+\`\` | Toggle Terminal |
| \`Ctrl+S\` | Save (auto-saved) |
| \`Ctrl+,\` | Settings |
| \`Ctrl+N\` | New File |
| \`Ctrl+Shift+N\` | New Folder |

## Getting Started

1. Explore the file tree on the left
2. Click any file to open it
3. Try editing \`src/index.js\` and see live preview
4. Use the AI panel for coding help

Enjoy coding! 
`, language: 'markdown', createdAt: now, updatedAt: now,
  }

  // src folder
  const srcId = generateId()
  files[srcId] = {
    id: srcId, name: 'src', type: 'folder', parentId: null,
    children: [], expanded: true, createdAt: now, updatedAt: now,
  }

  const indexJsId = generateId()
  files[indexJsId] = {
    id: indexJsId, name: 'index.js', type: 'file', parentId: srcId,
    content: `// Entry point - JavaScript demo
import { greet } from './utils.js'
import { Calculator } from './calculator.js'

function main() {
  console.log(greet('World'))
  
  const calc = new Calculator()
  console.log('10 + 5 =', calc.add(10, 5))
  console.log('10 - 5 =', calc.subtract(10, 5))
  console.log('10 * 5 =', calc.multiply(10, 5))
  console.log('10 / 5 =', calc.divide(10, 5))
  
  // Async demo
  fetchData().then(data => {
    console.log('Fetched:', data)
  })
}

async function fetchData() {
  return new Promise(resolve => {
    setTimeout(() => resolve({ id: 1, name: 'Sample' }), 500)
  })
}

main()
`, language: 'javascript', createdAt: now, updatedAt: now,
  }

  const utilsJsId = generateId()
  files[utilsJsId] = {
    id: utilsJsId, name: 'utils.js', type: 'file', parentId: srcId,
    content: `// Utility functions
export function greet(name) {
  return \`Hello, \${name}! \`
}

export function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date)
}

export function debounce(fn, delay) {
  let timeoutId
  return function(...args) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn.apply(this, args), delay)
  }
}

export const capitalize = (str) => 
  str.charAt(0).toUpperCase() + str.slice(1)
`, language: 'javascript', createdAt: now, updatedAt: now,
  }

  const calculatorJsId = generateId()
  files[calculatorJsId] = {
    id: calculatorJsId, name: 'calculator.js', type: 'file', parentId: srcId,
    content: `// Calculator class - OOP demo
export class Calculator {
  constructor() {
    this.history = []
  }

  add(a, b) {
    const result = a + b
    this.log('+', a, b, result)
    return result
  }

  subtract(a, b) {
    const result = a - b
    this.log('-', a, b, result)
    return result
  }

  multiply(a, b) {
    const result = a * b
    this.log('*', a, b, result)
    return result
  }

  divide(a, b) {
    if (b === 0) throw new Error('Division by zero')
    const result = a / b
    this.log('/', a, b, result)
    return result
  }

  log(op, a, b, result) {
    this.history.push({ op, a, b, result, time: Date.now() })
  }

  getHistory() {
    return [...this.history]
  }

  clearHistory() {
    this.history = []
  }
}
`, language: 'javascript', createdAt: now, updatedAt: now,
  }

  // components folder
  const componentsId = generateId()
  files[componentsId] = {
    id: componentsId, name: 'components', type: 'folder', parentId: srcId,
    children: [], expanded: false, createdAt: now, updatedAt: now,
  }

  const buttonTsxId = generateId()
  files[buttonTsxId] = {
    id: buttonTsxId, name: 'Button.tsx', type: 'file', parentId: componentsId,
    content: `import React from 'react'

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  onClick?: () => void
  children: React.ReactNode
  disabled?: boolean
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  onClick,
  children,
  disabled = false
}) => {
  const baseClass = 'btn'
  const variantClass = \`btn-\${variant}\`
  const sizeClass = \`btn-\${size}\`
  
  return (
    <button
      className={\`\${baseClass} \${variantClass} \${sizeClass}\`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}
`, language: 'typescript', createdAt: now, updatedAt: now,
  }

  files[srcId].children = [indexJsId, utilsJsId, calculatorJsId, componentsId]
  files[componentsId].children = [buttonTsxId]

  // styles folder
  const stylesId = generateId()
  files[stylesId] = {
    id: stylesId, name: 'styles', type: 'folder', parentId: null,
    children: [], expanded: false, createdAt: now, updatedAt: now,
  }

  const mainCssId = generateId()
  files[mainCssId] = {
    id: mainCssId, name: 'main.css', type: 'file', parentId: stylesId,
    content: `:root {
  --primary: #6366f1;
  --background: #ffffff;
  --text: #1f2937;
  --border: #e5e7eb;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', system-ui, sans-serif;
  background: var(--background);
  color: var(--text);
  line-height: 1.6;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-primary {
  background: var(--primary);
  color: white;
}

.btn-primary:hover {
  background: #4f46e5;
  transform: translateY(-1px);
}

.btn-sm { padding: 6px 12px; font-size: 14px; }
.btn-md { padding: 10px 16px; font-size: 15px; }
.btn-lg { padding: 14px 24px; font-size: 16px; }
`, language: 'css', createdAt: now, updatedAt: now,
  }

  files[stylesId].children = [mainCssId]

  // index.html
  const htmlId = generateId()
  files[htmlId] = {
    id: htmlId, name: 'index.html', type: 'file', parentId: null,
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ZCode Demo</title>
  <link rel="stylesheet" href="styles/main.css">
</head>
<body>
  <div class="container">
    <h1> ZCode Studio</h1>
    <p>A modern web-based code editor</p>
    <button class="btn btn-primary btn-md" onclick="handleClick()">
      Click Me!
    </button>
    <div id="counter">Clicked: 0 times</div>
  </div>
  
  <script>
    let count = 0
    function handleClick() {
      count++
      document.getElementById('counter').textContent = 'Clicked: ' + count + ' times'
    }
  </script>
</body>
</html>
`, language: 'html', createdAt: now, updatedAt: now,
  }

  // package.json
  const pkgJsonId = generateId()
  files[pkgJsonId] = {
    id: pkgJsonId, name: 'package.json', type: 'file', parentId: null,
    content: `{
  "name": "zcode-demo",
  "version": "1.0.0",
  "description": "Demo project for ZCode Studio",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.0",
    "lodash": "^4.17.21"
  },
  "devDependencies": {
    "jest": "^29.0.0",
    "nodemon": "^3.0.0"
  }
}
`, language: 'json', createdAt: now, updatedAt: now,
  }

  // Python demo
  const pyId = generateId()
  files[pyId] = {
    id: pyId, name: 'demo.py', type: 'file', parentId: null,
    content: `# Python demo - Fibonacci & sorting
from typing import List
from dataclasses import dataclass
from datetime import datetime


@dataclass
class Task:
    name: str
    priority: int
    done: bool = False


def fibonacci(n: int) -> List[int]:
    """Generate Fibonacci sequence up to n terms."""
    if n <= 0:
        return []
    if n == 1:
        return [0]
    
    seq = [0, 1]
    for i in range(2, n):
        seq.append(seq[-1] + seq[-2])
    return seq


def quick_sort(arr: List[int]) -> List[int]:
    """Quick sort implementation."""
    if len(arr) <= 1:
        return arr
    
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    
    return quick_sort(left) + middle + quick_sort(right)


def main():
    print(f" ZCode Studio - Python Demo")
    print(f"Time: {datetime.now().isoformat()}")
    print()
    
    print("Fibonacci (10 terms):", fibonacci(10))
    print()
    
    unsorted = [3, 6, 1, 8, 2, 9, 4, 7, 5]
    print("Unsorted:", unsorted)
    print("Sorted:  ", quick_sort(unsorted))
    print()
    
    tasks = [
        Task("Learn Python", 1),
        Task("Build app", 2),
        Task("Deploy", 3, done=True),
    ]
    for t in tasks:
        status = "-" if t.done else "○"
        print(f"  {status} [{t.priority}] {t.name}")


if __name__ == "__main__":
    main()
`, language: 'python', createdAt: now, updatedAt: now,
  }

  // IndoCode sample file
  const indoId = generateId()
  files[indoId] = {
    id: indoId, name: 'contoh.indo', type: 'file', parentId: null,
    content: `// IndoCode - Bahasa pemrograman Indonesia
// Klik tombol Run (▶) untuk menjalankan!

variabel angka = 10

jika (angka > 10) {
    tampilkan("Lebih besar dari 10")
} atau_jika (angka == 10) {
    tampilkan("Sama dengan 10")
} kalau_tidak {
    tampilkan("Lebih kecil dari 10")
}

untuk (variabel i = 1; i <= 5; i++) {
    tampilkan("Perulangan ke-" + i)
}

fungsi sapa(nama) {
    tampilkan("Halo " + nama)
}

sapa("Hecker")

// Array methods
variabel buah = ["apel", "jeruk", "mangga"]
buah.untuk_setiap(fungsi(item) {
    tampilkan("Buah: " + item)
})

variabel angka_genap = [2, 4, 6, 8, 10]
tampilkan("Jumlah: " + angka_genap.panjang)
tampilkan("Maks: " + maks(2, 8, 4, 10, 6))
`, language: 'indocode', createdAt: now, updatedAt: now,
  }

  // Game Snake IndoCode file
  const snakeId = generateId()
  files[snakeId] = {
    id: snakeId, name: 'game_ular.indo', type: 'file', parentId: null,
    content: `// Game Uular dengan IndoCode
// Butuh canvas dengan id="game" di HTML

konstanta kanvas = ambilElemen("game")
konstanta ctx = kanvas.konteks("2d")

konstanta ukuranKotak = 20
konstanta jumlahKotak = 20

variabel skor = 0

variabel ular = [
    { x: 10, y: 10 }
]

variabel arahX = 1
variabel arahY = 0

variabel makanan = {
    x: 5,
    y: 5
}

fungsi buatMakanan() {
    makanan.x = acakBulat(0, jumlahKotak - 1)
    makanan.y = acakBulat(0, jumlahKotak - 1)
}

fungsi gambar() {
    ctx.bersihkan()
    ctx.warnaIsi("merah")
    ctx.kotak(makanan.x * ukuranKotak, makanan.y * ukuranKotak, ukuranKotak, ukuranKotak)
    ctx.warnaIsi("hijau")
    untuk (variabel i = 0; i < ular.panjang; i++) {
        ctx.kotak(ular[i].x * ukuranKotak, ular[i].y * ukuranKotak, ukuranKotak, ukuranKotak)
    }
}

fungsi perbarui() {
    variabel kepala = {
        x: ular[0].x + arahX,
        y: ular[0].y + arahY
    }
    jika (kepala.x < 0) { kepala.x = jumlahKotak - 1 }
    jika (kepala.x >= jumlahKotak) { kepala.x = 0 }
    jika (kepala.y < 0) { kepala.y = jumlahKotak - 1 }
    jika (kepala.y >= jumlahKotak) { kepala.y = 0 }

    untuk (variabel i = 0; i < ular.panjang; i++) {
        jika (kepala.x == ular[i].x && kepala.y == ular[i].y) {
            tampilkan("GAME OVER")
            tampilkan("Skor: " + skor)
            berhentiProgram()
        }
    }

    ular.tambahDepan(kepala)

    jika (kepala.x == makanan.x && kepala.y == makanan.y) {
        skor = skor + 1
        tampilkan("Skor: " + skor)
        buatMakanan()
    } kalau_tidak {
        ular.hapusBelakang()
    }
}

fungsi perulanganGame() {
    perbarui()
    gambar()
}

dengarkan("keydown", fungsi(e) {
    variabel tombol = e.indoKey || e.key
    jika (tombol == "ATAS" && arahY != 1) { arahX = 0; arahY = -1 }
    atau_jika (tombol == "BAWAH" && arahY != -1) { arahX = 0; arahY = 1 }
    atau_jika (tombol == "KIRI" && arahX != 1) { arahX = -1; arahY = 0 }
    atau_jika (tombol == "KANAN" && arahX != -1) { arahX = 1; arahY = 0 }
})

buatMakanan()
tampilkan("Game dimulai! Gunakan tombol panah.")

selama (benar) {
    tunggu(120)
    perulanganGame()
}
`, language: 'indocode', createdAt: now, updatedAt: now,
  }

  return {
    files,
    rootFileIds: [readmeId, srcId, stylesId, htmlId, pkgJsonId, pyId, indoId, snakeId],
  }
}

const initial = createInitialFiles()

const defaultSettings: EditorSettings = {
  fontSize: 14,
  wordWrap: 'on',
  tabSize: 2,
  minimap: true,
  lineNumbers: 'on',
  fontLigatures: true,
  autoSave: true,
  cursorBlinking: 'smooth',
  cursorSmoothCaretAnimation: true,
  renderWhitespace: 'selection',
  bracketPairColorization: true,
  smoothScrolling: true,
  fontFamily: 'JetBrains Mono, Fira Code, Menlo, Monaco, Consolas, monospace',
}

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      files: initial.files,
      rootFileIds: initial.rootFileIds,
      openTabs: [],
      activeTabId: null,
      settings: defaultSettings,
      theme: 'vs-dark',
      uiTheme: 'dark',
      activeView: 'explorer',
      terminalOpen: false,
      bottomPanel: null,
      commandPaletteOpen: false,
      quickOpenOpen: false,
      settingsOpen: false,
      mobileSidebarOpen: false,
      mobileAIOpen: false,
      mobileTerminalOpen: false,
      mobileMenuOpen: false,
      showPreviewMobile: false,
      runPanelOpen: false,
      deployOpen: false,
      fullscreenPreviewOpen: false,
      shortcutsHelpOpen: false,
      pinnedTabIds: [],
      aiHelperOpen: false,
      aiQuickCodeOpen: false,
      apkEditorOpen: false,

      // Source control initial state
      savedSnapshots: {},
      commits: [],
      stagedFileIds: [],

      createFile: (name, parentId) => {
        const id = generateId()
        const now = Date.now()
        const newFile: FileNode = {
          id, name, type: 'file', parentId,
          content: '', language: getLanguageFromFilename(name),
          createdAt: now, updatedAt: now,
        }
        set(state => {
          const files = { ...state.files, [id]: newFile }
          if (parentId) {
            const parent = files[parentId]
            if (parent && parent.type === 'folder') {
              files[parentId] = {
                ...parent,
                children: [...(parent.children || []), id],
                expanded: true,
                updatedAt: now,
              }
            }
          }
          return {
            files,
            rootFileIds: parentId ? state.rootFileIds : [...state.rootFileIds, id],
          }
        })
        return id
      },

      importFile: (name, content, parentId, opts = {}) => {
        const id = generateId()
        const now = Date.now()
        const newFile: FileNode = {
          id, name, type: 'file', parentId,
          content,
          language: opts.language || getLanguageFromFilename(name),
          fileHandle: opts.fileHandle,
          isBinary: opts.isBinary,
          createdAt: now, updatedAt: now,
        }
        set(state => {
          const files = { ...state.files, [id]: newFile }
          if (parentId) {
            const parent = files[parentId]
            if (parent && parent.type === 'folder') {
              files[parentId] = {
                ...parent,
                children: [...(parent.children || []), id],
                expanded: true,
                updatedAt: now,
              }
            }
          }
          return {
            files,
            rootFileIds: parentId ? state.rootFileIds : [...state.rootFileIds, id],
          }
        })
        return id
      },

      duplicateFile: (id) => {
        const file = get().files[id]
        if (!file || file.type !== 'file') return null
        const dot = file.name.lastIndexOf('.')
        const ext = dot >= 0 ? file.name.substring(dot) : ''
        const baseName = dot >= 0 ? file.name.substring(0, dot) : file.name
        const newName = `${baseName}-copy${ext}`
        const newId = get().importFile(newName, file.content || '', file.parentId || null, {
          isBinary: file.isBinary,
          language: file.language,
        })
        return newId
      },

      updateFileHandle: (id, handle) => {
        set(state => {
          const file = state.files[id]
          if (!file) return state
          return {
            files: {
              ...state.files,
              [id]: { ...file, fileHandle: handle, updatedAt: Date.now() },
            },
          }
        })
      },

      createFolder: (name, parentId) => {
        const id = generateId()
        const now = Date.now()
        const newFolder: FileNode = {
          id, name, type: 'folder', parentId,
          children: [], expanded: true,
          createdAt: now, updatedAt: now,
        }
        set(state => {
          const files = { ...state.files, [id]: newFolder }
          if (parentId) {
            const parent = files[parentId]
            if (parent && parent.type === 'folder') {
              files[parentId] = {
                ...parent,
                children: [...(parent.children || []), id],
                expanded: true,
                updatedAt: now,
              }
            }
          }
          return {
            files,
            rootFileIds: parentId ? state.rootFileIds : [...state.rootFileIds, id],
          }
        })
        return id
      },

      deleteFile: (id) => {
        set(state => {
          const files = { ...state.files }
          const file = files[id]
          if (!file) return state

          // Recursively delete children if folder
          const deleteRecursive = (fileId: string) => {
            const f = files[fileId]
            if (!f) return
            if (f.type === 'folder' && f.children) {
              f.children.forEach(deleteRecursive)
            }
            // Close any open tabs for this file
            delete files[fileId]
          }
          deleteRecursive(id)

          // Remove from parent's children or root
          if (file.parentId) {
            const parent = files[file.parentId]
            if (parent && parent.children) {
              files[file.parentId] = {
                ...parent,
                children: parent.children.filter(cid => cid !== id),
                updatedAt: Date.now(),
              }
            }
          }

          const openTabs = state.openTabs.filter(tab => tab.fileId !== id)
          const activeTabId = state.activeTabId && openTabs.find(t => t.id === state.activeTabId)
            ? state.activeTabId
            : openTabs[0]?.id || null

          return {
            files,
            rootFileIds: file.parentId ? state.rootFileIds : state.rootFileIds.filter(rid => rid !== id),
            openTabs,
            activeTabId,
          }
        })
      },

      renameFile: (id, newName) => {
        set(state => {
          const file = state.files[id]
          if (!file) return state
          return {
            files: {
              ...state.files,
              [id]: {
                ...file,
                name: newName,
                language: file.type === 'file' ? getLanguageFromFilename(newName) : file.language,
                updatedAt: Date.now(),
              },
            },
          }
        })
      },

      moveFile: (id, newParentId) => {
        set(state => {
          const files = { ...state.files }
          const file = files[id]
          if (!file) return state
          const oldParentId = file.parentId

          // Remove from old parent
          if (oldParentId) {
            const oldParent = files[oldParentId]
            if (oldParent && oldParent.children) {
              files[oldParentId] = {
                ...oldParent,
                children: oldParent.children.filter(cid => cid !== id),
              }
            }
          }

          // Add to new parent
          if (newParentId) {
            const newParent = files[newParentId]
            if (newParent && newParent.type === 'folder') {
              files[newParentId] = {
                ...newParent,
                children: [...(newParent.children || []), id],
                expanded: true,
              }
            }
          }

          files[id] = { ...file, parentId: newParentId, updatedAt: Date.now() }

          return {
            files,
            rootFileIds: oldParentId === null && newParentId !== null
              ? state.rootFileIds.filter(rid => rid !== id)
              : oldParentId !== null && newParentId === null
              ? [...state.rootFileIds, id]
              : state.rootFileIds,
          }
        })
      },

      updateFileContent: (id, content) => {
        set(state => {
          const file = state.files[id]
          if (!file) return state
          return {
            files: {
              ...state.files,
              [id]: { ...file, content, updatedAt: Date.now() },
            },
          }
        })
      },

      toggleFolder: (id) => {
        set(state => {
          const file = state.files[id]
          if (!file || file.type !== 'folder') return state
          return {
            files: {
              ...state.files,
              [id]: { ...file, expanded: !file.expanded },
            },
          }
        })
      },

      getFile: (id) => get().files[id],

      getPath: (id) => {
        const state = get()
        const segments: string[] = []
        let currentId: string | null = id
        while (currentId) {
          const f = state.files[currentId]
          if (!f) break
          segments.unshift(f.name)
          currentId = f.parentId
        }
        return '/' + segments.join('/')
      },

      getAllFiles: () => {
        return Object.values(get().files).filter(f => f.type === 'file')
      },

      openTab: (fileId, preview = false) => {
        set(state => {
          const file = state.files[fileId]
          if (!file || file.type !== 'folder') {
            // Check if tab already exists
            const existingTab = state.openTabs.find(t => t.fileId === fileId)
            if (existingTab) {
              return { activeTabId: existingTab.id }
            }
            const newTab: Tab = {
              id: generateId(),
              fileId,
              isDirty: false,
              preview,
            }
            return {
              openTabs: [...state.openTabs, newTab],
              activeTabId: newTab.id,
            }
          }
          return state
        })
      },

      closeTab: (tabId) => {
        set(state => {
          const tabIndex = state.openTabs.findIndex(t => t.id === tabId)
          if (tabIndex === -1) return state
          const newTabs = state.openTabs.filter(t => t.id !== tabId)
          let newActiveTabId = state.activeTabId
          if (state.activeTabId === tabId) {
            if (newTabs.length === 0) {
              newActiveTabId = null
            } else if (tabIndex >= newTabs.length) {
              newActiveTabId = newTabs[newTabs.length - 1].id
            } else {
              newActiveTabId = newTabs[tabIndex].id
            }
          }
          return { openTabs: newTabs, activeTabId: newActiveTabId }
        })
      },

      setActiveTab: (tabId) => set({ activeTabId: tabId }),

      markTabDirty: (fileId, dirty) => {
        set(state => ({
          openTabs: state.openTabs.map(t =>
            t.fileId === fileId ? { ...t, isDirty: dirty } : t
          ),
        }))
      },

      closeOtherTabs: (tabId) => {
        set(state => ({
          openTabs: state.openTabs.filter(t => t.id === tabId),
          activeTabId: tabId,
        }))
      },

      closeAllTabs: () => set({ openTabs: [], activeTabId: null }),

      updateSettings: (newSettings) => set(state => ({
        settings: { ...state.settings, ...newSettings },
      })),

      setTheme: () => {}, // theme is locked to vs-dark (single dark theme)
      setUiTheme: () => {}, // uiTheme is locked to dark

      setActiveView: (activeView) => set({ activeView }),
      setTerminalOpen: (terminalOpen) => set({ terminalOpen }),
      setBottomPanel: (bottomPanel) => set({ bottomPanel }),
      setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
      setQuickOpenOpen: (quickOpenOpen) => set({ quickOpenOpen }),
      setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
      setMobileSidebarOpen: (mobileSidebarOpen) => set({ mobileSidebarOpen }),
      setMobileAIOpen: (mobileAIOpen) => set({ mobileAIOpen }),
      setMobileTerminalOpen: (mobileTerminalOpen) => set({ mobileTerminalOpen }),
      setMobileMenuOpen: (mobileMenuOpen) => set({ mobileMenuOpen }),
      setShowPreviewMobile: (showPreviewMobile) => set({ showPreviewMobile }),
      setRunPanelOpen: (runPanelOpen) => set({ runPanelOpen }),
      setDeployOpen: (deployOpen) => set({ deployOpen }),
      setFullscreenPreviewOpen: (fullscreenPreviewOpen) => set({ fullscreenPreviewOpen }),
      setShortcutsHelpOpen: (shortcutsHelpOpen) => set({ shortcutsHelpOpen }),
      togglePinTab: (tabId) => set(state => ({
        pinnedTabIds: state.pinnedTabIds.includes(tabId)
          ? state.pinnedTabIds.filter(id => id !== tabId)
          : [...state.pinnedTabIds, tabId],
      })),
      setAiHelperOpen: (aiHelperOpen) => set({ aiHelperOpen }),
      setAiQuickCodeOpen: (aiQuickCodeOpen) => set({ aiQuickCodeOpen }),
      setApkEditorOpen: (apkEditorOpen) => set({ apkEditorOpen }),

      // === Source Control (real implementation) ===
      // savedSnapshots tracks the "last committed" content per file.
      // getModifiedFiles compares current content vs snapshot to detect changes.
      createCommit: (message) => {
        const state = get()
        const id = `commit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
        const allFiles = Object.values(state.files).filter(f => f.type === 'file')

        const fileSnapshots = allFiles.map(f => ({
          fileId: f.id,
          name: f.name,
          content: f.content || '',
          path: get().getPath(f.id),
        }))

        const newSnapshots: Record<string, string> = {}
        for (const f of allFiles) {
          newSnapshots[f.id] = f.content || ''
        }

        const commit: Commit = {
          id,
          message: message.trim() || `Commit at ${new Date().toLocaleString('id-ID')}`,
          createdAt: Date.now(),
          files: fileSnapshots,
        }

        set({
          commits: [commit, ...state.commits].slice(0, 50),
          savedSnapshots: newSnapshots,
          stagedFileIds: [],
        })

        // Persist to IndexedDB (async, non-blocking)
        if (typeof window !== 'undefined') {
          import('@/lib/source-control/storage').then(async ({ saveCommit, saveSnapshot }) => {
            try {
              await saveCommit(commit)
              for (const [fileId, content] of Object.entries(newSnapshots)) {
                await saveSnapshot(fileId, content)
              }
            } catch (err) {
              console.warn('[store] Failed to persist commit to IndexedDB:', err)
            }
          })
        }

        return id
      },

      restoreCommit: (commitId) => {
        const state = get()
        const commit = state.commits.find(c => c.id === commitId)
        if (!commit) return

        // Restore each file's content from the commit snapshot
        const newFiles = { ...state.files }
        for (const snapshot of commit.files) {
          if (newFiles[snapshot.fileId]) {
            newFiles[snapshot.fileId] = {
              ...newFiles[snapshot.fileId],
              content: snapshot.content,
              updatedAt: Date.now(),
            }
          }
        }

        // Update savedSnapshots to match this commit
        const newSnapshots: Record<string, string> = {}
        for (const snapshot of commit.files) {
          newSnapshots[snapshot.fileId] = snapshot.content
        }

        set({
          files: newFiles,
          savedSnapshots: newSnapshots,
          stagedFileIds: [],
        })
      },

      getModifiedFiles: () => {
        const state = get()
        const allFiles = Object.values(state.files).filter(f => f.type === 'file')
        const result: Array<{ fileId: string; file: FileNode; status: 'modified' | 'added' | 'deleted' }> = []

        for (const file of allFiles) {
          const snapshot = state.savedSnapshots[file.id]
          if (snapshot === undefined) {
            // File exists now but no snapshot = added
            result.push({ fileId: file.id, file, status: 'added' })
          } else if (snapshot !== (file.content || '')) {
            // Content changed = modified
            result.push({ fileId: file.id, file, status: 'modified' })
          }
        }

        // Check for deleted files (snapshot exists but file doesn't)
        for (const fileId of Object.keys(state.savedSnapshots)) {
          if (!state.files[fileId]) {
            // File was deleted — create a stub for UI display
            result.push({
              fileId,
              file: {
                id: fileId,
                name: '(deleted)',
                type: 'file',
                parentId: null,
                content: '',
                createdAt: 0,
                updatedAt: 0,
              },
              status: 'deleted',
            })
          }
        }

        return result
      },

      stageFile: (fileId) => {
        set(state => ({
          stagedFileIds: state.stagedFileIds.includes(fileId)
            ? state.stagedFileIds
            : [...state.stagedFileIds, fileId],
        }))
      },

      unstageFile: (fileId) => {
        set(state => ({
          stagedFileIds: state.stagedFileIds.filter(id => id !== fileId),
        }))
      },

      discardChanges: (fileId) => {
        const state = get()
        const snapshot = state.savedSnapshots[fileId]
        if (snapshot !== undefined && state.files[fileId]) {
          // Restore file content to last committed version
          set(s => ({
            files: {
              ...s.files,
              [fileId]: {
                ...s.files[fileId],
                content: snapshot,
                updatedAt: Date.now(),
              },
            },
          }))
        }
      },
    }),
    {
      name: 'zcode-studio-storage',
      partialize: (state) => ({
        files: state.files,
        rootFileIds: state.rootFileIds,
        openTabs: state.openTabs,
        activeTabId: state.activeTabId,
        settings: state.settings,
        // NOTE: savedSnapshots & commits moved to IndexedDB (see src/lib/source-control/storage.ts)
        // localStorage has 5MB limit — storing full file content per commit would crash.
        // IndexedDB has 50MB+ limit and handles this properly.
        stagedFileIds: state.stagedFileIds,
      }),
      merge: (persisted, current) => {
        // Always force theme/uiTheme to the locked defaults; ignore any persisted values.
        const p = (persisted as Partial<EditorState>) || {}
        return {
          ...current,
          ...p,
          theme: 'vs-dark',
          uiTheme: 'dark',
        } as EditorState
      },
      onRehydrateStorage: () => (state) => {
        // After localStorage hydration, load commits + snapshots from IndexedDB
        if (state && typeof window !== 'undefined') {
          import('@/lib/source-control/storage').then(async ({ loadCommits, loadSnapshots }) => {
            try {
              const [commits, snapshots] = await Promise.all([loadCommits(), loadSnapshots()])
              useEditorStore.setState({
                commits,
                savedSnapshots: snapshots,
              })
            } catch (err) {
              console.warn('[store] Failed to load source control from IndexedDB:', err)
            }
          })
        }
      },
    }
  )
)
