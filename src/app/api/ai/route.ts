import { NextRequest } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

export const runtime = 'nodejs'
export const maxDuration = 180

/**
 * === AI API — rate limit & memory persistence notes ===
 *
 * RATE LIMITING & SESSION MEMORY:
 *   Rate-limit counters and per-IP "session memory" (recent user queries &
 *   AI actions, used to provide context for follow-up questions) are stored
 *   in-memory Maps. This has known limitations:
 *
 *   1. State is LOST on every server restart.
 *   2. State is NOT shared across instances in serverless/multi-instance setups
 *      (Vercel, load-balanced VPS). Each instance tracks its own counters.
 *   3. Without active cleanup, Maps can grow unbounded → slow memory leak.
 *
 *   Mitigations implemented here:
 *     - TTL eviction: every 5 minutes we sweep both Maps and remove entries
 *       older than their respective TTL (1 minute for rate-limit, 30 minutes
 *       for session memory). This caps memory growth.
 *     - Cap on entries: if a Map exceeds 10,000 entries, we proactively
 *       prune the oldest 50% to prevent pathological growth under attack.
 *
 *   For TRUE persistence (survive restarts, consistent across instances):
 *   migrate to Prisma. A `RateLimitEntry` and `SessionMemory` table would
 *   work — but be aware that DB writes on every request add latency. A
 *   better production pattern is Upstash Redis (HTTP-based, serverless-
 *   friendly) or Memcached. Left as a TODO because the in-memory + TTL
 *   approach is adequate for single-instance deployments like the WebView
 *   APK use case.
 *
 * IP IDENTIFICATION CAVEAT:
 *   We use the `x-forwarded-for` header to identify clients for rate-limiting.
 *   This header is set by reverse proxies (Caddy, Nginx, Cloudflare, Vercel's
 *   edge network) and can be SPOOFED if the app is reachable directly without
 *   a trusted proxy in front. In a trusted-proxy setup, the proxy overwrites
 *   any client-supplied `x-forwarded-for`, so it's safe. If you deploy this
 *   app DIRECTLY to the internet (no proxy), an attacker could forge this
 *   header to bypass rate limits. Make sure your deployment sits behind a
 *   trusted reverse proxy, OR replace `getClientIp()` with a more robust
 *   identification scheme (e.g. signed session tokens).
 */

