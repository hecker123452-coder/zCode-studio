import { NextRequest } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { buildSystemPrompt, shouldSearchWeb, type ProjectContext } from '@/lib/ai/prompts'
import { runAgentLoop } from '@/lib/ai/agent-loop'

export const runtime = 'nodejs'
export const maxDuration = 600 // 10 min — multi-step agent needs lots of time

/**
 * === UPGRADED AI API — Claude 3.5-tier multi-step agent ===
 *
 * Multi-step agent flow (Plan → Execute → Review → Refine)
 * Plus single-pass modes for simple requests.
 *
 * Rate limiting & session memory: in-memory (adequate for single-instance).
 */

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
    evictExpiredEntries()
    lastEvictionRun = now
  }
  if (rateLimitMap.size > MAX_RATE_LIMIT_ENTRIES) {
    pruneOldestEntries(rateLimitMap, Math.floor(MAX_RATE_LIMIT_ENTRIES / 2))
  }
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW })
    return true
  }
  if (entry.count >= RATE_LIMIT) return false
  entry.count++
  return true
}

function evictExpiredEntries() {
  const now = Date.now()
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetTime) rateLimitMap.delete(ip)
  }
  for (const [ip, mem] of sessionMemoryStore) {
    if (now - mem.lastUpdate > MEMORY_TTL) sessionMemoryStore.delete(ip)
  }
}

function pruneOldestEntries(
  map: Map<string, { resetTime: number } | SessionMemory>,
  count: number
) {
  const entries = Array.from(map.entries())
  entries.sort((a, b) => {
    const ta = 'resetTime' in a[1] ? a[1].resetTime : a[1].lastUpdate
    const tb = 'resetTime' in b[1] ? b[1].resetTime : b[1].lastUpdate
    return ta - tb
  })
  for (let i = 0; i < count && i < entries.length; i++) {
    map.delete(entries[i][0])
  }
}

// ===== Session Memory =====
interface SessionMemory {
  userQueries: string[]
  aiActions: string[]
  learningNotes: string[]
  lastUpdate: number
}
const sessionMemoryStore = new Map<string, SessionMemory>()
const MAX_MEMORY_ITEMS = 8
const MEMORY_TTL = 30 * 60 * 1000
const MAX_SESSION_MEMORY_ENTRIES = 10000

function getMemory(ip: string): SessionMemory {
  const existing = sessionMemoryStore.get(ip)
  if (existing && Date.now() - existing.lastUpdate < MEMORY_TTL) return existing
  const fresh: SessionMemory = { userQueries: [], aiActions: [], learningNotes: [], lastUpdate: Date.now() }
  sessionMemoryStore.set(ip, fresh)
  return fresh
}

function updateMemory(ip: string, userMsg: string, aiReply: string) {
  if (sessionMemoryStore.size > MAX_SESSION_MEMORY_ENTRIES) {
    pruneOldestEntries(sessionMemoryStore, Math.floor(MAX_SESSION_MEMORY_ENTRIES / 2))
  }
  const mem = getMemory(ip)
  mem.userQueries.push(userMsg.substring(0, 200))
  if (mem.userQueries.length > MAX_MEMORY_ITEMS) mem.userQueries.shift()
  const actionMatches = aiReply.match(/- [^\n]+/g)
  if (actionMatches) {
    mem.aiActions.push(...actionMatches.map(s => s.substring(0, 100)))
    if (mem.aiActions.length > MAX_MEMORY_ITEMS) mem.aiActions = mem.aiActions.slice(-MAX_MEMORY_ITEMS)
  }
  mem.lastUpdate = Date.now()
}

// ===== Helpers =====
interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim() || 'unknown'
  return req.headers.get('x-real-ip') || 'unknown'
}

function sanitizeInput(text: string): string {
  if (!text || typeof text !== 'string') return ''
  if (text.length > 50000) text = text.substring(0, 50000)
  text = text.replace(/\0/g, '')
  return text
}

function validateMessages(messages: unknown): messages is ChatMessage[] {
  if (!Array.isArray(messages) || messages.length === 0) return false
  if (messages.length > 50) return false
  for (const msg of messages) {
    if (!msg || typeof msg !== 'object') return false
    if (!['system', 'user', 'assistant'].includes(msg.role)) return false
    if (typeof msg.content !== 'string' || msg.content.length > 50000) return false
  }
  return true
}

