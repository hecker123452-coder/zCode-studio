'use client'

import { AIAssistant } from '@/components/editor/ai-assistant'
import { useEditorStore } from '@/store/editor-store'

export function MobileAIModal() {
  const open = useEditorStore(s => s.mobileAIOpen)
  const setOpen = useEditorStore(s => s.setMobileAIOpen)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--side-bar-bg)] md:hidden animate-in fade-in duration-200">
      <AIAssistant
        isMobile
        onClose={() => setOpen(false)}
      />
    </div>
  )
}
