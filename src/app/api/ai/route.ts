import { NextRequest } from 'next/server'
import { buildSystemPrompt, shouldSearchWeb, type ProjectContext } from '@/lib/ai/prompts'
import { getAIProvider } from '@/lib/ai/provider'

export const runtime = 'nodejs'
export const maxDuration = 60 // Vercel hobby plan max is 60s

// ===== Rate Limiting =====
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 60
const RATE_WINDOW = 60 * 1000
const MAX_RATE_LIMIT_ENTRIES = 10000
const EVICTION_INTERVAL = 5 * 60 * 1000
let lastEvictionRun = 0

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  if (now - lastEvictionRun > EVICTION_INTERVAL) {
    for (const [k, v] of rateLimitMap) { if (now > v.resetTime) rateLimitMap.delete(k) }
    lastEvictionRun = now
  }
  if (rateLimitMap.size > MAX_RATE_LIMIT_ENTRIES) {
    const entries = Array.from(rateLimitMap.entries()).sort((a, b) => a[1].resetTime - b[1].resetTime)
    for (let i = 0; i < Math.floor(MAX_RATE_LIMIT_ENTRIES / 2); i++) rateLimitMap.delete(entries[i][0])
  }
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetTime) { rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW }); return true }
  if (entry.count >= RATE_LIMIT) return false
  entry.count++
  return true
}

interface SessionMemory { userQueries: string[]; aiActions: string[]; lastUpdate: number }
const sessionMemoryStore = new Map<string, SessionMemory>()
const MAX_MEMORY_ITEMS = 8
const MEMORY_TTL = 30 * 60 * 1000

function updateMemory(ip: string, userMsg: string, aiReply: string) {
  const mem = sessionMemoryStore.get(ip) || { userQueries: [], aiActions: [], lastUpdate: Date.now() }
  if (Date.now() - mem.lastUpdate > MEMORY_TTL) { mem.userQueries = []; mem.aiActions = [] }
  mem.userQueries.push(userMsg.substring(0, 200))
  if (mem.userQueries.length > MAX_MEMORY_ITEMS) mem.userQueries.shift()
  const actions = aiReply.match(/- [^\n]+/g)
  if (actions) { mem.aiActions.push(...actions.map(s => s.substring(0, 100))); if (mem.aiActions.length > MAX_MEMORY_ITEMS) mem.aiActions = mem.aiActions.slice(-MAX_MEMORY_ITEMS) }
  mem.lastUpdate = Date.now()
  sessionMemoryStore.set(ip, mem)
}

interface ChatMessage { role: 'system' | 'user' | 'assistant'; content: string }

function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown'
}

function sanitizeInput(text: string): string {
  if (!text || typeof text !== 'string') return ''
  if (text.length > 50000) text = text.substring(0, 50000)
  return text.replace(/\0/g, '')
}