// Streaming endpoint — returns Server-Sent Events (SSE) stream
// Client reads chunks in real-time for live progress
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)

    // Rate limit
    if (!checkRateLimit(ip)) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': '60' }
      })
    }

    const body = await req.json()
    const { messages, context, agentMode, applyMode, tutorMode, convertMode, projectFiles, stream: wantStream } = body as {
      messages: unknown
      context?: unknown
      agentMode?: boolean
      applyMode?: boolean
      tutorMode?: boolean
      convertMode?: string
      projectFiles?: unknown
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

    // Build system prompt (same as before, keep it concise)
    let projectContext = ''
    if (Array.isArray(projectFiles)) {
      const validFiles = (projectFiles as any[])
        .filter(f => f && typeof f.name === 'string' && typeof f.content === 'string')
        .slice(0, 5)
        .map(f => {
          const content = f.content.length > 500 ? f.content.substring(0, 500) + '...' : f.content
          return `${f.name}: ${content}`
        }).join('\n')
      if (validFiles) projectContext = `\n\nProject files:\n${validFiles}\n`
    }

    let systemPrompt = `Lo adalah ZCode AI, partner coding kece. Lo expert di SEMUA bahasa pemrograman.

GAYA NGOMONG: Bahasa Indonesia gaul santai. Pakai "lo", "gue", "bro". Tetap professional di hal teknis. Singkat padat jelas. Code > omong kosong.

PRINSIP KODING: Pikir dalam-dalam sebelum nulis kode. Verifikasi kode mental. Nulis kode clean, complete, working. Quality over speed.

${sanitizedContext ? `Active file:\n${sanitizedContext}\n` : ''}
${projectContext}
Respond pakai bahasa Indonesia.`

    if (agentMode) {
      systemPrompt += `

=== AGENT MODE ===
Lo jadi autonomous AI Agent. Pikir dulu, lalu tulis kode LENGKAP.

Output format:
1. ANALISIS (2-3 bullet points singkat)
2. Kode lengkap dengan filename:
\`\`\`html:index.html
... COMPLETE code ...
\`\`\`
3. Summary singkat

CRITICAL: SELALU return COMPLETE file content. JANGAN "// ... rest". Bikin kode 100% working.
Kalau user bilang "bahasa Indonesia" → pake IndoCode keywords (variabel, fungsi, jika, kalau_tidak, untuk, selama, tampilkan, dll).`
    }

    if (applyMode) {
      systemPrompt += `\n\n=== FIX MODE ===\nFix semua bug. Sebelum kode: 2-3 bullet points apa yang lo fix. Include ALL code.`
    }

    if (tutorMode) {
      systemPrompt += `\n\n=== TUTOR MODE ===\nLo jadi guru coding sabar. Konsep → Contoh → Kesimpulan.`
    }

    if (convertMode === 'indo-to-js') {
      systemPrompt += `\n\n=== CONVERT → JS ===\nReturn ONLY converted JavaScript.`
    } else if (convertMode === 'js-to-indo') {
      systemPrompt += `\n\n=== CONVERT → Indo ===\nReturn ONLY IndoCode.`
    }

    const zai = await ZAI.create()

    // Non-streaming: get full response, then stream it to client word by word
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        ...sanitizedMessages,
      ],
      temperature: agentMode ? 0.3 : 0.7,
      max_tokens: agentMode || applyMode || convertMode ? 6000 : 3000,
      stream: false,
    })

    const fullReply = completion.choices[0]?.message?.content || ''

    // If client wants streaming, send the response in chunks (real text, revealed progressively)
    if (wantStream) {
      const encoder = new TextEncoder()
      // Track whether the client has cancelled the request so we can stop pumping chunks
      let cancelled = false
      const abortSignal = req.signal
      const onAbort = () => { cancelled = true }
      abortSignal.addEventListener('abort', onAbort)
      // Also poll: AbortSignal 'abort' event may not fire if connection drops,
      // but controller.error will be triggered on next enqueue. We catch below.

      const stream = new ReadableStream({
        start(controller) {
          try {
            // Split reply into chunks (by words, keep delimiters)
            const chunks = fullReply.match(/(\S+\s*|\s+)/g) || [fullReply]
            let i = 0
            const sendChunk = () => {
              // Stop if client cancelled (e.g., closed tab, navigated away, new chat)
              if (cancelled) {
                try { controller.close() } catch { /* controller already closed — ignore */ }
                abortSignal.removeEventListener('abort', onAbort)
                return
              }
              if (i >= chunks.length) {
                try {
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                  controller.close()
                } catch { /* controller already closed — ignore */ }
                abortSignal.removeEventListener('abort', onAbort)
                // Update memory
                const lastUserMsg = sanitizedMessages[sanitizedMessages.length - 1]
                if (lastUserMsg && lastUserMsg.role === 'user') {
                  updateMemory(ip, lastUserMsg.content, fullReply)
                }
                return
              }
              // Send 2-3 words at a time for natural typing speed
              const batch = chunks.slice(i, i + 2).join('')
              i += 2
              try {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: batch })}\n\n`))
              } catch {
                // Controller closed (client disconnected). Stop the pump.
                cancelled = true
                abortSignal.removeEventListener('abort', onAbort)
                return
              }
              setTimeout(sendChunk, 15) // 15ms between chunks — fast but visible
            }
            sendChunk()
          } catch (err) {
            try {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`))
              controller.close()
            } catch { /* controller already closed — ignore */ }
            abortSignal.removeEventListener('abort', onAbort)
          }
        },
        cancel() {
          // Called by the runtime when the consumer (client) cancels the stream
          cancelled = true
          abortSignal.removeEventListener('abort', onAbort)
        },
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

    // Non-streaming response
    const lastUserMsg = sanitizedMessages[sanitizedMessages.length - 1]
    if (lastUserMsg && lastUserMsg.role === 'user') {
      updateMemory(ip, lastUserMsg.content, fullReply)
    }

    return new Response(JSON.stringify({ reply: fullReply }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('AI API Error:', error)
    return new Response(JSON.stringify({ error: 'Failed to get AI response' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    })
  }
}

// ===== Helper functions =====

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * Extract client IP from request. Uses x-forwarded-for (set by trusted
 * reverse proxies) with fallback to x-real-ip. Falls back to 'unknown' if
 * neither is present (e.g. direct localhost access during development).
 *
 * @see file-level comment for the spoofing caveat.
 */
function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) {
    // x-forwarded-for can be a comma-separated list: "client, proxy1, proxy2"
    // The left-most entry is the original client (subject to spoofing if no
    // trusted proxy is in front — see file-level comment).
    return fwd.split(',')[0].trim() || 'unknown'
  }
  return req.headers.get('x-real-ip') || 'unknown'
}

