'use client'

import { Files, Search, Bot, Menu, Sparkles } from 'lucide-react'
import { useEditorStore } from '@/store/editor-store'
import { cn } from '@/lib/utils'

export function MobileBottomNav() {
  const activeView = useEditorStore(s => s.activeView)
  const setActiveView = useEditorStore(s => s.setActiveView)
  const setMobileSidebarOpen = useEditorStore(s => s.setMobileSidebarOpen)
  const setMobileAIOpen = useEditorStore(s => s.setMobileAIOpen)
  const setMobileMenuOpen = useEditorStore(s => s.setMobileMenuOpen)
  const setCommandPaletteOpen = useEditorStore(s => s.setCommandPaletteOpen)

  const haptic = (pattern: number = 10) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(pattern) } catch { /* Vibration API not supported — ignore */ }
    }
  }

  const openDrawer = (view: 'explorer' | 'search' | 'git' | 'snippets') => {
    haptic(8)
    setActiveView(view)
    setMobileSidebarOpen(true)
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--editor-border)] bg-[var(--activity-bar-bg)]/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.2)] md:hidden">
      <div className="relative flex h-16 items-center justify-around px-2">
        {/* Left: Files + Search */}
        <NavButton
          icon={Files}
          label="Files"
          isActive={activeView === 'explorer'}
          onClick={() => openDrawer('explorer')}
        />

        <NavButton
          icon={Search}
          label="Search"
          isActive={activeView === 'search'}
          onClick={() => openDrawer('search')}
        />

        {/* Center: FAB - Quick Actions */}
        <button
          onClick={() => { haptic(20); setCommandPaletteOpen(true) }}
          className="relative -mt-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--list-hover)] text-foreground transition-all active:scale-90"
          aria-label="Quick Actions"
        >
          <span className="absolute inset-0 animate-ping rounded-2xl bg-current opacity-20 [animation-duration:3s]" />
          <Sparkles className="relative h-7 w-7 text-white" strokeWidth={2.5} />
        </button>

        {/* Right: AI + Menu */}
        <NavButton
          icon={Bot}
          label="AI"
          onClick={() => { haptic(15); setMobileAIOpen(true) }}
        />

        <NavButton
          icon={Menu}
          label="Menu"
          onClick={() => { haptic(8); setMobileMenuOpen(true) }}
        />
      </div>
    </div>
  )
}

interface NavButtonProps {
  icon: typeof Files
  label: string
  isActive?: boolean
  onClick: () => void
}

function NavButton({ icon: Icon, label, isActive, onClick }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex h-12 w-12 flex-col items-center justify-center gap-1 rounded-xl transition-all active:scale-90',
        isActive
          ? 'text-foreground bg-[var(--list-hover)]'
          : 'text-foreground/70 active:text-foreground active:bg-[var(--list-hover)]'
      )}
    >
      <Icon
        className="h-[22px] w-[22px]"
        strokeWidth={isActive ? 2.5 : 2}
      />
      <span className={cn(
        'text-[10px] font-medium leading-none',
        isActive && 'font-semibold'
      )}>
        {label}
      </span>
    </button>
  )
}
