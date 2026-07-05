'use client'

import { useState, useMemo } from 'react'
import {
  BookMarked, Search, Code2, Copy, Check,
  FileCode, Hash, Braces, Database, Cpu,
} from 'lucide-react'
import { useEditorStore } from '@/store/editor-store'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'

interface Snippet {
  id: string
  name: string
  description: string
  language: string
  category: 'function' | 'class' | 'component' | 'algorithm' | 'utility' | 'template'
  code: string
}

const SNIPPETS: Snippet[] = [
  {
    id: '1', name: 'Debounce Function', description: 'Limit function call rate',
    language: 'javascript', category: 'utility',
    code: `function debounce(fn, delay) {
  let timeoutId
  return function(...args) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn.apply(this, args), delay)
  }
}`,
  },
  {
    id: '2', name: 'Throttle Function', description: 'Limit function execution',
    language: 'javascript', category: 'utility',
    code: `function throttle(fn, limit) {
  let inThrottle
  return function(...args) {
    if (!inThrottle) {
      fn.apply(this, args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}`,
  },
  {
    id: '3', name: 'Async Fetch with Error Handling', description: 'Robust fetch wrapper',
    language: 'typescript', category: 'utility',
    code: `async function fetchData<T>(url: string): Promise<T> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`)
    }
    return await response.json() as T
  } catch (error) {
    console.error('Fetch error:', error)
    throw error
  }
}`,
  },
  {
    id: '4', name: 'React useState with localStorage', description: 'Persistent state hook',
    language: 'typescript', category: 'utility',
    code: `import { useState, useEffect } from 'react'

function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value))
  }, [key, value])

  return [value, setValue] as const
}`,
  },
  {
    id: '5', name: 'Binary Search', description: 'Efficient search algorithm',
    language: 'python', category: 'algorithm',
    code: `def binary_search(arr: list, target: int) -> int:
    """Binary search - O(log n) time complexity."""
    left, right = 0, len(arr) - 1
    
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    
    return -1  # Not found`,
  },
  {
    id: '6', name: 'Singleton Class', description: 'Class with single instance',
    language: 'typescript', category: 'class',
    code: `class Singleton {
  private static instance: Singleton
  
  private constructor() {
    // Private constructor prevents direct instantiation
  }
  
  public static getInstance(): Singleton {
    if (!Singleton.instance) {
      Singleton.instance = new Singleton()
    }
    return Singleton.instance
  }
}`,
  },
  {
    id: '7', name: 'Express Server Template', description: 'Basic Express.js server',
    language: 'javascript', category: 'template',
    code: `const express = require('express')
const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())

app.get('/', (req, res) => {
  res.json({ message: 'Hello, World!' })
})

app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`)
})`,
  },
  {
    id: '8', name: 'React Component Template', description: 'Functional component with hooks',
    language: 'typescript', category: 'component',
    code: `import React, { useState, useEffect } from 'react'

interface Props {
  title: string
}

