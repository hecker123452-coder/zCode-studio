/**
 * AI Inline Completion — Copilot-style code suggestions
 *
 * Provides inline code suggestions as the user types.
 * Uses a debounced API call to the AI endpoint.
 * Suggestions appear as ghost text in the editor.
 */

interface CompletionRequest {
  code: string
  language: string
  fileName: string
}

interface CompletionResponse {
  suggestion: string | null
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let lastRequest = ''

/**
 * Request an inline completion from the AI.
 * Debounced to avoid spamming the API on every keystroke.
 */
export async function requestInlineCompletion(req: CompletionRequest): Promise<CompletionResponse> {
  const requestKey = `${req.fileName}:${req.code.slice(-200)}`

  // Skip if same request as last time (avoid duplicate calls)
  if (requestKey === lastRequest) return { suggestion: null }
  lastRequest = requestKey

  // Skip if code too short
  if (req.code.trim().length < 10) return { suggestion: null }

  try {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{
          role: 'user',
          content: `Lanjutin kode ini. Hanya kasih kode lanjutannya, jangan ulang kode yang udah ada.\n\nFile: ${req.fileName}\nLanguage: ${req.language}\n\nCode:\n${req.code.slice(-500)}`,
        }],
        stream: false,
      }),
    })

    if (!res.ok) return { suggestion: null }
    const data = await res.json()
    let suggestion = data.reply || ''

    // Clean up: remove code fences if present
    suggestion = suggestion.replace(/^```\w*\n?/, '').replace(/\n?```$/, '')

    // Remove leading/trailing whitespace that doesn't make sense
    suggestion = suggestion.trim()

    // Don't suggest if it's too short or just repeats existing code
    if (suggestion.length < 5) return { suggestion: null }

    return { suggestion }
  } catch {
    return { suggestion: null }
  }
}

/**
 * Debounced version — waits 800ms after last keystroke before requesting.
 */
export function debouncedRequestCompletion(
  req: CompletionRequest,
  callback: (response: CompletionResponse) => void
) {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(async () => {
    const response = await requestInlineCompletion(req)
    callback(response)
  }, 800)
}

/**
 * Cancel any pending debounced request.
 */
export function cancelPendingCompletion() {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  lastRequest = ''
}
