'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Terminal, X, Wifi, Copy, Check, Zap, Settings, Info, Shield,
  Smartphone, Cpu, HardDrive, Activity, AlertCircle, Power,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface SecretMenuProps {
  open: boolean
  onClose: () => void
}

type Tab = 'termux' | 'system' | 'experimental' | 'console'

export function SecretMenu({ open, onClose }: SecretMenuProps) {
  const [tab, setTab] = useState<Tab>('termux')
  const [copied, setCopied] = useState(false)
  const [termuxConnected, setTermuxConnected] = useState(false)
  const [termuxHost, setTermuxHost] = useState('localhost:8080')
  const [terminalLines, setTerminalLines] = useState<{ type: 'input' | 'output' | 'error'; text: string }[]>([
    { type: 'output', text: 'ZCode Termux Bridge v1.0' },
    { type: 'output', text: 'Jalankan command di bawah di Termux HP lo untuk connect.' },
  ])
  const [terminalInput, setTerminalInput] = useState('')
  const wsRef = useRef<WebSocket | null>(null)
  const terminalRef = useRef<HTMLDivElement>(null)

  // System info
  const [systemInfo, setSystemInfo] = useState({
    platform: '—',
    cores: 0,
    memory: '—',
    screen: '—',
    battery: '—',
    online: true,
    cookies: 0,
    localStorage: 0,
  })

  useEffect(() => {
    if (open && tab === 'system') {
      const nav = navigator as any
      setSystemInfo({
        platform: nav.platform || '—',
        cores: nav.hardwareConcurrency || 0,
        memory: (nav.deviceMemory || 0) + ' GB',
        screen: `${screen.width}x${screen.height}`,
        battery: '—',
        online: nav.onLine,
        cookies: document.cookie ? document.cookie.split(';').length : 0,
        localStorage: Object.keys(localStorage).length,
      })
      // Battery API
      if (nav.getBattery) {
        nav.getBattery().then((b: any) => {
          setSystemInfo(prev => ({ ...prev, battery: `${Math.round(b.level * 100)}%${b.charging ? ' ⚡' : ''}` }))
        })
      }
    }
  }, [open, tab])

  // Console capture
  const [consoleLogs, setConsoleLogs] = useState<{ type: string; text: string }[]>([])
  useEffect(() => {
    if (!open) return
    const origLog = console.log
    const origError = console.error
    const origWarn = console.warn

    console.log = (...args: any[]) => {
      setConsoleLogs(prev => [...prev.slice(-50), { type: 'log', text: args.map(String).join(' ') }])
      origLog(...args)
    }
    console.error = (...args: any[]) => {
      setConsoleLogs(prev => [...prev.slice(-50), { type: 'error', text: args.map(String).join(' ') }])
      origError(...args)
    }
    console.warn = (...args: any[]) => {
      setConsoleLogs(prev => [...prev.slice(-50), { type: 'warn', text: args.map(String).join(' ') }])
      origWarn(...args)
    }

    return () => {
      console.log = origLog
      console.error = origError
      console.warn = origWarn
    }
  }, [open])

  // Generate Termux bridge command
  const bridgeCommand = `pkg install nodejs -y && node -e "
const WebSocket = require('ws');
const { execSync } = require('child_process');
const ws = new WebSocket('ws://${typeof window !== 'undefined' ? window.location.host : 'localhost:3000'}/?XTransformPort=8080');
ws.on('message', (cmd) => {
  try {
    const out = execSync(cmd.toString(), { timeout: 5000, encoding: 'utf8' });
    ws.send(out);
  } catch(e) { ws.send('Error: ' + e.message); }
});
ws.on('open', () => console.log('Connected to ZCode!'));
ws.on('close', () => console.log('Disconnected'));
console.log('ZCode Termux Bridge running... waiting for connection');
"`

  const handleCopyBridge = () => {
    navigator.clipboard?.writeText(bridgeCommand)
    setCopied(true)
    toast.success('Command disalin! Paste di Termux.')
    setTimeout(() => setCopied(false), 2000)
  }

  // Connect to Termux via WebSocket
  const handleConnect = () => {
    try {
      const wsUrl = `ws://${typeof window !== 'undefined' ? window.location.host : 'localhost'}/?XTransformPort=${termuxHost.split(':')[1] || '8080'}`
      wsRef.current = new WebSocket(wsUrl)

      wsRef.current.onopen = () => {
        setTermuxConnected(true)
        setTerminalLines(prev => [...prev, { type: 'output', text: '✓ Connected to Termux!' }])
        toast.success('Termux connected!')
      }

      wsRef.current.onmessage = (e) => {
        setTerminalLines(prev => [...prev, { type: 'output', text: e.data }])
      }

      wsRef.current.onclose = () => {
        setTermuxConnected(false)
        setTerminalLines(prev => [...prev, { type: 'error', text: 'Disconnected from Termux' }])
      }

      wsRef.current.onerror = () => {
        setTerminalLines(prev => [...prev, { type: 'error', text: 'Connection failed. Pastikan Termux bridge jalan.' }])
        toast.error('Gagal connect ke Termux')
      }
    } catch (err) {
      toast.error('Gagal connect: ' + (err as Error).message)
    }
  }

  const handleTerminalCommand = () => {
    if (!terminalInput.trim()) return
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setTerminalLines(prev => [...prev, { type: 'error', text: 'Not connected to Termux' }])
      return
    }
    setTerminalLines(prev => [...prev, { type: 'input', text: `$ ${terminalInput}` }])
    wsRef.current.send(terminalInput)
    setTerminalInput('')
  }

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [terminalLines])

  // Experimental features
  const [experimental, setExperimental] = useState({
    aiAutoComplete: true,
    inlinePreview: false,
    debugMode: false,
    bypassSecurity: false,
    unlimitedTokens: false,
  })

  const toggleExperimental = (key: keyof typeof experimental) => {
    setExperimental(prev => ({ ...prev, [key]: !prev[key] }))
    toast.success(`${key}: ${!experimental[key] ? 'ON' : 'OFF'}`)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-[var(--editor-bg)] animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-purple-500/30 bg-gradient-to-r from-purple-900/40 to-blue-900/40 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/30">
            <Shield className="h-4 w-4 text-purple-400" />
          </div>
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold text-purple-400">
              SECRET DEV MENU
              <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[8px] font-bold">v2.0</span>
            </h2>
            <p className="text-[10px] text-muted-foreground">Power user tools · Jangan share</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-[var(--list-hover)] hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-[var(--editor-border)] bg-[var(--title-bar-bg)] px-3 py-2">
        {([
          { id: 'termux', label: '📱 Termux', icon: Smartphone },
          { id: 'system', label: '🖥️ System', icon: Cpu },
          { id: 'experimental', label: '⚡ Experimental', icon: Zap },
          { id: 'console', label: '📋 Console', icon: Terminal },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all',
              tab === t.id
                ? 'bg-purple-500/30 text-purple-400'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <t.icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* TERMUX TAB */}
        {tab === 'termux' && (
          <div className="space-y-4">
            {/* Connection status */}
            <div className={cn(
              'flex items-center gap-2 rounded-xl border p-3',
              termuxConnected
                ? 'border-emerald-500/30 bg-emerald-500/5'
                : 'border-amber-500/30 bg-amber-500/5'
            )}>
              <div className={cn(
                'h-3 w-3 rounded-full',
                termuxConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              )} />
              <span className={cn('text-sm font-medium', termuxConnected ? 'text-emerald-400' : 'text-amber-400')}>
                {termuxConnected ? 'Termux Connected' : 'Not Connected'}
              </span>
            </div>

            {/* Bridge command */}
            <div className="rounded-xl border border-[var(--editor-border)] bg-[var(--side-bar-bg)] p-4">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Smartphone className="h-4 w-4 text-purple-400" />
                Termux Bridge Setup
              </h3>
              <p className="mb-3 text-xs text-muted-foreground">
                1. Buka Termux di HP<br />
                2. Paste command ini:<br />
                3. Klik "Connect" di bawah
              </p>
              <div className="relative">
                <pre className="max-h-32 overflow-auto rounded-lg bg-black p-3 text-[10px] leading-relaxed text-emerald-400 whitespace-pre-wrap break-all font-mono">
                  {bridgeCommand}
                </pre>
                <button
                  onClick={handleCopyBridge}
                  className="absolute top-2 right-2 rounded-md bg-purple-500/30 px-2 py-1 text-[10px] font-medium text-purple-400 hover:bg-purple-500/50"
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
            </div>

            {/* Connect button */}
            <div className="flex gap-2">
              <Input
                value={termuxHost}
                onChange={(e) => setTermuxHost(e.target.value)}
                placeholder="host:port"
                className="flex-1 text-xs"
              />
              <Button
                onClick={handleConnect}
                size="sm"
                className="bg-purple-500 hover:bg-purple-600"
              >
                <Wifi className="mr-1.5 h-3.5 w-3.5" />
                Connect
              </Button>
            </div>

            {/* Terminal */}
            <div className="rounded-xl border border-[var(--editor-border)] bg-black overflow-hidden">
              <div className="flex items-center justify-between border-b border-[var(--editor-border)] px-3 py-1.5">
                <span className="text-[10px] font-medium text-muted-foreground">TERMUX TERMINAL</span>
                <button
                  onClick={() => setTerminalLines([])}
                  className="text-[10px] text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              </div>
              <div ref={terminalRef} className="h-48 overflow-y-auto p-3 font-mono text-[11px]">
                {terminalLines.map((line, i) => (
                  <div
                    key={i}
                    className={cn(
                      'whitespace-pre-wrap break-all',
                      line.type === 'input' && 'text-blue-400',
                      line.type === 'output' && 'text-emerald-400',
                      line.type === 'error' && 'text-red-400'
                    )}
                  >
                    {line.text}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1 border-t border-[var(--editor-border)] px-3 py-2">
                <span className="text-emerald-400 font-mono text-[11px]">$</span>
                <input
                  value={terminalInput}
                  onChange={(e) => setTerminalInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleTerminalCommand()}
                  placeholder="ketik command..."
                  className="flex-1 bg-transparent font-mono text-[11px] text-emerald-400 outline-none"
                  disabled={!termuxConnected}
                />
              </div>
            </div>
          </div>
        )}

        {/* SYSTEM TAB */}
        {tab === 'system' && (
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Cpu, label: 'CPU Cores', value: systemInfo.cores.toString() },
              { icon: HardDrive, label: 'Memory', value: systemInfo.memory },
              { icon: Smartphone, label: 'Screen', value: systemInfo.screen },
              { icon: Activity, label: 'Battery', value: systemInfo.battery },
              { icon: Wifi, label: 'Online', value: systemInfo.online ? 'Yes' : 'No' },
              { icon: Info, label: 'Platform', value: systemInfo.platform },
              { icon: HardDrive, label: 'Cookies', value: systemInfo.cookies.toString() },
              { icon: HardDrive, label: 'localStorage', value: systemInfo.localStorage.toString() },
            ].map((item, i) => (
              <div key={i} className="rounded-xl border border-[var(--editor-border)] bg-[var(--side-bar-bg)] p-3">
                <div className="mb-1 flex items-center gap-2">
                  <item.icon className="h-3.5 w-3.5 text-purple-400" />
                  <span className="text-[10px] font-medium uppercase text-muted-foreground">{item.label}</span>
                </div>
                <p className="text-sm font-semibold">{item.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* EXPERIMENTAL TAB */}
        {tab === 'experimental' && (
          <div className="space-y-2">
            {[
              { key: 'aiAutoComplete', label: 'AI Auto-Complete', desc: 'Inline code suggestions saat ngetik' },
              { key: 'inlinePreview', label: 'Inline Preview', desc: 'Preview HTML inline di editor' },
              { key: 'debugMode', label: 'Debug Mode', desc: 'Tampilkan debug info di status bar' },
              { key: 'bypassSecurity', label: 'Bypass Security', desc: 'Disable anti-devtools protection' },
              { key: 'unlimitedTokens', label: 'Unlimited AI Tokens', desc: 'Remove rate limit dari AI' },
            ].map(item => (
              <button
                key={item.key}
                onClick={() => toggleExperimental(item.key as keyof typeof experimental)}
                className={cn(
                  'flex w-full items-center justify-between rounded-xl border p-3 transition-all',
                  experimental[item.key as keyof typeof experimental]
                    ? 'border-purple-500/30 bg-purple-500/5'
                    : 'border-[var(--editor-border)] bg-[var(--side-bar-bg)]'
                )}
              >
                <div className="text-left">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                </div>
                <div className={cn(
                  'h-6 w-11 rounded-full p-0.5 transition-colors',
                  experimental[item.key as keyof typeof experimental] ? 'bg-purple-500' : 'bg-gray-600'
                )}>
                  <div className={cn(
                    'h-5 w-5 rounded-full bg-white transition-transform',
                    experimental[item.key as keyof typeof experimental] && 'translate-x-5'
                  )} />
                </div>
              </button>
            ))}
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-[10px] text-amber-400">
              <AlertCircle className="mb-1 h-3 w-3" />
              Experimental features mungkin unstable. Use with caution.
            </div>
          </div>
        )}

        {/* CONSOLE TAB */}
        {tab === 'console' && (
          <div className="rounded-xl border border-[var(--editor-border)] bg-black overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--editor-border)] px-3 py-1.5">
              <span className="text-[10px] font-medium text-muted-foreground">LIVE CONSOLE ({consoleLogs.length})</span>
              <button
                onClick={() => setConsoleLogs([])}
                className="text-[10px] text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            </div>
            <div className="h-96 overflow-y-auto p-3 font-mono text-[11px]">
              {consoleLogs.length === 0 ? (
                <p className="text-muted-foreground">No logs yet. Console output akan muncul di sini.</p>
              ) : (
                consoleLogs.map((log, i) => (
                  <div
                    key={i}
                    className={cn(
                      'whitespace-pre-wrap break-all py-0.5',
                      log.type === 'error' && 'text-red-400',
                      log.type === 'warn' && 'text-amber-400',
                      log.type === 'log' && 'text-emerald-400'
                    )}
                  >
                    [{log.type}] {log.text}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
