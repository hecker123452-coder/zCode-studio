import { NextRequest } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { buildSystemPrompt, shouldSearchWeb, type ProjectContext } from '@/lib/ai/prompts'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 min — extended thinking needs more time

/**
 * === UPGRADED AI API — Claude 3.5-tier agent ===
 *
 * Key upgrades from previous version:
 * 1. REAL streaming (was: get full reply, then chunk it)
 * 2. EXTENDED THINKING mode (Claude 3.5-style reasoning)
 * 3. WEB SEARCH capability (AI can lookup docs when needed)
 * 4. Smart project context (file tree + active file + related files)
 * 5. Multi-phase agent flow (Analyze → Plan → Implement → Verify)
 * 6. Better error handling & timeout management
 *
 * Rate limiting & session memory: same in-memory approach as before
 * (adequate for single-instance deployment like WebView APK).
 */

// ===== Rate Limiting (in-memory, same as before) =====
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 60 // 60 requests per minute (upped from 30 — extended thinking uses more)
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

// ===== Session Memory (in-memory) =====
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

    // Build enhanced system prompt
    const systemPrompt = buildSystemPrompt({
      mode,
      context: projectContext,
      userMemory: userMemory,
      enableThinking: enableThinking ?? (mode === 'agent'),
    })

    // Check if web search would help (only in agent/fix mode, when enabled)
    const lastUserMsg = sanitizedMessages[sanitizedMessages.length - 1]
    const needsWebSearch = enableWebSearch &&
      lastUserMsg?.role === 'user' &&
      shouldSearchWeb(lastUserMsg.content) &&
      (mode === 'agent' || mode === 'fix' || mode === 'normal')

    // ===== WEB SEARCH PHASE (optional) =====
    let searchContext = ''
    if (needsWebSearch) {
      try {
        const zai = await ZAI.create()
        const searchQuery = `${lastUserMsg.content} latest documentation best practices`
        const searchResults = await zai.functions.invoke('web_search', {
          query: searchQuery,
          num: 3,
          recency_days: 90,
        })

        if (Array.isArray(searchResults) && searchResults.length > 0) {
          searchContext = '\n\n=== WEB SEARCH RESULTS (recent docs) ===\n'
          for (const r of searchResults.slice(0, 3)) {
            searchContext += `\n[${r.rank}] ${r.name}\nURL: ${r.url}\n${r.snippet}\n`
          }
        }
      } catch (searchErr) {
        // Search failed — continue without it
        console.warn('[ai] Web search failed:', searchErr)
      }
    }

    // ===== BUILD FINAL MESSAGES =====
    const finalMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt + searchContext },
      ...(sanitizedContext ? [{ role: 'system' as const, content: `Active file context:\n${sanitizedContext}` }] : []),
      ...sanitizedMessages,
    ]

    const zai = await ZAI.create()

    // ===== DETERMINE STREAMING STRATEGY =====
    // Use REAL streaming when SDK supports it & client wants streaming
    const useRealStream = wantStream === true

    if (useRealStream) {
      // ===== REAL STREAMING (SSE) =====
      const encoder = new TextEncoder()
      let cancelled = false
      const abortSignal = req.signal
      const onAbort = () => { cancelled = true }
      abortSignal.addEventListener('abort', onAbort)

      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Send initial phase indicator
            const phase = mode === 'agent' ? 'thinking' : 'connecting'
            try {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ phase })}\n\n`))
            } catch { /* controller closed */ }

            // Call SDK with stream: true
            const completion = await zai.chat.completions.create({
              messages: finalMessages,
              temperature: mode === 'agent' || mode === 'fix' ? 0.4 : 0.7,
              max_tokens: mode === 'agent' || mode === 'fix' || mode.startsWith('convert') ? 8000 : 4000,
              stream: true,
              thinking: enableThinking ? { type: 'enabled' } : { type: 'disabled' },
            })

            // Handle streaming response
            // SDK returns ReadableStream directly when stream: true (not a Response object)
            let responseStream: ReadableStream<Uint8Array> | null = null
            if (completion instanceof ReadableStream) {
              // SDK returned ReadableStream directly
              responseStream = completion
            } else if (completion?.body instanceof ReadableStream) {
              // Response object with .body
              responseStream = completion.body
            } else if (completion instanceof Response && completion.body) {
              // Response object
              responseStream = completion.body
            }

            if (responseStream) {
              // Real streaming — parse SSE from SDK
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

                    // Send reasoning (thinking) separately if present
                    if (reasoning && typeof reasoning === 'string') {
                      try {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ thinking: reasoning })}\n\n`))
                      } catch { /* closed */ }
                    }

                    // Send content
                    if (content && typeof content === 'string') {
                      fullReply += content
                      try {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`))
                      } catch { /* closed */ }
                    }

                    // Check for finish
                    if (parsed.choices?.[0]?.finish_reason === 'stop') {
                      // Stream complete
                      try {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ phase: 'done' })}\n\n`))
                        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                        controller.close()
                      } catch { /* closed */ }
                      abortSignal.removeEventListener('abort', onAbort)
                      // Update memory
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

              // Stream ended (either done or cancelled)
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

            // ===== FALLBACK: SDK didn't return a streamable response =====
            // Get content from completion object (non-streaming fallback)
            const fullReply = completion?.choices?.[0]?.message?.content || ''

            if (cancelled) {
              try { controller.close() } catch { /* closed */ }
              abortSignal.removeEventListener('abort', onAbort)
              return
            }

            // Stream the reply word-by-word (fake streaming fallback)
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
          'X-Accel-Buffering': 'no', // disable proxy buffering
        },
      })
    }

    // ===== NON-STREAMING RESPONSE =====
    const completion = await zai.chat.completions.create({
      messages: finalMessages,
      temperature: mode === 'agent' || mode === 'fix' ? 0.4 : 0.7,
      max_tokens: mode === 'agent' || mode === 'fix' || mode.startsWith('convert') ? 8000 : 4000,
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
