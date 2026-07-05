'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Bot, Send, Sparkles, Trash2, Loader2, User, Code2,
  Lightbulb, Bug, BookOpen, Wand2, ArrowLeft, X, Copy, Check,
  RefreshCw, Wrench, FileCode, Zap, ClipboardList, GitBranch,
  FileSearch, GraduationCap, ArrowLeftRight, Terminal, Brain,
  PlusSquare, MessageSquarePlus,
  type LucideIcon,
} from 'lucide-react'
import { useEditorStore } from '@/store/editor-store'
import { cn } from '@/lib/utils'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface ProgressStep {
  text: string
  done: boolean
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  isAgentDone?: boolean
  appliedFiles?: string[]
  thinkingSteps?: string[]
}

interface QuickAction {
  icon: LucideIcon
  text: string
  prompt: string
  mode?: 'fix' | 'tutor' | 'convert-js' | 'convert-indo'
}

const quickActions: QuickAction[] = [
  { icon: Wrench, text: 'Fix Kode', prompt: 'Fix all bugs in my file. Return complete fixed code.', mode: 'fix' },
  { icon: GraduationCap, text: 'Belajar', prompt: 'Ajari saya coding dari dasar.', mode: 'tutor' },
  { icon: ArrowLeftRight, text: '-> JS', prompt: 'Convert IndoCode to JavaScript.', mode: 'convert-js' },
  { icon: ArrowLeftRight, text: '-> Indo', prompt: 'Convert JavaScript to IndoCode.', mode: 'convert-indo' },
  { icon: FileSearch, text: 'Analisis', prompt: 'Analyze my file in detail.' },
  { icon: Bug, text: 'Cari Bug', prompt: 'Find bugs in my code with line refs.' },
  { icon: Lightbulb, text: 'Improve', prompt: 'How to improve my code?' },
  { icon: BookOpen, text: 'Jelasin', prompt: 'Explain what my code does.' },
]

interface AIAssistantProps {
  onClose?: () => void
  isMobile?: boolean
}

// Parse agent response to extract file actions
function parseAgentFiles(reply: string, defaultFileName: string): { fileName: string, content: string }[] {
  const actions: { fileName: string, content: string }[] = []
  // Match code blocks with filename: ```lang:filename
  const fileRegex = /```[\w]*:(\S+)\n([\s\S]*?)```/g
  let match
  while ((match = fileRegex.exec(reply)) !== null) {
    actions.push({ fileName: match[1], content: match[2] })
  }
  // If no filename blocks, try regular code blocks
  if (actions.length === 0) {
    const codeRegex = /```[\w]*\n([\s\S]*?)```/g
    while ((match = codeRegex.exec(reply)) !== null) {
      if (match[1].split('\n').length > 3) {
        actions.push({ fileName: defaultFileName, content: match[1] })
        break
      }
    }
  }
  return actions
}

