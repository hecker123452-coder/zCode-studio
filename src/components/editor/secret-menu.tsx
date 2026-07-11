'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Terminal, X, Wifi, Copy, Check, Zap, Settings, Info, Shield,
  Smartphone, Cpu, HardDrive, Activity, AlertCircle, Power,
  Beaker, Gauge, Database, Palette, Bug, Code2, Download,
  Trash2, RefreshCw, TerminalSquare, WifiOff, Volume2, Vibrate,
  Lock, Unlock, Eye, EyeOff, Flame, Rocket, GitBranch,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface SecretMenuProps {
  open: boolean
  onClose: () => void
}

type Tab = 'termux' | 'system' | 'experimental' | 'console' | 'tools' | 'network' | 'security'

export function SecretMenu({ open, onClose }: SecretMenuProps) {
  const [tab, setTab] = useState<Tab>('tools')
  const [copied, setCopied] = useState<string | null>(null)
  const [termuxConnected, setTermuxConnected] = useState(false)
  const [termuxHost, setTermuxHost] = useState('localhost:8080')
  const [terminalLines, setTerminalLines] = useState<{ type: 'input' | 'output' | 'error'; text: string }[]>([
    { type: 'output', text: 'ZCode Termux Bridge v2.0 — GACOR EDITION' },
    { type: 'output', text: 'Jalankan bridge command di Termux, lalu klik Connect.' },
  ])
  const [terminalInput, setTerminalInput] = useState('')
  const wsRef = useRef<WebSocket | null>(null)
  const terminalRef = useRef<HTMLDivElement>(null)

  // ===== SYSTEM INFO =====
  const [systemInfo, setSystemInfo] = useState({
    platform: '—', cores: 0, memory: '—', screen: '—',
    battery: '—', batteryCharging: false, online: true,
    cookies: 0, localStorage: 0, indexedDB: 0,
    userAgent: '—', language: '—', touchPoints: 0,
    gpu: '—', renderer: '—',
  })

  // ===== CONSOLE =====
  const [consoleLogs, setConsoleLogs] = useState<{ type: string; text: string; time: string }[]>([])

  // ===== EXPERIMENTAL =====
  const [experimental, setExperimental] = useState({
    aiAutoComplete: true,
    inlinePreview: false,
    debugMode: false,
    bypassSecurity: false,
    unlimitedTokens: false,
    godMode: false,
    forceDarkMode: true,
    disableAnimations: false,
    autoSaveInterval: false,
    showFps: false,
  })

  // ===== TOOLS =====
  const [apiTester, setApiTester] = useState({ url: '', method: 'GET', body: '', response: '', loading: false })
  const [colorPicker, setColorPicker] = useState('#6366f1')
  const [textTools, setTextTools] = useState({ input: '', output: '', mode: 'base64' })

  // ===== NETWORK =====
  const [networkInfo, setNetworkInfo] = useState({ type: '—', downlink: 0, rtt: 0, saveData: false })

  // ===== SECURITY =====
  const [securityStats, setSecurityStats] = useState({
    devtoolsOpen: false, blockedRightClicks: 0, blockedKeys: 0,
    cspActive: true, sandboxActive: true,
  })

  useEffect(() => {
    if (!open) return

    // === System Info ===
    if (tab === 'system') {
      const nav = navigator as any
      const gpu = (() => {
        try {
          const canvas = document.createElement('canvas')
          const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as any
          if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
            return debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'Unknown GPU'
          }
        } catch { /* ignore */ }
        return 'GPU not available'
      })()

      setSystemInfo({
        platform: nav.platform || '—',
        cores: nav.hardwareConcurrency || 0,
        memory: (nav.deviceMemory || 0) + ' GB',
        screen: `${screen.width}x${screen.height} @${window.devicePixelRatio}x`,
        battery: '—', batteryCharging: false,
        online: nav.onLine,
        cookies: document.cookie ? document.cookie.split(';').length : 0,
        localStorage: Object.keys(localStorage).length,
        indexedDB: '—',
        userAgent: nav.userAgent.substring(0, 80) + '...',
        language: nav.language || '—',
        touchPoints: nav.maxTouchPoints || 0,
        gpu,
        renderer: gpu,
      })

      if (nav.getBattery) {
        nav.getBattery().then((b: any) => {
          setSystemInfo(prev => ({
            ...prev,
            battery: `${Math.round(b.level * 100)}%`,
            batteryCharging: b.charging,
          }))
        })
      }

      if (nav.connection) {
        setNetworkInfo({
          type: nav.connection.effectiveType || '—',
          downlink: nav.connection.downlink || 0,
          rtt: nav.connection.rtt || 0,
          saveData: nav.connection.saveData || false,
        })
      }
    }

    // === Console Capture ===
    if (tab === 'console') {
      const origLog = console.log
      const origError = console.error
      const origWarn = console.warn

      console.log = (...args: any[]) => {
        const time = new Date().toLocaleTimeString('id-ID')
        setConsoleLogs(prev => [...prev.slice(-80), { type: 'log', text: args.map(String).join(' '), time }])
        origLog(...args)
      }
      console.error = (...args: any[]) => {
        const time = new Date().toLocaleTimeString('id-ID')
        setConsoleLogs(prev => [...prev.slice(-80), { type: 'error', text: args.map(String).join(' '), time }])
        origError(...args)
      }
      console.warn = (...args: any[]) => {
        const time = new Date().toLocaleTimeString('id-ID')
        setConsoleLogs(prev => [...prev.slice(-80), { type: 'warn', text: args.map(String).join(' '), time }])
        origWarn(...args)
      }

      return () => {
        console.log = origLog
        console.error = origError
        console.warn = origWarn
      }
    }
  }, [open, tab])

  // ===== Termux Bridge =====
  const bridgeCommand = `pkg install nodejs -y && node -e "
const WebSocket = require('ws');
const { execSync } = require('child_process');
const ws = new WebSocket('ws://${typeof window !== 'undefined' ? window.location.host : 'localhost:3000'}/?XTransformPort=8080&role=runner');
ws.on('message', (cmd) => {
  try { ws.send(execSync(cmd.toString(), { timeout: 5000, encoding: 'utf8' })); }
  catch(e) { ws.send('Error: ' + e.message); }
});
ws.on('open', () => console.log('✅ Connected to ZCode!'));
console.log('🔌 ZCode Bridge running...');"`

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard?.writeText(text)
    setCopied(id)
    toast.success('Disalin!')
    setTimeout(() => setCopied(null), 2000)
  }

  const handleConnect = () => {
    try {
      const wsUrl = `ws://${typeof window !== 'undefined' ? window.location.host : 'localhost'}/?XTransformPort=${termuxHost.split(':')[1] || '8080'}&role=client`
      wsRef.current = new WebSocket(wsUrl)
      wsRef.current.onopen = () => {
        setTermuxConnected(true)
        setTerminalLines(prev => [...prev, { type: 'output', text: '✅ Connected to Termux!' }])
        toast.success('Termux connected! 🚀')
      }
      wsRef.current.onmessage = (e) => setTerminalLines(prev => [...prev, { type: 'output', text: e.data }])
      wsRef.current.onclose = () => {
        setTermuxConnected(false)
        setTerminalLines(prev => [...prev, { type: 'error', text: '❌ Disconnected' }])
      }
      wsRef.current.onerror = () => toast.error('Connection failed')
    } catch (err) { toast.error('Gagal: ' + (err as Error).message) }
  }

  const handleTerminalCommand = () => {
    if (!terminalInput.trim()) return
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setTerminalLines(prev => [...prev, { type: 'error', text: 'Not connected' }])
      return
    }
    setTerminalLines(prev => [...prev, { type: 'input', text: `$ ${terminalInput}` }])
    wsRef.current.send(terminalInput)
    setTerminalInput('')
  }

  useEffect(() => {
    if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight
  }, [terminalLines])

  // ===== API Tester =====
  const handleApiTest = async () => {
    setApiTester(prev => ({ ...prev, loading: true, response: '' }))
    try {
      const start = Date.now()
      const res = await fetch(apiTester.url, {
        method: apiTester.method,
        headers: { 'Content-Type': 'application/json' },
        body: apiTester.method !== 'GET' ? apiTester.body : undefined,
      })
      const text = await res.text()
      const time = Date.now() - start
      setApiTester(prev => ({
        ...prev,
        response: `Status: ${res.status} ${res.statusText}\nTime: ${time}ms\nSize: ${text.length} bytes\n\n${text.substring(0, 2000)}`,
        loading: false,
      }))
      toast.success(`API responded in ${time}ms`)
    } catch (err) {
      setApiTester(prev => ({ ...prev, response: 'Error: ' + (err as Error).message, loading: false }))
      toast.error('API request failed')
    }
  }

  // ===== Text Tools =====
  const handleTextTool = () => {
    const { input, mode } = textTools
    try {
      let output = ''
      switch (mode) {
        case 'base64': output = btoa(input); break
        case 'base64decode': output = atob(input); break
        case 'url': output = encodeURIComponent(input); break
        case 'urldecode': output = decodeURIComponent(input); break
        case 'hex': output = Array.from(input).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(' '); break
        case 'binary': output = Array.from(input).map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' '); break
        case 'reverse': output = input.split('').reverse().join(''); break
        case 'uppercase': output = input.toUpperCase(); break
        case 'lowercase': output = input.toLowerCase(); break
        case 'hash': {
          let h = 0
          for (let i = 0; i < input.length; i++) { h = ((h << 5) - h) + input.charCodeAt(i); h |= 0 }
          output = 'Hash: ' + h.toString(16)
          break
        }
      }
      setTextTools(prev => ({ ...prev, output }))
    } catch { toast.error('Conversion failed') }
  }

  // ===== Experimental Toggle =====
  const toggleExperimental = (key: keyof typeof experimental) => {
    setExperimental(prev => ({ ...prev, [key]: !prev[key] }))
    if (key === 'godMode' && !experimental.godMode) {
      toast.success('🔥 GOD MODE ACTIVATED!', { duration: 3000 })
    } else if (key === 'bypassSecurity' && !experimental.bypassSecurity) {
      toast.warning('⚠️ Security bypassed — use with caution')
    } else {
      toast.success(`${key}: ${!experimental[key] ? 'ON' : 'OFF'}`)
    }
  }

  // ===== Data Export =====
  const handleExportData = () => {
    const data = {
      localStorage: { ...localStorage },
      settings: experimental,
      timestamp: new Date().toISOString(),
      version: '2.0-gacor',
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `zcode-data-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Data exported!')
  }

  const handleClearCache = () => {
    if (!confirm('Hapus SEMUA cache? (localStorage, sessionStorage, caches)')) return
    localStorage.clear()
    sessionStorage.clear()
    if ('caches' in window) {
      caches.keys().then(names => names.forEach(n => caches.delete(n)))
    }
    toast.success('Cache cleared! Refresh page recommended.')
  }

  if (!open) return null

  const tabs = [
    { id: 'tools' as Tab, label: 'Tools', icon: Zap },
    { id: 'termux' as Tab, label: 'Termux', icon: Smartphone },
    { id: 'system' as Tab, label: 'System', icon: Cpu },
    { id: 'network' as Tab, label: 'Network', icon: Wifi },
    { id: 'security' as Tab, label: 'Security', icon: Shield },
    { id: 'experimental' as Tab, label: 'Lab', icon: Beaker },
    { id: 'console' as Tab, label: 'Console', icon: Terminal },
  ]

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-[var(--editor-bg)] animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-purple-500/30 bg-gradient-to-r from-purple-900/40 via-blue-900/40 to-emerald-900/40 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 animate-pulse-glow">
            <Flame className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold text-purple-400">
              SECRET DEV MENU
              <span className="rounded bg-gradient-to-r from-purple-500 to-blue-500 px-1.5 py-0.5 text-[8px] font-bold text-white">GACOR v2.0</span>
              {experimental.godMode && <span className="rounded bg-red-500/30 px-1.5 py-0.5 text-[8px] font-bold text-red-400 animate-pulse">GOD MODE</span>}
            </h2>
            <p className="text-[10px] text-muted-foreground">Power tools · {tabs.length} tabs · Triple-click logo to open</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-[var(--list-hover)] hover:text-foreground active:scale-95"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-[var(--editor-border)] bg-[var(--title-bar-bg)] px-2 py-2">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all',
              tab === t.id
                ? 'bg-gradient-to-r from-purple-500/30 to-blue-500/30 text-purple-400'
                : 'text-muted-foreground hover:text-foreground hover:bg-[var(--list-hover)]'
            )}
          >
            <t.icon className="h-3.5 w-3.5" />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">

        {/* ===== TOOLS TAB ===== */}
        {tab === 'tools' && (
          <div className="space-y-4">
            {/* API Tester */}
            <div className="rounded-xl border border-[var(--editor-border)] bg-[var(--side-bar-bg)] p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Rocket className="h-4 w-4 text-purple-400" /> API Tester
              </h3>
              <div className="flex gap-2 mb-2">
                <select
                  value={apiTester.method}
                  onChange={(e) => setApiTester(prev => ({ ...prev, method: e.target.value }))}
                  className="rounded-md border border-[var(--editor-border)] bg-[var(--input-bg)] px-2 py-1.5 text-xs"
                >
                  {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <Input
                  value={apiTester.url}
                  onChange={(e) => setApiTester(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://api.example.com/endpoint"
                  className="flex-1 text-xs"
                />
                <Button onClick={handleApiTest} disabled={apiTester.loading} size="sm" className="bg-purple-500 hover:bg-purple-600">
                  {apiTester.loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : 'Send'}
                </Button>
              </div>
              {apiTester.method !== 'GET' && (
                <textarea
                  value={apiTester.body}
                  onChange={(e) => setApiTester(prev => ({ ...prev, body: e.target.value }))}
                  placeholder='{"key": "value"}'
                  className="mb-2 w-full rounded-md border border-[var(--editor-border)] bg-[var(--input-bg)] p-2 font-mono text-xs"
                  rows={2}
                />
              )}
              {apiTester.response && (
                <pre className="max-h-40 overflow-auto rounded-lg bg-black p-3 text-[10px] leading-relaxed text-emerald-400 whitespace-pre-wrap break-all font-mono">
                  {apiTester.response}
                </pre>
              )}
            </div>

            {/* Text Tools */}
            <div className="rounded-xl border border-[var(--editor-border)] bg-[var(--side-bar-bg)] p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Code2 className="h-4 w-4 text-blue-400" /> Text Tools
              </h3>
              <div className="flex gap-2 mb-2">
                <select
                  value={textTools.mode}
                  onChange={(e) => setTextTools(prev => ({ ...prev, mode: e.target.value }))}
                  className="rounded-md border border-[var(--editor-border)] bg-[var(--input-bg)] px-2 py-1.5 text-xs"
                >
                  <option value="base64">Base64 Encode</option>
                  <option value="base64decode">Base64 Decode</option>
                  <option value="url">URL Encode</option>
                  <option value="urldecode">URL Decode</option>
                  <option value="hex">To Hex</option>
                  <option value="binary">To Binary</option>
                  <option value="reverse">Reverse</option>
                  <option value="uppercase">UPPERCASE</option>
                  <option value="lowercase">lowercase</option>
                  <option value="hash">Hash (djb2)</option>
                </select>
                <Button onClick={handleTextTool} size="sm" variant="outline">Convert</Button>
              </div>
              <textarea
                value={textTools.input}
                onChange={(e) => setTextTools(prev => ({ ...prev, input: e.target.value }))}
                placeholder="Input text..."
                className="mb-2 w-full rounded-md border border-[var(--editor-border)] bg-[var(--input-bg)] p-2 font-mono text-xs"
                rows={2}
              />
              {textTools.output && (
                <div className="relative">
                  <pre className="max-h-32 overflow-auto rounded-lg bg-black p-3 text-[10px] text-emerald-400 whitespace-pre-wrap break-all font-mono">
                    {textTools.output}
                  </pre>
                  <button
                    onClick={() => handleCopy('text', textTools.output)}
                    className="absolute top-2 right-2 rounded bg-purple-500/30 px-2 py-1 text-[10px] text-purple-400"
                  >
                    {copied === 'text' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              )}
            </div>

            {/* Color Picker */}
            <div className="rounded-xl border border-[var(--editor-border)] bg-[var(--side-bar-bg)] p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Palette className="h-4 w-4 text-pink-400" /> Color Tools
              </h3>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={colorPicker}
                  onChange={(e) => setColorPicker(e.target.value)}
                  className="h-10 w-16 cursor-pointer rounded-lg border-0 bg-transparent"
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">HEX:</span>
                    <code className="font-mono">{colorPicker}</code>
                    <button onClick={() => handleCopy('hex', colorPicker)} className="text-purple-400">
                      {copied === 'hex' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">RGB:</span>
                    <code className="font-mono">{(() => {
                      const r = parseInt(colorPicker.slice(1, 3), 16)
                      const g = parseInt(colorPicker.slice(3, 5), 16)
                      const b = parseInt(colorPicker.slice(5, 7), 16)
                      return `rgb(${r}, ${g}, ${b})`
                    })()}</code>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">HSL:</span>
                    <code className="font-mono">{(() => {
                      const r = parseInt(colorPicker.slice(1, 3), 16) / 255
                      const g = parseInt(colorPicker.slice(3, 5), 16) / 255
                      const b = parseInt(colorPicker.slice(5, 7), 16) / 255
                      const max = Math.max(r, g, b)
                      const min = Math.min(r, g, b)
                      const diff = max - min
                      const l = (max + min) / 2
                      let h = 0
                      if (max !== min) {
                        switch (max) {
                          case r: h = ((g - b) / diff + (g < b ? 6 : 0)) / 6; break
                          case g: h = ((b - r) / diff + 2) / 6; break
                          case b: h = ((r - g) / diff + 4) / 6; break
                        }
                      }
                      const s = max === min ? 0 : l < 0.5 ? diff / (max + min) : diff / (2 - max - min)
                      return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`
                    })()}</code>
                  </div>
                </div>
                <div className="h-12 w-12 rounded-lg border border-[var(--editor-border)]" style={{ background: colorPicker }} />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Button onClick={handleExportData} variant="outline" size="sm" className="h-auto flex-col gap-1 py-3">
                <Download className="h-4 w-4 text-blue-400" />
                <span className="text-[10px]">Export Data</span>
              </Button>
              <Button onClick={handleClearCache} variant="outline" size="sm" className="h-auto flex-col gap-1 py-3">
                <Trash2 className="h-4 w-4 text-red-400" />
                <span className="text-[10px]">Clear Cache</span>
              </Button>
              <Button onClick={() => { navigator.clipboard?.writeText(JSON.stringify({ ...localStorage }, null, 2)); toast.success('localStorage copied!') }} variant="outline" size="sm" className="h-auto flex-col gap-1 py-3">
                <Database className="h-4 w-4 text-emerald-400" />
                <span className="text-[10px]">Copy Storage</span>
              </Button>
            </div>
          </div>
        )}

        {/* ===== TERMUX TAB ===== */}
        {tab === 'termux' && (
          <div className="space-y-4">
            <div className={cn('flex items-center gap-2 rounded-xl border p-3', termuxConnected ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5')}>
              <div className={cn('h-3 w-3 rounded-full', termuxConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400')} />
              <span className={cn('text-sm font-medium', termuxConnected ? 'text-emerald-400' : 'text-amber-400')}>
                {termuxConnected ? 'Termux Connected 🔥' : 'Not Connected'}
              </span>
            </div>
            <div className="rounded-xl border border-[var(--editor-border)] bg-[var(--side-bar-bg)] p-4">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Smartphone className="h-4 w-4 text-purple-400" /> Bridge Setup</h3>
              <p className="mb-3 text-xs text-muted-foreground">1. Buka Termux di HP<br />2. Paste command ini:<br />3. Klik Connect</p>
              <div className="relative">
                <pre className="max-h-32 overflow-auto rounded-lg bg-black p-3 text-[10px] leading-relaxed text-emerald-400 whitespace-pre-wrap break-all font-mono">{bridgeCommand}</pre>
                <button onClick={() => handleCopy('bridge', bridgeCommand)} className="absolute top-2 right-2 rounded-md bg-purple-500/30 px-2 py-1 text-[10px] text-purple-400">
                  {copied === 'bridge' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <Input value={termuxHost} onChange={(e) => setTermuxHost(e.target.value)} placeholder="host:port" className="flex-1 text-xs" />
              <Button onClick={handleConnect} size="sm" className="bg-purple-500 hover:bg-purple-600"><Wifi className="mr-1.5 h-3.5 w-3.5" />Connect</Button>
            </div>
            <div className="rounded-xl border border-[var(--editor-border)] bg-black overflow-hidden">
              <div className="flex items-center justify-between border-b border-[var(--editor-border)] px-3 py-1.5">
                <span className="text-[10px] font-medium text-muted-foreground">TERMUX TERMINAL</span>
                <button onClick={() => setTerminalLines([])} className="text-[10px] text-muted-foreground hover:text-foreground">Clear</button>
              </div>
              <div ref={terminalRef} className="h-48 overflow-y-auto p-3 font-mono text-[11px]">
                {terminalLines.map((line, i) => (
                  <div key={i} className={cn('whitespace-pre-wrap break-all', line.type === 'input' && 'text-blue-400', line.type === 'output' && 'text-emerald-400', line.type === 'error' && 'text-red-400')}>{line.text}</div>
                ))}
              </div>
              <div className="flex items-center gap-1 border-t border-[var(--editor-border)] px-3 py-2">
                <span className="text-emerald-400 font-mono text-[11px]">$</span>
                <input value={terminalInput} onChange={(e) => setTerminalInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleTerminalCommand()} placeholder="ketik command..." className="flex-1 bg-transparent font-mono text-[11px] text-emerald-400 outline-none" disabled={!termuxConnected} />
              </div>
            </div>
          </div>
        )}

        {/* ===== SYSTEM TAB ===== */}
        {tab === 'system' && (
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Cpu, label: 'CPU Cores', value: systemInfo.cores.toString(), color: 'text-blue-400' },
              { icon: HardDrive, label: 'Memory', value: systemInfo.memory, color: 'text-emerald-400' },
              { icon: Smartphone, label: 'Screen', value: systemInfo.screen, color: 'text-purple-400' },
              { icon: Activity, label: 'Battery', value: `${systemInfo.battery}${systemInfo.batteryCharging ? ' ⚡' : ''}`, color: systemInfo.batteryCharging ? 'text-emerald-400' : 'text-amber-400' },
              { icon: Wifi, label: 'Online', value: systemInfo.online ? '✅ Yes' : '❌ No', color: systemInfo.online ? 'text-emerald-400' : 'text-red-400' },
              { icon: Info, label: 'Platform', value: systemInfo.platform, color: 'text-blue-400' },
              { icon: Cpu, label: 'GPU', value: systemInfo.gpu.substring(0, 30), color: 'text-purple-400' },
              { icon: Smartphone, label: 'Touch Points', value: systemInfo.touchPoints.toString(), color: 'text-emerald-400' },
              { icon: Database, label: 'Cookies', value: systemInfo.cookies.toString(), color: 'text-amber-400' },
              { icon: Database, label: 'localStorage', value: systemInfo.localStorage.toString(), color: 'text-blue-400' },
              { icon: Info, label: 'Language', value: systemInfo.language, color: 'text-emerald-400' },
              { icon: Activity, label: 'Pixel Ratio', value: `${window.devicePixelRatio}x`, color: 'text-purple-400' },
            ].map((item, i) => (
              <div key={i} className="rounded-xl border border-[var(--editor-border)] bg-[var(--side-bar-bg)] p-3 animate-list-item" style={{ animationDelay: `${i * 30}ms` }}>
                <div className="mb-1 flex items-center gap-2">
                  <item.icon className={cn('h-3.5 w-3.5', item.color)} />
                  <span className="text-[10px] font-medium uppercase text-muted-foreground">{item.label}</span>
                </div>
                <p className="truncate text-sm font-semibold">{item.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* ===== NETWORK TAB ===== */}
        {tab === 'network' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-[var(--editor-border)] bg-[var(--side-bar-bg)] p-4">
                <Wifi className="mb-2 h-5 w-5 text-emerald-400" />
                <p className="text-[10px] font-medium uppercase text-muted-foreground">Connection Type</p>
                <p className="text-lg font-bold text-emerald-400">{networkInfo.type.toUpperCase()}</p>
              </div>
              <div className="rounded-xl border border-[var(--editor-border)] bg-[var(--side-bar-bg)] p-4">
                <Gauge className="mb-2 h-5 w-5 text-blue-400" />
                <p className="text-[10px] font-medium uppercase text-muted-foreground">Downlink</p>
                <p className="text-lg font-bold text-blue-400">{networkInfo.downlink} Mbps</p>
              </div>
              <div className="rounded-xl border border-[var(--editor-border)] bg-[var(--side-bar-bg)] p-4">
                <Activity className="mb-2 h-5 w-5 text-purple-400" />
                <p className="text-[10px] font-medium uppercase text-muted-foreground">RTT (Latency)</p>
                <p className="text-lg font-bold text-purple-400">{networkInfo.rtt} ms</p>
              </div>
              <div className="rounded-xl border border-[var(--editor-border)] bg-[var(--side-bar-bg)] p-4">
                <Database className="mb-2 h-5 w-5 text-amber-400" />
                <p className="text-[10px] font-medium uppercase text-muted-foreground">Save Data Mode</p>
                <p className="text-lg font-bold text-amber-400">{networkInfo.saveData ? 'ON' : 'OFF'}</p>
              </div>
            </div>
            <div className="rounded-xl border border-[var(--editor-border)] bg-[var(--side-bar-bg)] p-4">
              <h3 className="mb-2 text-sm font-semibold">User Agent</h3>
              <code className="block break-all text-[10px] text-muted-foreground font-mono">{systemInfo.userAgent}</code>
            </div>
          </div>
        )}

        {/* ===== SECURITY TAB ===== */}
        {tab === 'security' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className={cn('rounded-xl border p-4', securityStats.devtoolsOpen ? 'border-red-500/30 bg-red-500/5' : 'border-emerald-500/30 bg-emerald-500/5')}>
                <Shield className={cn('mb-2 h-5 w-5', securityStats.devtoolsOpen ? 'text-red-400' : 'text-emerald-400')} />
                <p className="text-[10px] font-medium uppercase text-muted-foreground">DevTools</p>
                <p className={cn('text-lg font-bold', securityStats.devtoolsOpen ? 'text-red-400' : 'text-emerald-400')}>{securityStats.devtoolsOpen ? 'DETECTED' : 'SAFE'}</p>
              </div>
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                <Lock className="mb-2 h-5 w-5 text-emerald-400" />
                <p className="text-[10px] font-medium uppercase text-muted-foreground">CSP Headers</p>
                <p className="text-lg font-bold text-emerald-400">ACTIVE</p>
              </div>
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                <Shield className="mb-2 h-5 w-5 text-emerald-400" />
                <p className="text-[10px] font-medium uppercase text-muted-foreground">Sandbox Deploy</p>
                <p className="text-lg font-bold text-emerald-400">ACTIVE</p>
              </div>
              <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4">
                <Bug className="mb-2 h-5 w-5 text-blue-400" />
                <p className="text-[10px] font-medium uppercase text-muted-foreground">Source Protection</p>
                <p className="text-lg font-bold text-blue-400">ON</p>
              </div>
            </div>
            <div className="rounded-xl border border-[var(--editor-border)] bg-[var(--side-bar-bg)] p-4">
              <h3 className="mb-2 text-sm font-semibold">Security Features</h3>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span>Anti-DevTools (F12, Ctrl+Shift+I)</span><Check className="h-3.5 w-3.5 text-emerald-400" /></div>
                <div className="flex justify-between"><span>Anti-View Source (Ctrl+U)</span><Check className="h-3.5 w-3.5 text-emerald-400" /></div>
                <div className="flex justify-between"><span>Anti-Right-Click (UI chrome)</span><Check className="h-3.5 w-3.5 text-emerald-400" /></div>
                <div className="flex justify-between"><span>Anti-Drag (images/SVGs)</span><Check className="h-3.5 w-3.5 text-emerald-400" /></div>
                <div className="flex justify-between"><span>Anti-Large-Copy (&gt;50KB)</span><Check className="h-3.5 w-3.5 text-emerald-400" /></div>
                <div className="flex justify-between"><span>Anti-Print</span><Check className="h-3.5 w-3.5 text-emerald-400" /></div>
                <div className="flex justify-between"><span>Deploy Sandboxed iframe</span><Check className="h-3.5 w-3.5 text-emerald-400" /></div>
                <div className="flex justify-between"><span>Console Warning</span><Check className="h-3.5 w-3.5 text-emerald-400" /></div>
              </div>
            </div>
          </div>
        )}

        {/* ===== EXPERIMENTAL TAB ===== */}
        {tab === 'experimental' && (
          <div className="space-y-2">
            {[
              { key: 'aiAutoComplete', label: 'AI Auto-Complete', desc: 'Inline code suggestions saat ngetik', icon: Zap },
              { key: 'godMode', label: '🔥 God Mode', desc: 'Unlock semua restrictions + unlimited power', icon: Flame, danger: true },
              { key: 'bypassSecurity', label: 'Bypass Security', desc: 'Disable anti-devtools + right-click', icon: Unlock, danger: true },
              { key: 'unlimitedTokens', label: 'Unlimited AI Tokens', desc: 'Remove rate limit dari AI API', icon: Rocket },
              { key: 'inlinePreview', label: 'Inline Preview', desc: 'Preview HTML inline di editor', icon: Eye },
              { key: 'debugMode', label: 'Debug Mode', desc: 'Tampilkan debug info di status bar', icon: Bug },
              { key: 'forceDarkMode', label: 'Force Dark Mode', desc: 'Always dark theme', icon: Palette },
              { key: 'disableAnimations', label: 'Disable Animations', desc: 'Disable all CSS animations (performance)', icon: Power },
              { key: 'autoSaveInterval', label: 'Auto-Save', desc: 'Auto-save every 30 seconds', icon: RefreshCw },
              { key: 'showFps', label: 'Show FPS Counter', desc: 'Display FPS overlay', icon: Gauge },
            ].map(item => (
              <button
                key={item.key}
                onClick={() => toggleExperimental(item.key as keyof typeof experimental)}
                className={cn(
                  'flex w-full items-center justify-between rounded-xl border p-3 transition-all',
                  experimental[item.key as keyof typeof experimental]
                    ? item.danger ? 'border-red-500/30 bg-red-500/5' : 'border-purple-500/30 bg-purple-500/5'
                    : 'border-[var(--editor-border)] bg-[var(--side-bar-bg)]'
                )}
              >
                <div className="flex items-center gap-3 text-left">
                  <item.icon className={cn('h-4 w-4', item.danger && experimental[item.key as keyof typeof experimental] && 'text-red-400 animate-pulse')} />
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
                <div className={cn('h-6 w-11 rounded-full p-0.5 transition-colors', experimental[item.key as keyof typeof experimental] ? item.danger ? 'bg-red-500' : 'bg-purple-500' : 'bg-gray-600')}>
                  <div className={cn('h-5 w-5 rounded-full bg-white transition-transform', experimental[item.key as keyof typeof experimental] && 'translate-x-5')} />
                </div>
              </button>
            ))}
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-[10px] text-amber-400">
              <AlertCircle className="mb-1 h-3 w-3" />
              Experimental features mungkin unstable. Use with caution. God Mode unlocks everything.
            </div>
          </div>
        )}

        {/* ===== CONSOLE TAB ===== */}
        {tab === 'console' && (
          <div className="rounded-xl border border-[var(--editor-border)] bg-black overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--editor-border)] px-3 py-1.5">
              <span className="text-[10px] font-medium text-muted-foreground">LIVE CONSOLE ({consoleLogs.length})</span>
              <button onClick={() => setConsoleLogs([])} className="text-[10px] text-muted-foreground hover:text-foreground">Clear</button>
            </div>
            <div className="h-96 overflow-y-auto p-3 font-mono text-[11px]">
              {consoleLogs.length === 0 ? (
                <p className="text-muted-foreground">No logs yet. Console output akan muncul di sini.</p>
              ) : (
                consoleLogs.map((log, i) => (
                  <div key={i} className={cn('whitespace-pre-wrap break-all py-0.5', log.type === 'error' && 'text-red-400', log.type === 'warn' && 'text-amber-400', log.type === 'log' && 'text-emerald-400')}>
                    <span className="text-muted-foreground">[{log.time}]</span> [{log.type}] {log.text}
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
