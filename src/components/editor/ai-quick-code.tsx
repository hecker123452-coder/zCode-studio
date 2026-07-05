'use client'

import { useState, useRef, useEffect } from 'react'
import { Zap, X, Send, Loader2, Copy, Check, ChevronDown, ChevronUp, Code2, Square } from 'lucide-react'
import { useEditorStore } from '@/store/editor-store'
import { cn } from '@/lib/utils'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface ChatMessage { role: 'user' | 'assistant'; content: string }

export function AiQuickCode() {
  const open = useEditorStore(s => s.aiQuickCodeOpen)
  const setOpen = useEditorStore(s => s.setAiQuickCodeOpen)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(true)
  const viewportRef = useRef<HTMLDivElement>(null)
  // Abort in-flight request when dialog closes / new send / unmount
  const abortRef = useRef<AbortController | null>(null)
  const activeTabId = useEditorStore(s => s.activeTabId)
  const openTabs = useEditorStore(s => s.openTabs)
  const files = useEditorStore(s => s.files)

  const activeTab = openTabs.find(t => t.id === activeTabId)
  const activeFile = activeTab ? files[activeTab.fileId] : null

  useEffect(() => { if (viewportRef.current) viewportRef.current.scrollTop = viewportRef.current.scrollHeight }, [messages, loading])

  // Cancel any in-flight request when dialog closes (prevents zombie stream + wasted tokens)
  useEffect(() => {
    if (!open && abortRef.current) {
      try { abortRef.current.abort() } catch { /* already aborted */ }
      abortRef.current = null
      setLoading(false)
    }
  }, [open])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) {
        try { abortRef.current.abort() } catch { /* already aborted */ }
        abortRef.current = null
      }
    }
  }, [])

  const send = async () => {
    const content = input.trim()
    if (!content || loading) return
    setInput('')
    const base = [...messages, { role: 'user' as const, content }]
    setMessages(base)
    setLoading(true)

    // Cancel any previous in-flight request
    if (abortRef.current) {
      try { abortRef.current.abort() } catch { /* already aborted */ }
    }
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const ctx = activeFile ? `File: ${activeFile.name}\nLanguage: ${activeFile.language}\n\n\`\`\`${activeFile.language}\n${activeFile.content || '(empty)'}\n\`\`\`` : undefined
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: base.map(m => ({ role: m.role, content: m.content })), context: ctx }),
        signal: controller.signal,
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setMessages([...base, { role: 'assistant', content: data.reply }])
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        // Silent on user-initiated cancel — don't pollute chat history
        setMessages(base)
      } else {
        toast.error('Gagal terhubung ke AI. Coba lagi.')
        setMessages([...base, { role: 'assistant', content: 'Terjadi kesalahan. Coba lagi.' }])
      }
    }
    finally {
      setLoading(false)
      abortRef.current = null
    }
  }

  const handleCancel = () => {
    if (abortRef.current) {
      try { abortRef.current.abort() } catch { /* already aborted */ }
      abortRef.current = null
    }
    setLoading(false)
  }

  if (!open) return null

  return (
    <div className="fixed bottom-16 left-2 z-40 w-[calc(100vw-1rem)] max-w-sm md:bottom-2 md:left-2 md:w-96">
      <div className="flex flex-col rounded-xl border border-[var(--editor-border)] bg-[var(--side-bar-bg)] shadow-2xl max-h-[60vh]">
        <div className="flex h-10 items-center justify-between border-b border-[var(--editor-border)] px-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-500/20"><Zap className="h-3.5 w-3.5 text-purple-400" /></div>
            <span className="text-xs font-semibold">AI Quick Code</span>
            {messages.length > 0 && <button onClick={() => { setMessages([]); toast.success('Chat dihapus') }} className="rounded p-1 text-muted-foreground hover:bg-[var(--list-hover)]" title="Hapus chat"><X className="h-3 w-3" /></button>}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setExpanded(!expanded)} className="rounded p-1 text-muted-foreground hover:bg-[var(--list-hover)]" title={expanded ? 'Lipat' : 'Buka'}>{expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}</button>
            <button onClick={() => setOpen(false)} className="rounded p-1 text-muted-foreground hover:bg-[var(--list-hover)]" title="Tutup"><X className="h-3.5 w-3.5" /></button>
          </div>
        </div>
        {expanded && (
          <>
            <div ref={viewportRef} className="max-h-[250px] overflow-y-auto p-2.5">
              {messages.length === 0 ? (
                <div className="py-4 text-center">
                  <Code2 className="mx-auto mb-2 h-8 w-8 opacity-30" />
                  <p className="text-xs text-muted-foreground mb-2">Tanya kode, langsung siap salin</p>
                  <div className="space-y-1">
                    {['Buat function debounce', 'CSS flexbox center', 'Fetch API'].map(q => (
                      <button key={q} onClick={() => setInput(q)} className="block w-full rounded-lg border border-[var(--editor-border)] bg-[var(--input-bg)] px-2.5 py-1.5 text-left text-[11px] text-muted-foreground hover:text-foreground">{q}</button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {messages.map((msg, i) => <QMsg key={i} message={msg} />)}
                  {loading && (
                    <div className="flex items-center justify-between gap-2 rounded-lg bg-[var(--input-bg)] px-3 py-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>AI sedang menulis...</span>
                      </div>
                      <button onClick={handleCancel} className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground" title="Batalkan">
                        <Square className="h-2.5 w-2.5 fill-current" />
                        <span>Stop</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="border-t border-[var(--editor-border)] p-2">
              <div className="relative">
                <Textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} placeholder="Tanya kode..." className="resize-none bg-[var(--input-bg)] pr-10 text-[13px] min-h-[40px] max-h-[80px]" rows={1} maxLength={2000} />
                <Button size="icon" onClick={send} disabled={!input.trim() || loading} className="absolute bottom-1.5 right-1.5 h-7 w-7 shrink-0" aria-label="Send"><Send className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function QMsg({ message }: { message: ChatMessage }) {
  if (message.role === 'user') return <div className="flex justify-end"><div className="max-w-[85%] rounded-lg rounded-tr-sm bg-[var(--primary)] px-2.5 py-1.5 text-[13px] text-[var(--primary-foreground)]">{message.content}</div></div>
  const parts = message.content.split(/(```[\w]*\n[\s\S]*?```)/g)
  return <div className="flex gap-1.5"><div className="flex-1 space-y-1.5">{parts.map((part, i) => {
    if (part.startsWith('```')) { const m = part.match(/```(\w*)\n([\s\S]*?)```/); if (m) return <CB key={i} code={m[2]} lang={m[1] || 'code'} /> }
    return <div key={i} className="rounded-lg rounded-tl-sm bg-[var(--input-bg)] px-2.5 py-1.5 text-[13px] leading-relaxed"><p className="whitespace-pre-wrap break-words">{part}</p></div>
  })}</div></div>
}

function CB({ code, lang }: { code: string; lang: string }) {
  const [c, setC] = useState(false)
  return <div className="overflow-hidden rounded-lg border border-[var(--editor-border)]">
    <div className="flex items-center justify-between border-b border-[var(--editor-border)] bg-[var(--list-hover)] px-2 py-1">
      <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">{lang}</span>
      <button onClick={() => { navigator.clipboard?.writeText(code); setC(true); toast.success('Kode tersalin'); setTimeout(() => setC(false), 2000) }} className={cn('flex items-center gap-1 rounded-full text-[10px] font-medium px-2 py-0.5', c ? 'text-green-400' : 'text-muted-foreground hover:text-foreground')}>{c ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}{c ? 'Tersalin' : 'Salin'}</button>
    </div>
    <pre className="overflow-x-auto bg-[var(--editor-bg)] p-2 text-[12px] leading-relaxed"><code>{code}</code></pre>
  </div>
}
