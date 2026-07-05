'use client'

import { useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Code2, Github, Heart, Zap, Bot, ShieldCheck, Rocket, Terminal } from 'lucide-react'

interface AboutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const APP_VERSION = '2.4.0'
const APP_NAME = 'ZCode Studio'

export function AboutDialog({ open, onOpenChange }: AboutDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Tentang {APP_NAME}</DialogTitle>
          <DialogDescription>Informasi versi dan teknologi</DialogDescription>
        </DialogHeader>

        {/* Hero */}
        <div className="relative flex flex-col items-center bg-gradient-to-br from-[var(--side-bar-bg)] to-[var(--title-bar-bg)] px-6 pt-8 pb-6 text-center border-b border-[var(--editor-border)]">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--list-hover)]">
            <Code2 className="h-8 w-8" strokeWidth={1.5} />
          </div>
          <h2 className="text-xl font-bold">{APP_NAME}</h2>
          <p className="mt-1 text-xs text-muted-foreground">Web-Based Code Editor</p>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[var(--editor-border)] bg-[var(--input-bg)] px-3 py-1 text-[10px] font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            v{APP_VERSION}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Editor kode web yang terinspirasi dari Acode. Dibangun dengan Next.js &amp; Monaco Editor.
            Mendukung IndoCode (bahasa pemrograman bahasa Indonesia), AI Assistant, Bug Scanner, dan deploy project HTML.
          </p>

          {/* Feature grid */}
          <div className="grid grid-cols-2 gap-2">
            <Feature icon={Bot} label="AI Assistant" desc="Streaming chat + agent mode" />
            <Feature icon={Terminal} label="IndoCode Runner" desc="Canvas game + console" />
            <Feature icon={ShieldCheck} label="Bug Scanner" desc="4 mode scan" />
            <Feature icon={Rocket} label="Deploy" desc="HTML ke URL publik" />
          </div>

          {/* Tech stack */}
          <div>
            <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Dibangun dengan</h3>
            <div className="flex flex-wrap gap-1.5">
              {['Next.js 16', 'React 19', 'TypeScript', 'Monaco', 'Tailwind 4', 'shadcn/ui', 'Prisma', 'Zustand', 'z-ai-web-dev-sdk'].map(tech => (
                <span key={tech} className="rounded-md border border-[var(--editor-border)] bg-[var(--input-bg)] px-2 py-0.5 text-[10px] font-medium">
                  {tech}
                </span>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-[var(--editor-border)] pt-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Heart className="h-3 w-3 fill-red-500 text-red-500" />
              <span>MIT License</span>
            </span>
            <span>© {new Date().getFullYear()} {APP_NAME}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Feature({ icon: Icon, label, desc }: { icon: any; label: string; desc: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-[var(--editor-border)] bg-[var(--side-bar-bg)] p-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
      <div className="min-w-0">
        <div className="text-xs font-semibold truncate">{label}</div>
        <div className="text-[10px] text-muted-foreground truncate">{desc}</div>
      </div>
    </div>
  )
}

/** Hook for opening About dialog from anywhere */
export function useAboutDialog() {
  const [open, setOpen] = useState(false)
  return { open, setOpen, AboutDialog: <AboutDialog open={open} onOpenChange={setOpen} /> }
}
