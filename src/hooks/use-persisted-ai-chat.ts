/**
 * usePersistedAIChat — persists AI chat history & memory to localStorage
 * so conversations survive page refresh.
 */

import { useState, useEffect, useCallback, useRef } from 'react'

const STORAGE_KEY = 'zcode-ai-chat-history'
const MAX_MESSAGES = 50 // cap to avoid localStorage bloat (~5MB limit)
const MAX_MEMORY = 10

export interface PersistedChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  isAgentDone?: boolean
  appliedFiles?: string[]
  thinkingSteps?: string[]
  reasoning?: string
  usedWebSearch?: boolean
  executionPlan?: string[]
  review?: string
  reviewVerdict?: 'approved' | 'needs_refinement' | 'unknown'
}

interface PersistedChatState {
  messages: PersistedChatMessage[]
  memory: string[]
}

function loadFromStorage(): PersistedChatState {
  if (typeof window === 'undefined') return { messages: [], memory: [] }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { messages: [], memory: [] }
    const parsed = JSON.parse(raw) as PersistedChatState
    return {
      messages: Array.isArray(parsed.messages) ? parsed.messages.slice(-MAX_MESSAGES) : [],
      memory: Array.isArray(parsed.memory) ? parsed.memory.slice(-MAX_MEMORY) : [],
    }
  } catch {
    return { messages: [], memory: [] }
  }
}

function saveToStorage(state: PersistedChatState) {
  if (typeof window === 'undefined') return
  try {
    const toSave: PersistedChatState = {
      messages: state.messages.slice(-MAX_MESSAGES),
      memory: state.memory.slice(-MAX_MEMORY),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
  } catch (err) {
    // localStorage might be full — fail silently
    console.warn('[ai-chat] Failed to persist chat:', err)
  }
}

export function usePersistedAIChat() {
  const [messages, setMessages] = useState<PersistedChatMessage[]>([])
  const [memory, setMemory] = useState<string[]>([])
  const [isHydrated, setIsHydrated] = useState(false)
  const memoryRef = useRef<string[]>([])

  // Hydrate from localStorage on mount
  useEffect(() => {
    const loaded = loadFromStorage()
    setMessages(loaded.messages)
    setMemory(loaded.memory)
    memoryRef.current = loaded.memory
    setIsHydrated(true)
  }, [])

  // Persist whenever messages or memory change (after hydration)
  useEffect(() => {
    if (!isHydrated) return
    saveToStorage({ messages, memory: memoryRef.current })
  }, [messages, isHydrated])

  const addMessage = useCallback((msg: PersistedChatMessage) => {
    setMessages(prev => [...prev, msg])
  }, [])

  const updateLastMessage = useCallback((updater: (msg: PersistedChatMessage) => PersistedChatMessage) => {
    setMessages(prev => {
      if (prev.length === 0) return prev
      const newMsgs = [...prev]
      const last = newMsgs[newMsgs.length - 1]
      newMsgs[newMsgs.length - 1] = updater(last)
      return newMsgs
    })
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  const addMemory = useCallback((entry: string) => {
    memoryRef.current = [...memoryRef.current, entry].slice(-MAX_MEMORY)
    setMemory([...memoryRef.current])
  }, [])

  const clearMemory = useCallback(() => {
    memoryRef.current = []
    setMemory([])
  }, [])

  return {
    messages,
    memory,
    memoryRef,
    isHydrated,
    addMessage,
    updateLastMessage,
    clearMessages,
    addMemory,
    clearMemory,
    setMessages,
  }
}
