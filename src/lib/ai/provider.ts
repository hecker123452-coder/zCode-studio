/**
 * AI Provider — unified interface for multiple AI backends
 *
 * Tries z-ai-web-dev-sdk first (works on Space Z AI platform).
 * Falls back to OpenAI-compatible API if ZAI fails (for Vercel/self-hosted).
 *
 * To use OpenAI fallback, set these env vars:
 *   AI_API_KEY=sk-...
 *   AI_BASE_URL=https://api.openai.com/v1 (or compatible)
 *   AI_MODEL=gpt-4o-mini (or any model)
 *
 * Works with: OpenAI, Groq, Together, Anyscale, OpenRouter, etc.
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

export interface StreamResponse {
  body: ReadableStream<Uint8Array> | null
}

export class AIProvider {
  private zaiAvailable: boolean | null = null
  private zaiInstance: any = null

  /**
   * Try to create ZAI instance. Returns null if unavailable.
   */
  private async tryZAI(): Promise<any | null> {
    if (this.zaiAvailable === false) return null
    if (this.zaiInstance) return this.zaiInstance

    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default
      this.zaiInstance = await ZAI.create()
      this.zaiAvailable = true
      return this.zaiInstance
    } catch (err) {
      console.warn('[ai] z-ai-web-dev-sdk not available, using fallback:', (err as Error).message?.substring(0, 100))
      this.zaiAvailable = false
      return null
    }
  }

  /**
   * Check if ZAI is available
   */
  async isZaiAvailable(): Promise<boolean> {
    const zai = await this.tryZAI()
    return !!zai
  }

  /**
   * Create completion (non-streaming)
   */
  async createCompletion(req: CompletionRequest): Promise<CompletionResponse> {
    // Try ZAI first
    const zai = await this.tryZAI()
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
        console.warn('[ai] ZAI completion failed, falling back:', (err as Error).message?.substring(0, 100))
        this.zaiAvailable = false
        this.zaiInstance = null
      }
    }

    // Fallback to OpenAI-compatible API
    return this.openaiCompletion(req)
  }

  /**
   * Create streaming completion
   * Returns a ReadableStream (SSE format) or the raw response
   */
  async createStreamCompletion(req: CompletionRequest): Promise<{ stream: ReadableStream<Uint8Array> | null; isZai: boolean }> {
    // Try ZAI first
    const zai = await this.tryZAI()
    if (zai) {
      try {
        const result = await zai.chat.completions.create({
          messages: req.messages,
          temperature: req.temperature ?? 0.7,
          max_tokens: req.max_tokens ?? 4000,
          stream: true,
          thinking: req.thinking ?? { type: 'disabled' },
        })

        // ZAI returns ReadableStream directly or Response with body
        if (result instanceof ReadableStream) {
          return { stream: result, isZai: true }
        } else if (result?.body instanceof ReadableStream) {
          return { stream: result.body, isZai: true }
        } else if (result instanceof Response && result.body) {
          return { stream: result.body, isZai: true }
        }

        // If ZAI returned non-stream (fallback), treat as completion
        const reply = result?.choices?.[0]?.message?.content || ''
        // Create a fake stream from the reply
        const encoder = new TextEncoder()
        const fakeStream = new ReadableStream({
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
        return { stream: fakeStream, isZai: true }
      } catch (err) {
        console.warn('[ai] ZAI stream failed, falling back:', (err as Error).message?.substring(0, 100))
        this.zaiAvailable = false
        this.zaiInstance = null
      }
    }

    // Fallback to OpenAI-compatible API
    const stream = await this.openaiStreamCompletion(req)
    return { stream, isZai: false }
  }

  /**
   * OpenAI-compatible API call (non-streaming)
   */
  private async openaiCompletion(req: CompletionRequest): Promise<CompletionResponse> {
    const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('AI not configured. Set AI_API_KEY env var for OpenAI-compatible API.')
    }

    const baseUrl = process.env.AI_BASE_URL || 'https://api.openai.com/v1'
    const model = process.env.AI_MODEL || 'gpt-4o-mini'

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: req.messages,
        temperature: req.temperature ?? 0.7,
        max_tokens: req.max_tokens ?? 4000,
        stream: false,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`AI API error ${res.status}: ${errText.substring(0, 200)}`)
    }

    return await res.json() as CompletionResponse
  }

  /**
   * OpenAI-compatible streaming API call
   */
  private async openaiStreamCompletion(req: CompletionRequest): Promise<ReadableStream<Uint8Array> | null> {
    const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('AI not configured. Set AI_API_KEY env var for OpenAI-compatible API.')
    }

    const baseUrl = process.env.AI_BASE_URL || 'https://api.openai.com/v1'
    const model = process.env.AI_MODEL || 'gpt-4o-mini'

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: req.messages,
        temperature: req.temperature ?? 0.7,
        max_tokens: req.max_tokens ?? 4000,
        stream: true,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`AI API error ${res.status}: ${errText.substring(0, 200)}`)
    }

    return res.body
  }

  /**
   * Invoke a function (web search, page reader)
   * Only available with ZAI SDK
   */
  async invokeFunction(name: string, args: any): Promise<any> {
    const zai = await this.tryZAI()
    if (!zai) {
      console.warn(`[ai] Function ${name} not available (ZAI not configured)`)
      return []
    }
    return zai.functions.invoke(name, args)
  }
}

// Singleton
let providerInstance: AIProvider | null = null
export function getAIProvider(): AIProvider {
  if (!providerInstance) {
    providerInstance = new AIProvider()
  }
  return providerInstance
}
