/**
 * AI Provider — ZAI SDK + proxy fallback
 *
 * Strategy:
 * 1. Try z-ai-web-dev-sdk directly (works on Space Z AI platform)
 * 2. If fails, proxy AI requests to Space Z AI app (works from Vercel/anywhere)
 *
 * The proxy URL can be set via ZAI_PROXY_URL env var.
 * Default: https://h1dnj580kw91-d.space-z.ai
 *
 * No API key needed! The Space Z AI app handles ZAI authentication.
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface CompletionRequest {
  messages: ChatMessage[]
  temperature?: number
  max_tokens?: number
  stream?: boolean
  thinking?: { type: 'enabled' | 'disabled' }
}

export interface CompletionResponse {
  choices: Array<{
    message?: { content: string }
    delta?: { content?: string; reasoning?: string; reasoning_content?: string }
    finish_reason?: string
  }>
}

// Default proxy — Space Z AI app URL
const DEFAULT_PROXY = 'https://h1dnj580kw91-d.space-z.ai'

let zaiInstance: any = null
let zaiAvailable: boolean | null = null

async function getZAI(): Promise<any | null> {
  if (zaiAvailable === false) return null
  if (zaiInstance) return zaiInstance

  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    zaiInstance = await ZAI.create()
    zaiAvailable = true
    return zaiInstance
  } catch (err) {
    console.warn('[ai] ZAI SDK not available, will use proxy:', (err as Error).message?.substring(0, 80))
    zaiAvailable = false
    return null
  }
}

export class AIProvider {
  async isZaiAvailable(): Promise<boolean> {
    const zai = await getZAI()
    return !!zai
  }

  private getProxyUrl(): string {
    return process.env.ZAI_PROXY_URL || DEFAULT_PROXY
  }

  async createCompletion(req: CompletionRequest): Promise<CompletionResponse> {
    const zai = await getZAI()
    if (zai) {
      try {
        const result = await zai.chat.completions.create({
          messages: req.messages,
          temperature: req.temperature ?? 0.7,
          max_tokens: req.max_tokens ?? 4000,
          stream: false,
          thinking: req.thinking ?? { type: 'disabled' },
        })
        return result as CompletionResponse
      } catch (err) {
        console.warn('[ai] ZAI SDK failed, using proxy:', (err as Error).message?.substring(0, 80))
        zaiAvailable = false
        zaiInstance = null
      }
    }

    // Fallback: proxy to Space Z AI
    return this.proxyCompletion(req)
  }

  async createStreamCompletion(req: CompletionRequest): Promise<{ stream: ReadableStream<Uint8Array> | null }> {
    const zai = await getZAI()
    if (zai) {
      try {
        const result = await zai.chat.completions.create({
          messages: req.messages,
          temperature: req.temperature ?? 0.7,
          max_tokens: req.max_tokens ?? 4000,
          stream: true,
          thinking: req.thinking ?? { type: 'disabled' },
        })

        if (result instanceof ReadableStream) return { stream: result }
        if (result?.body instanceof ReadableStream) return { stream: result.body }
        if (result instanceof Response && result.body) return { stream: result.body }

        const reply = result?.choices?.[0]?.message?.content || ''
        return { stream: this.createFakeStream(reply) }
      } catch (err) {
        console.warn('[ai] ZAI stream failed, using proxy:', (err as Error).message?.substring(0, 80))
        zaiAvailable = false
        zaiInstance = null
      }
    }

    return this.proxyStream(req)
  }

  private async proxyCompletion(req: CompletionRequest): Promise<CompletionResponse> {
    const proxyUrl = this.getProxyUrl()
    const res = await fetch(`${proxyUrl}/api/ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: req.messages,
        temperature: req.temperature,
        max_tokens: req.max_tokens,
        stream: false,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`AI proxy error ${res.status}: ${errText.substring(0, 200)}`)
    }

    const data = await res.json()
    return {
      choices: [{
        message: { content: data.reply || '' },
        finish_reason: 'stop',
      }],
    }
  }

  private async proxyStream(req: CompletionRequest): Promise<{ stream: ReadableStream<Uint8Array> | null }> {
    const proxyUrl = this.getProxyUrl()
    const res = await fetch(`${proxyUrl}/api/ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: req.messages,
        temperature: req.temperature,
        max_tokens: req.max_tokens,
        stream: true,
      }),
    })

    if (!res.ok || !res.body) {
      console.warn('[ai] Proxy stream failed, trying non-stream')
      const data = await this.proxyCompletion(req)
      const reply = data.choices?.[0]?.message?.content || ''
      return { stream: this.createFakeStream(reply) }
    }

    return { stream: res.body }
  }

  private createFakeStream(reply: string): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder()
    return new ReadableStream({
      start(controller) {
        const chunks = reply.match(/(\S+\s*|\s+)/g) || [reply]
        let i = 0
        const sendChunk = () => {
          if (i >= chunks.length) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ finish_reason: 'stop' }] })}\n\n`))
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
            return
          }
          const batch = chunks.slice(i, i + 3).join('')
          i += 3
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: batch } }] })}\n\n`))
          setTimeout(sendChunk, 12)
        }
        sendChunk()
      }
    })
  }

  async invokeFunction(name: string, args: any): Promise<any> {
    const zai = await getZAI()
    if (!zai) return []
    return zai.functions.invoke(name, args)
  }
}

let providerInstance: AIProvider | null = null
export function getAIProvider(): AIProvider {
  if (!providerInstance) {
    providerInstance = new AIProvider()
  }
  return providerInstance
}