export const MyComponent: React.FC<Props> = ({ title }) => {
  const [count, setCount] = useState(0)
  
  useEffect(() => {
    console.log(\`Count: \${count}\`)
  }, [count])
  
  return (
    <div>
      <h1>{title}</h1>
      <button onClick={() => setCount(c => c + 1)}>
        Count: {count}
      </button>
    </div>
  )
}`,
  },
  {
    id: '9', name: 'Debounce Hook', description: 'Debounce any value',
    language: 'typescript', category: 'utility',
    code: `import { useState, useEffect } from 'react'

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)
    
    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])
  
  return debouncedValue
}`,
  },
  {
    id: '10', name: 'Quick Sort', description: 'Efficient sorting algorithm',
    language: 'javascript', category: 'algorithm',
    code: `function quickSort(arr) {
  if (arr.length <= 1) return arr
  
  const pivot = arr[Math.floor(arr.length / 2)]
  const left = arr.filter(x => x < pivot)
  const middle = arr.filter(x => x === pivot)
  const right = arr.filter(x => x > pivot)
  
  return [...quickSort(left), ...middle, ...quickSort(right)]
}`,
  },
  {
    id: '11', name: 'CSS Flexbox Center', description: 'Perfect centering',
    language: 'css', category: 'utility',
    code: `.center {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}`,
  },
  {
    id: '12', name: 'HTML5 Boilerplate', description: 'Modern HTML5 starter',
    language: 'html', category: 'template',
    code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My App</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="app"></div>
  <script src="app.js"></script>
</body>
</html>`,
  },
]

const categories = [
  { id: 'all', name: 'All', icon: BookMarked },
  { id: 'function', name: 'Functions', icon: Code2 },
  { id: 'class', name: 'Classes', icon: Cpu },
  { id: 'component', name: 'Components', icon: FileCode },
  { id: 'algorithm', name: 'Algorithms', icon: Hash },
  { id: 'utility', name: 'Utilities', icon: Braces },
  { id: 'template', name: 'Templates', icon: Database },
] as const

export function SnippetsPanel() {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const createFile = useEditorStore(s => s.createFile)
  const openTab = useEditorStore(s => s.openTab)

  const filteredSnippets = useMemo(() => {
    return SNIPPETS.filter(s => {
      const matchesCategory = activeCategory === 'all' || s.category === activeCategory
      const matchesSearch = !search ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.description.toLowerCase().includes(search.toLowerCase()) ||
        s.language.toLowerCase().includes(search.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [search, activeCategory])

  const handleCopy = (snippet: Snippet) => {
    navigator.clipboard?.writeText(snippet.code)
    setCopiedId(snippet.id)
    toast.success('Snippet copied to clipboard')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleInsert = (snippet: Snippet) => {
    const ext = snippet.language === 'javascript' ? 'js' :
                snippet.language === 'typescript' ? 'ts' :
                snippet.language === 'python' ? 'py' :
                snippet.language === 'html' ? 'html' :
                snippet.language === 'css' ? 'css' : 'txt'
    const filename = `snippet-${snippet.id}.${ext}`
    const id = createFile(filename, null)
    useEditorStore.getState().updateFileContent(id, snippet.code)
    openTab(id, false)
    toast.success(`Inserted: ${snippet.name}`)
  }

  return (
    <div className="flex h-full flex-col bg-[var(--side-bar-bg)]">
      {/* Header */}
      <div className="flex h-9 items-center px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Snippets
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search snippets..."
            className="bg-[var(--input-bg)] pl-7 text-[13px]"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-1 overflow-x-auto px-3 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map(cat => {
          const Icon = cat.icon
          const isActive = activeCategory === cat.id
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                'flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition-colors',
                isActive
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-[var(--editor-border)] text-muted-foreground hover:bg-[var(--list-hover)]'
              )}
            >
              <Icon className="h-3 w-3" />
              <span>{cat.name}</span>
            </button>
          )
        })}
      </div>

      {/* Snippets list */}
      <ScrollArea className="flex-1">
        <div className="space-y-1 px-2 pb-4">
          {filteredSnippets.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-muted-foreground">
              No snippets found
            </div>
          ) : (
            filteredSnippets.map(snippet => (
              <div
                key={snippet.id}
                className="group rounded-md border border-transparent p-2 transition-colors hover:border-[var(--editor-border)] hover:bg-[var(--list-hover)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-medium">{snippet.name}</span>
                      <span className="rounded-full bg-[var(--input-bg)] px-1.5 py-0.5 text-[9px] uppercase text-muted-foreground">
                        {snippet.language}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {snippet.description}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => handleCopy(snippet)}
                      className="rounded p-1 text-muted-foreground hover:bg-[var(--list-active)] hover:text-foreground"
                      title="Copy"
                    >
                      {copiedId === snippet.id ? (
                        <Check className="h-3.5 w-3.5 text-foreground" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => handleInsert(snippet)}
                      className="rounded p-1 text-muted-foreground hover:bg-[var(--list-active)] hover:text-foreground"
                      title="Insert as new file"
                    >
                      <FileCode className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <pre className="mt-1.5 max-h-24 overflow-hidden rounded bg-[var(--editor-bg)] p-1.5 font-mono text-[10px] leading-tight">
                  <code>{snippet.code.split('\n').slice(0, 4).join('\n')}</code>
                </pre>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
