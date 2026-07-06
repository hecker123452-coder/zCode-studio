/**
 * Multi-Step Agent Loop — Claude 3.5-tier orchestration
 *
 * Flow:
 * 1. PLAN — AI generates structured execution plan
 * 2. EXECUTE — AI implements the plan (main code generation)
 * 3. REVIEW — AI reviews its own output
 * 4. REFINE — (optional) AI refines if review found issues
 *
 * Each phase streams events to the client via SSE.
 */

import ZAI from 'z-ai-web-dev-sdk'
import {
  buildSystemPrompt, buildPlanningPrompt, buildReviewPrompt,
  parsePlan, parseReviewVerdict,
  type ProjectContext, type AgentPhase,
} from './prompts'

export interface AgentEvent {
  phase?: AgentPhase
  thinking?: string
  content?: string
  plan?: string[]
  planStep?: { index: number; total: number; text: string }
  review?: string
  verdict?: 'approved' | 'needs_refinement' | 'unknown'
  error?: string
  done?: boolean
}

interface AgentLoopOpts {
  userRequest: string
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
  context?: ProjectContext
  userMemory?: string[]
  enableWebSearch?: boolean
  enableThinking?: boolean
  signal?: AbortSignal
  onEvent: (event: AgentEvent) => void
}

/**
 * Run the multi-step agent loop.
 * Streams events via onEvent callback.
 * Returns the final generated code/reply.
 */