// Extract thinking steps from reply (bullet points before code blocks)
function parseThinkingSteps(reply: string): string[] {
  const beforeCode = reply.split(/```/)[0] || ''
  const lines = beforeCode.split('\n').filter(l => l.trim().startsWith('-') || l.trim().startsWith('•'))
  return lines.map(l => l.trim().replace(/^[-•]\s*/, '')).filter(l => l.length > 0)
}

export function AIAssistant({ onClose, isMobile = false }: AIAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'normal' | 'agent'>('normal')
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([])
  const [memoryCount, setMemoryCount] = useState(0)
  const viewportRef = useRef<HTMLDivElement>(null)
  const memoryRef = useRef<string[]>([])
  const replyRef = useRef<string>('')
  // Track the current AbortController so we can cancel on unmount / new chat / new message
  const abortRef = useRef<AbortController | null>(null)
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null)

  const activeTabId = useEditorStore(s => s.activeTabId)
  const openTabs = useEditorStore(s => s.openTabs)
  const files = useEditorStore(s => s.files)
  const updateFileContent = useEditorStore(s => s.updateFileContent)
  const createFile = useEditorStore(s => s.createFile)
  const openTab = useEditorStore(s => s.openTab)

  const activeTab = openTabs.find(t => t.id === activeTabId)
  const activeFile = activeTab ? files[activeTab.fileId] : null

  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTop = viewportRef.current.scrollHeight
    }
  }, [messages, loading, progressSteps])

  const haptic = useCallback((pattern: number | number[] = 10) => {
    if (isMobile && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(pattern) } catch { /* Vibration API not supported on this browser — ignore */ }
    }
  }, [isMobile])

  const addProgressStep = useCallback((text: string) => {
    setProgressSteps(prev => [...prev, { text, done: false }])
  }, [])

  const completeProgressStep = useCallback(() => {
    setProgressSteps(prev => {
      const last = prev[prev.length - 1]
      if (last && !last.done) return [...prev.slice(0, -1), { ...last, done: true }]
      return prev
    })
  }, [])

  const handleNewChat = useCallback(() => {
    haptic(15)
    setMessages([])
    setProgressSteps([])
    memoryRef.current = []
    setMemoryCount(0)
    setInput('')
    setLoading(false)
    toast.success('Chat baru dimulai')
  }, [haptic])

  const handleDeleteChat = useCallback(() => {
    if (messages.length === 0) return
    haptic([10, 30, 10])
    if (confirm('Hapus semua percakapan? Tindakan ini tidak dapat dibatalkan.')) {
      setMessages([])
      setProgressSteps([])
      memoryRef.current = []
      setMemoryCount(0)
      setInput('')
      setLoading(false)
      toast.success('Chat dihapus')
    }
  }, [haptic, messages.length])

  const sendMessage = async (text?: string, action?: QuickAction) => {
    const content = (text || input).trim()
    if (!content || loading) return

    // Cancel any in-flight request before starting a new one (prevents race condition)
    if (abortRef.current) {
      try { abortRef.current.abort() } catch { /* already aborted — ignore */ }
      abortRef.current = null
    }
    if (readerRef.current) {
      try { readerRef.current.cancel() } catch { /* stream already closed — ignore */ }
      readerRef.current = null
    }

    haptic(15)
    setInput('')
    const userMsg: ChatMessage = { role: 'user', content }
    const baseMessages = [...messages, userMsg]
    setMessages(baseMessages)
    setLoading(true)
    setProgressSteps([])

    const useAgentMode = mode === 'agent' && !action?.mode
    const useFixMode = action?.mode === 'fix'
    const useTutorMode = action?.mode === 'tutor'
    const useConvertMode = action?.mode === 'convert-js' ? 'indo-to-js' : action?.mode === 'convert-indo' ? 'js-to-indo' : undefined

    // Real progress: show "menghubungkan" status
    setProgressSteps([{ text: 'Menghubungkan ke AI...', done: false }])

    try {
      const context = activeFile
        ? `File: ${activeFile.name}\nLanguage: ${activeFile.language}\n\n\`\`\`${activeFile.language}\n${activeFile.content || '(empty file)'}\n\`\`\``
        : undefined

      const memoryContext = memoryRef.current.length > 0
        ? `\n\n=== MEMORY (belajar dari percakapan sebelumnya) ===\n${memoryRef.current.join('\n')}`
        : ''

      const allFiles = Object.values(files).filter(f => f.type === 'file')
      const projectFilesForAI = (useAgentMode || useFixMode || useConvertMode) ? [] : allFiles
        .filter(f => f.content && f.content.length > 0)
        .slice(0, 5)
        .map(f => ({
          name: f.name,
          language: f.language,
          content: f.content!.substring(0, 500),
        }))

      // Stream request — real-time progress
      const controller = new AbortController()
      abortRef.current = controller
      const timeoutId = setTimeout(() => controller.abort(), 120000)

      let response: Response
      try {
        response = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: baseMessages.map(m => ({ role: m.role, content: m.content })),
            context: context ? (context + memoryContext) : (memoryContext || undefined),
            applyMode: useFixMode,
            tutorMode: useTutorMode,
            convertMode: useConvertMode,
            agentMode: useAgentMode,
            projectFiles: projectFilesForAI,
            stream: true,
          }),
          signal: controller.signal,
        })
      } catch (fetchErr: any) {
        clearTimeout(timeoutId)
        if (fetchErr.name === 'AbortError') throw new Error('TIMEOUT')
        throw new Error('CONNECTION')
      }

      if (!response.ok) throw new Error('AI request failed')

      // Read SSE stream — real progress!
      const reader = response.body?.getReader()
      if (!reader) throw new Error('STREAM_ERROR')
      readerRef.current = reader

      const decoder = new TextDecoder()
      replyRef.current = ''
      let buffer = ''
      let firstChunk = true

      // Show a placeholder assistant message that we'll update in real-time
      setMessages([...baseMessages, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Parse SSE format: "data: {json}\n\n"
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const dataStr = line.slice(6).trim()
          if (dataStr === '[DONE]') continue

          try {
            const parsed = JSON.parse(dataStr)
            if (parsed.content) {
              replyRef.current += parsed.content

              // Real progress: update steps based on content
              if (firstChunk) {
                firstChunk = false
                setProgressSteps([{ text: 'AI sedang menulis...', done: true }])
              }

              // Update message in real-time (throttle to avoid too many re-renders)
              const currentReply = replyRef.current
              setMessages(prev => {
                const newMsgs = [...prev]
                const lastMsg = newMsgs[newMsgs.length - 1]
                if (lastMsg && lastMsg.role === 'assistant') {
                  lastMsg.content = currentReply
                }
                return newMsgs
              })
            }
            if (parsed.error) {
              throw new Error(parsed.error)
            }
          } catch (e) {
            // skip parse errors
          }
        }
      }

      clearTimeout(timeoutId)

      // Ensure final reply is set
      if (!replyRef.current) replyRef.current = 'AI tidak memberikan respons. Coba lagi.'
      const reply = replyRef.current

      // Update memory
      memoryRef.current.push(`User: ${content}\nAI: ${reply.substring(0, 200)}`)
      if (memoryRef.current.length > 10) memoryRef.current.shift()
      setMemoryCount(memoryRef.current.length)
      haptic([10, 30, 10])

      // AGENT MODE: Parse and apply directly to files
      if (useAgentMode) {
        setProgressSteps([{ text: 'Menerapkan kode ke file...', done: false }])

        const actions = parseAgentFiles(reply, activeFile?.name || 'index.html')
        const thinkingSteps = parseThinkingSteps(reply)

        if (actions.length > 0) {
          const appliedFiles: string[] = []
          for (const action of actions) {
            const existingFile = Object.values(files).find(f => f.name === action.fileName && f.type === 'file')
            if (existingFile) {
              updateFileContent(existingFile.id, action.content)
              openTab(existingFile.id, false)
              appliedFiles.push(action.fileName)
            } else {
              const newId = createFile(action.fileName, null)
              useEditorStore.getState().updateFileContent(newId, action.content)
              openTab(newId, false)
              appliedFiles.push(action.fileName + ' (baru)')
            }
          }

          setProgressSteps([{ text: `Selesai! ${appliedFiles.length} file diperbarui`, done: true }])

          const summaryLines = reply.split('\n').filter(l => l.trim().startsWith('-') || l.trim().startsWith('OK'))
          const summary = summaryLines.length > 0 ? summaryLines.join('\n') : `Selesai mengubah ${appliedFiles.length} file`

          memoryRef.current.push(`User: ${content}\nAI applied: ${appliedFiles.join(', ')}`)
          if (memoryRef.current.length > 10) memoryRef.current.shift()
          setMemoryCount(memoryRef.current.length)

          haptic([10, 30, 10])
          setProgressSteps([])

          setMessages([...baseMessages, {
            role: 'assistant',
            content: summary,
            isAgentDone: true,
            appliedFiles,
            thinkingSteps: thinkingSteps.length > 0 ? thinkingSteps : undefined,
          }])
          return
        }
      }

      // Normal/Fix/Convert response
      setMessages([...baseMessages, { role: 'assistant', content: reply }])
      memoryRef.current.push(`User: ${content}\nAI: ${reply.substring(0, 200)}`)
      if (memoryRef.current.length > 10) memoryRef.current.shift()
      setMemoryCount(memoryRef.current.length)
      haptic([10, 30, 10])
    } catch (error: any) {
      console.error(error)
      let errMsg = 'Terjadi kesalahan. Silakan coba lagi.'
      if (error?.message === 'TIMEOUT') {
        errMsg = 'Permintaan terlalu lama (timeout 2 menit). Coba permintaan yang lebih singkat.'
      } else if (error?.message === 'CONNECTION') {
        errMsg = 'Gagal terhubung ke server. Periksa koneksi internet lalu coba lagi.'
      } else if (error?.message === 'AI request failed') {
        errMsg = 'Server AI sedang sibuk. Tunggu sebentar lalu coba lagi.'
      }
      toast.error(errMsg)
      setMessages([...baseMessages, { role: 'assistant', content: errMsg }])
    } finally {
      setLoading(false)
      setProgressSteps([])
      // Clear refs so they can be GC'd
      abortRef.current = null
      readerRef.current = null
    }
  }

  // Cleanup: cancel any in-flight AI request on unmount (prevents memory leak & zombie stream)
  useEffect(() => {
    return () => {
      if (abortRef.current) {
        try { abortRef.current.abort() } catch { /* already aborted — ignore */ }
        abortRef.current = null
      }
      if (readerRef.current) {
        try { readerRef.current.cancel() } catch { /* stream already closed — ignore */ }
        readerRef.current = null
      }
    }
  }, [])

  const regenerate = (idx: number) => {
    const history = messages.slice(0, idx)
    const lastUser = history[history.length - 1]
    if (lastUser && lastUser.role === 'user') {
      setMessages(history.slice(0, -1))
      sendMessage(lastUser.content)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  return (
    <div className="flex h-full flex-col bg-[var(--side-bar-bg)]">
      {/* Header */}
      <div className={cn('flex items-center justify-between border-b border-[var(--editor-border)]', isMobile ? 'h-12 px-2 md:hidden' : 'h-9 px-3')}>
        <div className="flex items-center gap-2">
          {isMobile && onClose && (
            <button onClick={() => { haptic(10); onClose() }} className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground active:bg-[var(--list-hover)]" aria-label="Close">
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--list-hover)]">
            <Bot className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className={cn('font-semibold', isMobile ? 'text-sm' : 'text-xs uppercase tracking-wide')}>
              ZCode AI {mode === 'agent' && <span className="ml-1 rounded bg-foreground px-1.5 py-0.5 text-[9px] text-background">AGENT</span>}
            </span>
            {isMobile && activeFile && <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{activeFile.name}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleNewChat}
            title="New Chat"
            className={cn(
              'flex items-center gap-1 rounded-full text-muted-foreground active:bg-[var(--list-hover)] hover:bg-[var(--list-hover)] hover:text-foreground transition-colors',
              isMobile ? 'h-9 px-2.5' : 'h-7 px-2'
            )}
            aria-label="New Chat"
          >
            <MessageSquarePlus className={isMobile ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
            {!isMobile && <span className="text-[10px] font-medium uppercase tracking-wide">New</span>}
          </button>
          {messages.length > 0 && (
            <button
              onClick={handleDeleteChat}
              title="Delete Chat"
              className={cn(
                'flex items-center justify-center rounded-full text-muted-foreground active:bg-[var(--list-hover)] hover:bg-[var(--list-hover)] hover:text-foreground transition-colors',
                isMobile ? 'h-9 w-9' : 'h-7 w-7'
              )}
              aria-label="Delete Chat"
            >
              <Trash2 className={isMobile ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
            </button>
          )}
          {!isMobile && onClose && (
            <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-[var(--list-hover)]" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={viewportRef} className="flex-1 overflow-y-auto overscroll-contain [scrollbar-width:thin]">
        <div className={cn('p-3', isMobile && 'pb-4')}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-4 text-center md:py-6">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--list-hover)] md:mb-4">
                <Brain className="h-7 w-7" />
              </div>
              <h3 className="mb-1 text-sm font-semibold md:text-base">ZCode AI</h3>
              <p className="mb-4 max-w-[260px] text-xs text-muted-foreground md:mb-5 md:text-sm">
                {mode === 'agent'
                  ? 'Agent mode. AI berpikir terlebih dahulu, lalu menulis kode langsung ke file. Contoh: "buat game ular" atau "buat dalam bahasa Indonesia"'
                  : 'Chat biasa. Tanya apa saja. Untuk edit file langsung, ganti ke mode Agent di bawah.'
                }
              </p>
              <div className="grid w-full grid-cols-2 gap-2">
                {quickActions.map(action => {
                  const Icon = action.icon
                  return (
                    <button key={action.text} onClick={() => { haptic(10); sendMessage(action.prompt, action) }}
                      className={cn('flex items-center gap-2 rounded-xl border border-[var(--editor-border)] bg-[var(--input-bg)] px-2.5 py-2.5 text-left text-xs transition-all active:scale-[0.98] hover:border-[var(--list-active)]', isMobile && 'min-h-[44px]')}>
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="font-medium">{action.text}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-3 md:space-y-4">
              {messages.map((msg, i) => (
                <MessageBubble key={i} message={msg} isMobile={isMobile} onRegenerate={msg.role === 'assistant' && i === messages.length - 1 && !loading ? () => regenerate(i) : undefined} />
              ))}

              {/* Progress steps */}
              {loading && progressSteps.length > 0 && (
                <div className="flex gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--list-hover)]">
                    <Terminal className="h-4 w-4" />
                  </div>
                  <div className="flex-1 rounded-2xl rounded-tl-sm bg-[var(--input-bg)] px-3 py-2.5">
                    <div className="space-y-1.5">
                      {progressSteps.map((step, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-[13px]">
                          {step.done ? <Check className="h-3.5 w-3.5 shrink-0 text-foreground" /> : <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />}
                          <span className={step.done ? 'text-muted-foreground' : 'text-foreground'}>{step.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Normal loading */}
              {loading && progressSteps.length === 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-[var(--input-bg)] px-3 py-2.5 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>AI sedang berpikir...</span>
                  <span className="ml-auto flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Context */}
      {activeFile && !isMobile && (
        <div className="flex items-center gap-1.5 border-t border-[var(--editor-border)] px-3 py-1.5 text-[10px] text-muted-foreground">
          <Code2 className="h-3 w-3 shrink-0" />
          <span className="truncate">Context: {activeFile.name}</span>
          {memoryCount > 0 && <span className="ml-auto"> Memory: {memoryCount}</span>}
        </div>
      )}

      {/* Mode toggle + Input */}
      <div className={cn('border-t border-[var(--editor-border)] bg-[var(--side-bar-bg)]', isMobile ? 'p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]' : 'p-3')}>
        {/* Mode Toggle */}
        <div className="mb-2 flex gap-1 rounded-lg bg-[var(--input-bg)] p-1">
          <button onClick={() => { haptic(10); setMode('normal') }} className={cn('flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-all', mode === 'normal' ? 'bg-[var(--list-hover)] text-foreground' : 'text-muted-foreground')}>
            <ChatIcon className="h-3.5 w-3.5" /> Normal
          </button>
          <button onClick={() => { haptic(10); setMode('agent') }} className={cn('flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-all', mode === 'agent' ? 'bg-foreground text-background' : 'text-muted-foreground')}>
            <Terminal className="h-3.5 w-3.5" /> Agent
          </button>
        </div>

        {/* Input */}
        <div className="relative">
          <Textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder={mode === 'agent' ? (isMobile ? "Perintah agent..." : "Ketik perintah... (mis: buat game ular)") : (isMobile ? "Tanya AI apa saja..." : "Ajak AI ngol, tanya apa saja...")}
            className={cn('resize-none bg-[var(--input-bg)] pr-12 text-[13px]', isMobile ? 'min-h-[52px] max-h-[120px]' : 'min-h-[56px] max-h-[140px]')}
            rows={isMobile ? 2 : 3} maxLength={4000} />
          <Button size="icon" onClick={() => sendMessage()} disabled={!input.trim() || loading} className={cn('absolute bottom-2 right-2 shrink-0', isMobile ? 'h-9 w-9' : 'h-7 w-7')} aria-label="Send">
            <Send className={isMobile ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
          </Button>
        </div>
      </div>
    </div>
  )
}

function ChatIcon({ className }: { className?: string }) {
  return <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
}

interface MessageBubbleProps { message: ChatMessage; isMobile: boolean; onRegenerate?: () => void }

function MessageBubble({ message, isMobile, onRegenerate }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  if (message.isAgentDone && !isUser) {
    return (
      <div className="flex gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground">
          <Check className="h-4 w-4 text-background" />
        </div>
        <div className="flex-1 space-y-2">
          {message.thinkingSteps && message.thinkingSteps.length > 0 && (
            <div className="rounded-xl bg-[var(--input-bg)] px-3 py-2 text-[11px] text-muted-foreground">
              <div className="mb-1 flex items-center gap-1 font-medium">
                <Brain className="h-3 w-3" /> Proses berpikir:
              </div>
              {message.thinkingSteps.map((step, i) => (
                <div key={i} className="ml-3">• {step}</div>
              ))}
            </div>
          )}
          <div className="rounded-2xl rounded-tl-sm bg-[var(--input-bg)] px-3 py-2.5 text-[13px] leading-relaxed">
            <p className="whitespace-pre-wrap break-words font-medium">{message.content}</p>
            {message.appliedFiles && message.appliedFiles.length > 0 && (
              <div className="mt-2 space-y-1 border-t border-[var(--editor-border)] pt-2">
                {message.appliedFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <FileCode className="h-3 w-3" /><span>{f}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const parts = message.content.split(/(```[\w]*\n[\s\S]*?```)/g)

  return (
    <div className={cn('flex gap-2', isUser && 'flex-row-reverse')}>
      <div className={cn('flex shrink-0 items-center justify-center rounded-full', isMobile ? 'h-8 w-8' : 'h-7 w-7', isUser ? 'bg-[var(--input-bg)]' : 'bg-[var(--list-hover)]')}>
        {isUser ? <User className={isMobile ? 'h-4 w-4' : 'h-3.5 w-3.5'} /> : <Bot className={isMobile ? 'h-4 w-4' : 'h-3.5 w-3.5'} />}
      </div>
      <div className={cn('flex-1 space-y-1.5', isUser && 'max-w-[85%]')}>
        <div className={cn('rounded-2xl px-3 py-2 text-[13px] leading-relaxed', isUser ? 'bg-[var(--primary)] text-[var(--primary-foreground)] rounded-tr-sm' : 'bg-[var(--input-bg)] rounded-tl-sm')}>
          {parts.map((part, i) => {
            if (part.startsWith('```')) {
              const match = part.match(/```(\w*)\n([\s\S]*?)```/)
              if (match) return <CodeBlock key={i} code={match[2]} lang={match[1] || 'text'} isMobile={isMobile} />
            }
            return <p key={i} className="whitespace-pre-wrap break-words">{part}</p>
          })}
        </div>
        {!isUser && onRegenerate && (
          <button onClick={onRegenerate} className="flex items-center gap-1 rounded-full px-2 py-1 text-[10px] text-muted-foreground hover:bg-[var(--list-hover)] hover:text-foreground active:scale-95">
            <RefreshCw className="h-3 w-3" /><span>Regenerate</span>
          </button>
        )}
      </div>
    </div>
  )
}

function CodeBlock({ code, lang, isMobile }: { code: string; lang: string; isMobile: boolean }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard?.writeText(code)
    setCopied(true)
    if (isMobile && 'vibrate' in navigator) try { navigator.vibrate(15) } catch { /* Vibration API not supported — ignore */ }
    toast.success('Code disalin')
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="my-2 overflow-hidden rounded-lg border border-[var(--editor-border)]">
      <div className="flex items-center justify-between border-b border-[var(--editor-border)] bg-[var(--list-hover)] px-2.5 py-1.5">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{lang}</span>
        <button onClick={handleCopy} className={cn('flex items-center gap-1 rounded-full text-[10px] font-medium transition-colors active:scale-95', isMobile ? 'px-2.5 py-1 min-h-[28px]' : 'px-2 py-0.5', copied ? 'text-foreground' : 'text-muted-foreground hover:text-foreground')}>
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="overflow-x-auto bg-[var(--editor-bg)] p-2.5 text-[12px] leading-relaxed">
        <code className={`language-${lang}`}>{code}</code>
      </pre>
    </div>
  )
}