function validateMessages(messages: unknown): messages is ChatMessage[] {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 50) return false
  for (const msg of messages) {
    if (!msg || typeof msg !== 'object') return false
    if (!['system', 'user', 'assistant'].includes(msg.role)) return false
    if (typeof msg.content !== 'string' || msg.content.length > 50000) return false
  }
  return true
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    if (!checkRateLimit(ip)) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '60' } })
    }

    const body = await req.json()
    const { messages, context, projectContext, userMemory, agentMode, applyMode, tutorMode, convertMode, enableThinking, enableWebSearch, stream: wantStream } = body as any

    if (!validateMessages(messages)) {
      return new Response(JSON.stringify({ error: 'Invalid messages' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }

    const sanitizedMessages = (messages as ChatMessage[]).map(m => ({ role: m.role, content: sanitizeInput(m.content) }))
    const sanitizedContext = typeof context === 'string' ? sanitizeInput(context) : undefined

    const mode: string = agentMode ? 'agent' : applyMode ? 'fix' : tutorMode ? 'tutor' : convertMode === 'indo-to-js' ? 'convert-js' : convertMode === 'js-to-indo' ? 'convert-indo' : 'normal'
    const lastUserMsg = sanitizedMessages[sanitizedMessages.length - 1]

    const provider = getAIProvider()
    const isZai = await provider.isZaiAvailable()

    // Web search (only with ZAI)
    let searchContext = ''
    if (enableWebSearch && isZai && lastUserMsg?.role === 'user' && shouldSearchWeb(lastUserMsg.content)) {
      try {
        const results = await provider.invokeFunction('web_search', { query: `${lastUserMsg.content} latest docs`, num: 3, recency_days: 90 })
        if (Array.isArray(results) && results.length > 0) {
          searchContext = '\n\n=== WEB SEARCH RESULTS ===\n'
          for (const r of results.slice(0, 3)) searchContext += `\n[${r.rank}] ${r.name}\nURL: ${r.url}\n${r.snippet}\n`
        }
      } catch { /* ignore */ }
    }

    const systemPrompt = buildSystemPrompt({ mode: mode as any, context: projectContext, userMemory, enableThinking })
    const finalMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt + searchContext },
      ...(sanitizedContext ? [{ role: 'system' as const, content: `Active file context:\n${sanitizedContext}` }] : []),
      ...sanitizedMessages,
    ]

    // === Non-agent mode: direct streaming ===
    if (mode !== 'agent' || !wantStream) {
      // Non-streaming
      if (!wantStream) {
        try {
          const completion = await provider.createCompletion({
            messages: finalMessages,
            temperature: mode === 'fix' ? 0.4 : 0.7,
            max_tokens: mode === 'fix' || mode.startsWith('convert') ? 8000 : 6000,
            thinking: enableThinking ? { type: 'enabled' } : { type: 'disabled' },
          })
          const reply = completion.choices?.[0]?.message?.content || ''
          if (lastUserMsg?.role === 'user') updateMemory(ip, lastUserMsg.content, reply)
          return new Response(JSON.stringify({ reply }), { headers: { 'Content-Type': 'application/json' } })
        } catch (err) {
          console.error('[ai] Completion error:', err)
          return new Response(JSON.stringify({ error: 'AI not configured', details: err instanceof Error ? err.message : 'Unknown' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
        }
      }

      // Streaming
      const encoder = new TextEncoder()
      let keepaliveCounter = 0
      const keepaliveInterval = setInterval(() => {
        keepaliveCounter++
        try { /* controller enqueue done in stream */ } catch { /* ignore */ }
      }, 5000)

      try {
        const { stream: responseStream } = await provider.createStreamCompletion({
          messages: finalMessages,
          temperature: mode === 'fix' ? 0.4 : 0.7,
          max_tokens: mode === 'fix' || mode.startsWith('convert') ? 8000 : 6000,
          thinking: enableThinking ? { type: 'enabled' } : { type: 'disabled' },
        })

        if (!responseStream) {
          // Fallback: non-streaming
          const completion = await provider.createCompletion({
            messages: finalMessages,
            temperature: mode === 'fix' ? 0.4 : 0.7,
            max_tokens: 6000,
          })
          const reply = completion.choices?.[0]?.message?.content || ''
          const sseStream = new ReadableStream({
            start(controller) {
              const chunks = reply.match(/(\S+\s*|\s+)/g) || [reply]
              let i = 0
              const send = () => {
                if (i >= chunks.length) { controller.enqueue(encoder.encode('data: [DONE]\n\n')); controller.close(); return }
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunks.slice(i, i + 3).join('') })}\n\n`))
                i += 3
                setTimeout(send, 12)
              }
              send()
            }
          })
          clearInterval(keepaliveInterval)
          return new Response(sseStream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' } })
        }

        // Real streaming — pipe through
        let fullReply = ''
        const sseStream = new ReadableStream({
          async start(controller) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ phase: 'connecting' })}\n\n`))
            const reader = responseStream.getReader()
            const decoder = new TextDecoder()
            let buffer = ''
            let gotFirst = false

            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              if (!gotFirst) { gotFirst = true; controller.enqueue(encoder.encode(`data: ${JSON.stringify({ phase: 'writing' })}\n\n`)) }

              buffer += decoder.decode(value, { stream: true })
              const lines = buffer.split('\n')
              buffer = lines.pop() || ''

              for (const line of lines) {
                if (!line.startsWith('data: ')) continue
                const dataStr = line.slice(6).trim()
                if (dataStr === '[DONE]') continue
                try {
                  const parsed = JSON.parse(dataStr)
                  const delta = parsed.choices?.[0]?.delta
                  const content = delta?.content
                  const reasoning = delta?.reasoning || delta?.reasoning_content
                  if (reasoning) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ thinking: reasoning })}\n\n`))
                  if (content) { fullReply += content; controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)) }
                  if (parsed.choices?.[0]?.finish_reason === 'stop') { controller.enqueue(encoder.encode(`data: ${JSON.stringify({ phase: 'done' })}\n\n`)); controller.enqueue(encoder.encode('data: [DONE]\n\n')); controller.close(); clearInterval(keepaliveInterval); if (lastUserMsg?.role === 'user') updateMemory(ip, lastUserMsg.content, fullReply); return }
                } catch { /* ignore */ }
              }
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ phase: 'done' })}\n\n`))
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
            clearInterval(keepaliveInterval)
            if (lastUserMsg?.role === 'user' && fullReply) updateMemory(ip, lastUserMsg.content, fullReply)
          }
        })

        return new Response(sseStream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' } })
      } catch (err) {
        clearInterval(keepaliveInterval)
        console.error('[ai] Stream error:', err)
        return new Response(JSON.stringify({ error: 'AI stream failed', details: err instanceof Error ? err.message : 'Unknown' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
      }
    }

    // === Agent mode: simplified single-pass (Vercel 60s limit) ===
    // Full multi-step agent needs >60s which Vercel free doesn't allow
    // So for agent mode on Vercel, we do single-pass with agent prompt
    try {
      const agentPrompt = buildSystemPrompt({ mode: 'agent', context: projectContext, userMemory, enableThinking })
      const completion = await provider.createCompletion({
        messages: [
          { role: 'system', content: agentPrompt + searchContext },
          ...sanitizedMessages,
        ],
        temperature: 0.4,
        max_tokens: 8000,
        thinking: enableThinking ? { type: 'enabled' } : { type: 'disabled' },
      })

      const reply = completion.choices?.[0]?.message?.content || ''
      if (lastUserMsg?.role === 'user') updateMemory(ip, lastUserMsg.content, reply)

      // Stream the reply
      const encoder = new TextEncoder()
      const sseStream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ phase: 'done' })}\n\n`))
          const chunks = reply.match(/(\S+\s*|\s+)/g) || [reply]
          let i = 0
          const send = () => {
            if (i >= chunks.length) { controller.enqueue(encoder.encode('data: [DONE]\n\n')); controller.close(); return }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunks.slice(i, i + 3).join('') })}\n\n`))
            i += 3
            setTimeout(send, 12)
          }
          send()
        }
      })

      return new Response(sseStream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' } })
    } catch (err) {
      console.error('[ai] Agent error:', err)
      return new Response(JSON.stringify({ error: 'AI agent failed', details: err instanceof Error ? err.message : 'Unknown' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }
  } catch (error) {
    console.error('AI API Error:', error)
    return new Response(JSON.stringify({ error: 'Failed to get AI response', details: error instanceof Error ? error.message : 'Unknown' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}