export async function runAgentLoop(opts: AgentLoopOpts): Promise<string> {
  const {
    userRequest, conversationHistory, context, userMemory,
    enableWebSearch, enableThinking, signal, onEvent,
  } = opts

  // ===== PHASE 1: WEB SEARCH (optional) =====
  let searchContext = ''
  if (enableWebSearch) {
    onEvent({ phase: 'search' })
    try {
      const zai = await ZAI.create()
      const searchQuery = `${userRequest} latest documentation best practices 2025`
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
    } catch (err) {
      console.warn('[agent] Web search failed:', err)
    }
  }

  // ===== PHASE 2: PLANNING =====
  onEvent({ phase: 'plan' })
  let planSteps: string[] = []
  try {
    const zai = await ZAI.create()
    const planningPrompt = buildPlanningPrompt(userRequest, context)

    const planCompletion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt({
            mode: 'agent',
            context,
            userMemory,
            enableThinking,
            phase: 'plan',
          }) + searchContext,
        },
        { role: 'user', content: planningPrompt },
      ],
      temperature: 0.3, // lower temp for planning — more deterministic
      max_tokens: 1000,
      stream: false,
      thinking: { type: 'disabled' }, // planning doesn't need extended thinking
    })

    const planText = planCompletion?.choices?.[0]?.message?.content || ''
    planSteps = parsePlan(planText)

    if (planSteps.length > 0) {
      onEvent({ plan: planSteps })
      // Stream each plan step as an event for UI checklist
      planSteps.forEach((step, idx) => {
        onEvent({
          planStep: {
            index: idx + 1,
            total: planSteps.length,
            text: step,
          },
        })
      })
    }
  } catch (err) {
    console.warn('[agent] Planning phase failed:', err)
    // Continue without plan — fallback to direct execution
  }

  // ===== PHASE 3: EXECUTION (main code generation) =====
  onEvent({ phase: 'implement' })
  let generatedCode = ''

  try {
    const zai = await ZAI.create()

    // Build execution prompt with plan context
    let executionUserPrompt = userRequest
    if (planSteps.length > 0) {
      executionUserPrompt += `\n\n=== EXECUTION PLAN (follow this) ===\n`
      planSteps.forEach((step, idx) => {
        executionUserPrompt += `${idx + 1}. ${step}\n`
      })
      executionUserPrompt += `\nExecute the plan above. Produce COMPLETE production-grade code.`
    }

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt({
            mode: 'agent',
            context,
            userMemory,
            enableThinking,
            phase: 'implement',
          }) + searchContext,
        },
        // Include conversation history for context
        ...conversationHistory.slice(-6).map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user', content: executionUserPrompt },
      ],
      temperature: enableThinking ? 0.4 : 0.6,
      max_tokens: 10000, // generous for complex implementations
      stream: true,
      thinking: enableThinking ? { type: 'enabled' } : { type: 'disabled' },
    })

    // Stream the execution output
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
      let reasoningBuffer = ''

      while (true) {
        if (signal?.aborted) break
        const { done, value } = await reader.read()
        if (done) break

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

            if (reasoning && typeof reasoning === 'string') {
              reasoningBuffer += reasoning
              onEvent({ thinking: reasoning })
            }

            if (content && typeof content === 'string') {
              generatedCode += content
              onEvent({ content })
            }

            if (parsed.choices?.[0]?.finish_reason === 'stop') {
              // Stream complete
              break
            }
          } catch {
            // skip parse errors
          }
        }
      }
    } else {
      // Fallback: non-streaming
      generatedCode = completion?.choices?.[0]?.message?.content || ''
      onEvent({ content: generatedCode })
    }
  } catch (err) {
    console.error('[agent] Execution phase failed:', err)
    onEvent({ error: 'Execution failed: ' + (err as Error).message })
    return generatedCode
  }

  // ===== PHASE 4: REVIEW =====
  if (generatedCode.length > 100) { // only review if substantial code
    onEvent({ phase: 'verify' })
    try {
      const zai = await ZAI.create()
      const reviewPrompt = buildReviewPrompt(generatedCode, userRequest)

      const reviewCompletion = await zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'Lo adalah senior code reviewer. Review code dengan thorough & honest.',
          },
          { role: 'user', content: reviewPrompt },
        ],
        temperature: 0.2, // very low for review — be precise
        max_tokens: 1500,
        stream: false,
        thinking: { type: 'disabled' },
      })

      const reviewText = reviewCompletion?.choices?.[0]?.message?.content || ''
      const verdict = parseReviewVerdict(reviewText)

      onEvent({
        review: reviewText,
        verdict,
      })

      // ===== PHASE 5: REFINE (if needed) =====
      if (verdict === 'needs_refinement' && !signal?.aborted) {
        onEvent({ phase: 'refine' })
        try {
          const refineCompletion = await zai.chat.completions.create({
            messages: [
              {
                role: 'system',
                content: buildSystemPrompt({
                  mode: 'agent',
                  context,
                  userMemory,
                  enableThinking,
                  phase: 'refine',
                }),
              },
              {
                role: 'user',
                content: `Original request: ${userRequest}\n\nCode yang perlu di-refine:\n${generatedCode}\n\nReview feedback:\n${reviewText}\n\nRefine code based on review feedback. Output COMPLETE refined code.`,
              },
            ],
            temperature: 0.3,
            max_tokens: 10000,
            stream: true,
            thinking: { type: 'disabled' },
          })

          // Stream refined output
          let refineStream: ReadableStream<Uint8Array> | null = null
          if (refineCompletion instanceof ReadableStream) {
            refineStream = refineCompletion
          } else if (refineCompletion?.body instanceof ReadableStream) {
            refineStream = refineCompletion.body
          }

          if (refineStream) {
            const reader = refineStream.getReader()
            const decoder = new TextDecoder()
            let buffer = ''
            let refinedCode = ''

            while (true) {
              if (signal?.aborted) break
              const { done, value } = await reader.read()
              if (done) break

              buffer += decoder.decode(value, { stream: true })
              const lines = buffer.split('\n')
              buffer = lines.pop() || ''

              for (const line of lines) {
                if (!line.startsWith('data: ')) continue
                const dataStr = line.slice(6).trim()
                if (dataStr === '[DONE]') continue

                try {
                  const parsed = JSON.parse(dataStr)
                  const content = parsed.choices?.[0]?.delta?.content
                  if (content && typeof content === 'string') {
                    refinedCode += content
                    onEvent({ content: content, phase: 'refine' })
                  }
                } catch {
                  // skip
                }
              }
            }

            // Use refined code as final output
            if (refinedCode.length > 100) {
              generatedCode = refinedCode
            }
          }
        } catch (err) {
          console.warn('[agent] Refinement phase failed:', err)
        }
      }
    } catch (err) {
      console.warn('[agent] Review phase failed:', err)
    }
  }

  onEvent({ phase: 'done', done: true })
  return generatedCode
}