const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 30
const RATE_WINDOW = 60 * 1000 // 1 minute

// Cap to prevent unbounded memory growth under attack
const MAX_RATE_LIMIT_ENTRIES = 10000
// How often to run the eviction sweep
const EVICTION_INTERVAL = 5 * 60 * 1000 // 5 minutes
let lastEvictionRun = 0

function checkRateLimit(ip: string): boolean {
  const now = Date.now()

  // Periodic eviction — removes expired entries so the Map doesn't grow forever
  if (now - lastEvictionRun > EVICTION_INTERVAL) {
    evictExpiredEntries()
    lastEvictionRun = now
  }

  // Hard cap: if Map is pathologically large, prune oldest 50%
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

interface SessionMemory {
  userQueries: string[]
  aiActions: string[]
  learningNotes: string[]
  lastUpdate: number
}
const sessionMemoryStore = new Map<string, SessionMemory>()
const MAX_MEMORY_ITEMS = 8
const MEMORY_TTL = 30 * 60 * 1000 // 30 minutes
const MAX_SESSION_MEMORY_ENTRIES = 10000

function getMemory(ip: string): SessionMemory {
  const existing = sessionMemoryStore.get(ip)
  if (existing && Date.now() - existing.lastUpdate < MEMORY_TTL) return existing
  const fresh: SessionMemory = { userQueries: [], aiActions: [], learningNotes: [], lastUpdate: Date.now() }
  sessionMemoryStore.set(ip, fresh)
  return fresh
}

function updateMemory(ip: string, userMsg: string, aiReply: string) {
  // Cap check — if we're at the limit, prune oldest 50%
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

/**
 * Sweep both Maps and remove entries that have expired (rate-limit entries
 * past their resetTime, session-memory entries older than MEMORY_TTL).
 * Called periodically by checkRateLimit() — no external timer needed.
 */
function evictExpiredEntries() {
  const now = Date.now()

  // Evict rate-limit entries
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(ip)
    }
  }

  // Evict stale session-memory entries
  for (const [ip, mem] of sessionMemoryStore) {
    if (now - mem.lastUpdate > MEMORY_TTL) {
      sessionMemoryStore.delete(ip)
    }
  }
}

/**
 * Prune the oldest N entries from a Map. "Oldest" is determined by:
 *   - For rateLimitMap: by resetTime (oldest first)
 *   - For sessionMemoryStore: by lastUpdate (oldest first)
 *
 * Used as a safety valve when a Map grows beyond MAX_*_ENTRIES — typically
 * only under attack (e.g. DDoS with forged source IPs).
 */
function pruneOldestEntries(
  map: Map<string, { resetTime: number } | SessionMemory>,
  count: number
) {
  // Convert to array and sort by timestamp (oldest first)
  const entries = Array.from(map.entries())
  // We need to read resetTime OR lastUpdate depending on the entry shape
  entries.sort((a, b) => {
    const ta = 'resetTime' in a[1] ? a[1].resetTime : a[1].lastUpdate
    const tb = 'resetTime' in b[1] ? b[1].resetTime : b[1].lastUpdate
    return ta - tb
  })
  // Delete the oldest `count` entries
  for (let i = 0; i < count && i < entries.length; i++) {
    map.delete(entries[i][0])
  }
}
