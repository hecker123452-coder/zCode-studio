'use client'

import { useEffect } from 'react'

/**
 * SecurityGuard — anti-source-code-theft deterrents
 *
 * IMPORTANT: Client-side protection is NOT foolproof. A determined attacker
 * can always bypass these. The goal here is to RAISE THE BAR — deter casual
 * copying, not stop a dedicated reverse-engineer.
 *
 * Protections:
 * 1. Disable right-click context menu on UI chrome (NOT in editor — Monaco needs it)
 * 2. Block Ctrl+U (view source), Ctrl+Shift+I/J/C, F12 (devtools shortcuts)
 * 3. Console warning message to deter inspection
 * 4. Disable drag-and-drop on images/SVGs (CSS handles this too)
 * 5. Detect devtools open (basic heuristic) — warn user
 * 6. Block large clipboard copy (anti-scraping, allows normal copy)
 * 7. Block Ctrl+S (save page) outside editor
 */

export function SecurityGuard() {
  useEffect(() => {
    // === 1. Console warning ===
    const consoleStyle = `
      color: #ef4444;
      font-size: 16px;
      font-weight: bold;
      background: #1a1a2e;
      padding: 8px 12px;
      border-radius: 4px;
    `
    console.log('%c⚠️ ZCode Studio — Source Code Protected', consoleStyle)
    console.log('%cThis code is proprietary. Unauthorized copying, modification, or redistribution is prohibited.\n\nIf you\'re a developer exploring, that\'s cool — but please respect the work.', 'color: #6b7280; font-size: 12px;')

    // === Toast helper (inline to avoid import cycles) ===
    function showWarningToast(message: string, duration = 2500) {
      const toast = document.createElement('div')
      toast.style.cssText = `
        position: fixed;
        bottom: 60px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(239, 68, 68, 0.95);
        color: white;
        padding: 10px 20px;
        border-radius: 8px;
        font-size: 13px;
        font-family: system-ui, sans-serif;
        z-index: 99999;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        backdrop-filter: blur(8px);
        animation: slide-in-bottom 0.2s ease-out;
        pointer-events: none;
        max-width: 90vw;
        text-align: center;
      `
      toast.textContent = message
      document.body.appendChild(toast)

      setTimeout(() => {
        toast.style.opacity = '0'
        toast.style.transition = 'opacity 0.3s'
        setTimeout(() => toast.remove(), 300)
      }, duration)
    }

    // === 2. Block devtools shortcuts & view-source ===
    const blockDevtoolsShortcuts = (e: KeyboardEvent) => {
      // F12 — devtools
      if (e.key === 'F12') {
        e.preventDefault()
        showWarningToast('DevTools dinonaktifkan untuk protect source code')
        return false
      }

      // Ctrl+Shift+I/J/C — devtools (case-insensitive)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && ['KeyI', 'KeyJ', 'KeyC'].includes(e.code)) {
        e.preventDefault()
        showWarningToast('DevTools dinonaktifkan untuk protect source code')
        return false
      }

      // Ctrl+U — view source
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyU') {
        e.preventDefault()
        showWarningToast('View Source dinonaktifkan')
        return false
      }

      // Ctrl+S — save page (allow in editor for file save)
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS' && !e.shiftKey) {
        const target = e.target as HTMLElement
        if (target?.closest('.monaco-editor')) {
          return // let editor handle it (Ctrl+S saves file to device)
        }
        e.preventDefault()
        showWarningToast('Save Page dinonaktifkan. Pakai File → Simpan ke Perangkat untuk save file.')
        return false
      }
    }

    // === 3. Disable right-click on UI chrome (NOT in editor/inputs) ===
    const blockContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // Allow right-click in Monaco editor (it has its own context menu)
      if (target?.closest('.monaco-editor')) return
      // Allow right-click in textareas/inputs (for copy/paste)
      if (target?.tagName === 'TEXTAREA' || target?.tagName === 'INPUT') return
      // Allow right-click in explicitly marked areas (AI chat code blocks)
      if (target?.closest('[data-allow-context-menu]')) return
      // Block everywhere else
      e.preventDefault()
      showWarningToast('Right-click dinonaktifkan untuk protect konten')
      return false
    }

    // === 4. Disable drag-start on images ===
    const blockDrag = (e: DragEvent) => {
      const target = e.target as HTMLElement
      // Allow drag in file explorer (for file drag-drop)
      if (target?.closest('[data-allow-drag]')) return
      // Block image/SVG drag
      if (target?.tagName === 'IMG' || target?.tagName === 'SVG') {
        e.preventDefault()
        return false
      }
    }

    // === 5. Detect devtools open (basic heuristic) ===
    let devtoolsOpen = false
    const threshold = 160
    const checkDevtools = () => {
      const widthDiff = window.outerWidth - window.innerWidth
      const heightDiff = window.outerHeight - window.innerHeight
      const isOpen = widthDiff > threshold || heightDiff > threshold

      if (isOpen && !devtoolsOpen) {
        devtoolsOpen = true
        showWarningToast('DevTools terdeteksi. Source code diprotect.', 4000)
      } else if (!isOpen && devtoolsOpen) {
        devtoolsOpen = false
      }
    }
    const devtoolsInterval = setInterval(checkDevtools, 2000)

    // === 6. Block large clipboard copy (anti-scraping, allows normal code copy) ===
    const blockLargeCopy = (e: ClipboardEvent) => {
      const selection = window.getSelection()?.toString() || ''
      // Block only very large copies (>50KB) — allows copying full code files
      if (selection.length > 50000) {
        e.preventDefault()
        showWarningToast('Copy text terlalu besar diblokir untuk protect konten')
        return false
      }
    }

    // === Register all listeners ===
    document.addEventListener('keydown', blockDevtoolsShortcuts, true) // capture phase
    document.addEventListener('contextmenu', blockContextMenu)
    document.addEventListener('dragstart', blockDrag)
    document.addEventListener('copy', blockLargeCopy)

    // === Cleanup ===
    return () => {
      document.removeEventListener('keydown', blockDevtoolsShortcuts, true)
      document.removeEventListener('contextmenu', blockContextMenu)
      document.removeEventListener('dragstart', blockDrag)
      document.removeEventListener('copy', blockLargeCopy)
      clearInterval(devtoolsInterval)
    }
  }, [])

  // This component renders nothing — it's purely a side-effect guard
  return null
}