// ===== Main Handler =====
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)

    if (!checkRateLimit(ip)) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': '60' }
      })
    }

    const body = await req.json()
    const {
      messages, context, projectContext, userMemory,
      agentMode, applyMode, tutorMode, convertMode,
      enableThinking, enableWebSearch,
      stream: wantStream,
    } = body as {
      messages: unknown
      context?: unknown
      projectContext?: ProjectContext
      userMemory?: string[]
      agentMode?: boolean
      applyMode?: boolean
      tutorMode?: boolean
      convertMode?: string
      enableThinking?: boolean
      enableWebSearch?: boolean
      stream?: boolean
    }

    if (!validateMessages(messages)) {
      return new Response(JSON.stringify({ error: 'Invalid messages' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      })
    }

    if (convertMode && !['indo-to-js', 'js-to-indo'].includes(convertMode)) {
      return new Response(JSON.stringify({ error: 'Invalid convert mode' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      })
    }

    const sanitizedMessages = (messages as ChatMessage[]).map(m => ({
      role: m.role,
      content: sanitizeInput(m.content),
    }))

    const sanitizedContext = typeof context === 'string' ? sanitizeInput(context) : undefined

    // Determine mode
    const mode: 'normal' | 'agent' | 'fix' | 'tutor' | 'convert-js' | 'convert-indo' =
      agentMode ? 'agent' :
      applyMode ? 'fix' :
      tutorMode ? 'tutor' :
      convertMode === 'indo-to-js' ? 'convert-js' :
      convertMode === 'js-to-indo' ? 'convert-indo' :
      'normal'

    const lastUserMsg = sanitizedMessages[sanitizedMessages.length - 1]

    // ===== AGENT MODE: Use multi-step agent loop =====
    if (mode === 'agent' && wantStream) {
      const encoder = new TextEncoder()
      let cancelled = false
      const abortSignal = req.signal
      const onAbort = () => { cancelled = true }
      abortSignal.addEventListener('abort', onAbort)

      const stream = new ReadableStream({
        async start(controller) {
          try {
            let fullReply = ''
            let fullReasoning = ''

            await runAgentLoop({
              userRequest: lastUserMsg?.content || '',
              conversationHistory: sanitizedMessages.map(m => ({
                role: m.role as 'user' | 'assistant',
                content: m.content,
              })),
              context: projectContext,
              userMemory: userMemory || [],
              enableWebSearch: enableWebSearch !== false, // default true for agent
              enableThinking: enableThinking !== false, // default true for agent
              signal: abortSignal,
              onEvent: (event) => {
                if (cancelled) return
                try {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
                  if (event.content) fullReply += event.content
                  if (event.thinking) fullReasoning += event.thinking
                } catch { /* closed */ }
              },
            })

            // Update memory
            if (lastUserMsg && lastUserMsg.role === 'user' && fullReply) {
              updateMemory(ip, lastUserMsg.content, fullReply)
            }

            try {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'))
              controller.close()
            } catch { /* closed */ }
            abortSignal.removeEventListener('abort', onAbort)
          } catch (err) {
            console.error('[ai] Agent loop error:', err)
            try {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Agent error: ' + (err as Error).message })}\n\n`))
              controller.enqueue(encoder.encode('data: [DONE]\n\n'))
              controller.close()
            } catch { /* closed */ }
            abortSignal.removeEventListener('abort', onAbort)
          }
        },
        cancel() {
          cancelled = true
          abortSignal.removeEventListener('abort', onAbort)
        },
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      })
    }

    // ===== NON-AGENT MODE: Single-pass streaming =====
    const systemPrompt = buildSystemPrompt({
      mode,
      context: projectContext,
      userMemory: userMemory,
      enableThinking,
    })

    // Web search for non-agent modes (if enabled)
    let searchContext = ''
    if (enableWebSearch && lastUserMsg?.role === 'user' && shouldSearchWeb(lastUserMsg.content)) {
      try {
        const zai = await ZAI.create()
        const searchResults = await zai.functions.invoke('web_search', {
          query: `${lastUserMsg.content} latest documentation best practices`,
          num: 3,
          recency_days: 90,
        })
        if (Array.isArray(searchResults) && searchResults.length > 0) {
          searchContext = '\n\n=== WEB SEARCH RESULTS (recent docs) ===\n'
          for (const r of searchResults.slice(0, 3)) {
            searchContext += `\n[${r.rank}] ${r.name}\nURL: ${r.url}\n${r.snippet}\n`
          }
        }
      } catch (err) {
        console.warn('[ai] Web search failed:', err)
      }
    }

    const finalMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt + searchContext },
      ...(sanitizedContext ? [{ role: 'system' as const, content: `Active file context:\n${sanitizedContext}` }] : []),
      ...sanitizedMessages,
    ]

    const zai = await ZAI.create()
    const useRealStream = wantStream === true

    if (useRealStream) {
      const encoder = new TextEncoder()
      let cancelled = false
      const abortSignal = req.signal
      const onAbort = () => { cancelled = true }
      abortSignal.addEventListener('abort', onAbort)

      const stream = new ReadableStream({
        async start(controller) {
          try {
            const phase = mode === 'fix' ? 'thinking' : 'connecting'
            try {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ phase })}\n\n`))
            } catch { /* closed */ }

            const completion = await zai.chat.completions.create({
              messages: finalMessages,
              temperature: mode === 'fix' ? 0.4 : 0.7,
              max_tokens: mode === 'fix' || mode.startsWith('convert') ? 8000 : 6000,
              stream: true,
              thinking: enableThinking ? { type: 'enabled' } : { type: 'disabled' },
            })

            let responseStream: ReadableStream<Uint8Array> | null = null
            if (completion instanceof ReadableStream) {
              responseStream = completion
            } else if (completion?.body instanceof ReadableStream) {
              responseStream = completion.body
            } else if (completion instanceof Response && completion.body) {
              responseStream = completion.body
            }

            if (responseStream) {
              const reader = responseStream.getReader()
              const decoder = new TextDecoder()
              let buffer = ''
              let fullReply = ''

              while (!cancelled) {
                const { done, value } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop() || ''

                for (const line of lines) {
                  if (cancelled) break
                  if (!line.startsWith('data: ')) continue
                  const dataStr = line.slice(6).trim()
                  if (dataStr === '[DONE]') continue

                  try {
                    const parsed = JSON.parse(dataStr)
                    const delta = parsed.choices?.[0]?.delta
                    const content = delta?.content
                    const reasoning = delta?.reasoning || delta?.reasoning_content

                    if (reasoning && typeof reasoning === 'string') {
                      try {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ thinking: reasoning })}\n\n`))
                      } catch { /* closed */ }
                    }

                    if (content && typeof content === 'string') {
                      fullReply += content
                      try {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`))
                      } catch { /* closed */ }
                    }

                    if (parsed.choices?.[0]?.finish_reason === 'stop') {
                      try {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ phase: 'done' })}\n\n`))
                        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                        controller.close()
                      } catch { /* closed */ }
                      abortSignal.removeEventListener('abort', onAbort)
                      if (lastUserMsg && lastUserMsg.role === 'user' && fullReply) {
                        updateMemory(ip, lastUserMsg.content, fullReply)
                      }
                      return
                    }
                  } catch {
                    // skip parse errors
                  }
                }
              }

              if (!cancelled) {
                try {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ phase: 'done' })}\n\n`))
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                  controller.close()
                } catch { /* closed */ }
              }
              if (lastUserMsg && lastUserMsg.role === 'user' && fullReply) {
                updateMemory(ip, lastUserMsg.content, fullReply)
              }
              abortSignal.removeEventListener('abort', onAbort)
              return
            }

            // Fallback: non-streaming
            const fullReply = completion?.choices?.[0]?.message?.content || ''
            const chunks = fullReply.match(/(\S+\s*|\s+)/g) || [fullReply]
            let i = 0
            const sendChunk = () => {
              if (cancelled) {
                try { controller.close() } catch { /* closed */ }
                abortSignal.removeEventListener('abort', onAbort)
                return
              }
              if (i >= chunks.length) {
                try {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ phase: 'done' })}\n\n`))
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                  controller.close()
                } catch { /* closed */ }
                abortSignal.removeEventListener('abort', onAbort)
                if (lastUserMsg && lastUserMsg.role === 'user') {
                  updateMemory(ip, lastUserMsg.content, fullReply)
                }
                return
              }
              const batch = chunks.slice(i, i + 3).join('')
              i += 3
              try {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: batch })}\n\n`))
              } catch {
                cancelled = true
                abortSignal.removeEventListener('abort', onAbort)
                return
              }
              setTimeout(sendChunk, 12)
            }
            sendChunk()
          } catch (err) {
            console.error('[ai] Stream error:', err)
            try {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Stream error: ' + (err as Error).message })}\n\n`))
              controller.close()
            } catch { /* closed */ }
            abortSignal.removeEventListener('abort', onAbort)
          }
        },
        cancel() {
          cancelled = true
          abortSignal.removeEventListener('abort', onAbort)
        },
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      })
    }

    // ===== Non-streaming response =====
    const completion = await zai.chat.completions.create({
      messages: finalMessages,
      temperature: mode === 'fix' ? 0.4 : 0.7,
      max_tokens: mode === 'fix' || mode.startsWith('convert') ? 8000 : 6000,
      stream: false,
      thinking: enableThinking ? { type: 'enabled' } : { type: 'disabled' },
    })

    const fullReply = completion?.choices?.[0]?.message?.content || ''

    if (lastUserMsg && lastUserMsg.role === 'user') {
      updateMemory(ip, lastUserMsg.content, fullReply)
    }

    return new Response(JSON.stringify({ reply: fullReply }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('AI API Error:', error)
    return new Response(JSON.stringify({
      error: 'Failed to get AI response',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    })
  }
}
