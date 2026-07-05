'use client'

import { useEditorStore } from '@/store/editor-store'
import { toast } from 'sonner'

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico']
const BINARY_EXTENSIONS = [...IMAGE_EXTENSIONS, 'pdf', 'zip', 'rar', '7z', 'exe', 'dll', 'so', 'dylib', 'mp3', 'mp4', 'wav', 'avi', 'mov', 'ttf', 'otf', 'woff', 'woff2', 'eot']

export function isImageFile(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  return IMAGE_EXTENSIONS.includes(ext)
}

export function isBinaryFile(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  return BINARY_EXTENSIONS.includes(ext)
}

export function isMarkdownFile(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  return ['md', 'markdown'].includes(ext)
}

/**
 * Hook providing file system operations:
 * - openFromDevice: pick files from device storage via <input type="file">
 * - openFromDeviceFSAccess: use File System Access API (Chrome/Edge desktop)
 * - saveToDevice: save file via download (universal) or File System Access API
 * - saveAsToDevice: save with new filename
 */
export function useFileOperations() {
  const importFile = useEditorStore(s => s.importFile)
  const openTab = useEditorStore(s => s.openTab)
  const files = useEditorStore(s => s.files)
  const updateFileContent = useEditorStore(s => s.updateFileContent)
  const updateFileHandle = useEditorStore(s => s.updateFileHandle)
  const getFile = useEditorStore(s => s.getFile)

  /**
   * Open files from device storage using hidden <input type="file">
   * Works on ALL browsers (mobile + desktop).
   */
  const openFromDevice = (options?: { multiple?: boolean; accept?: string }) => {
    return new Promise<void>((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.multiple = options?.multiple ?? true
      if (options?.accept) input.accept = options.accept

      input.onchange = async (e) => {
        const fileList = (e.target as HTMLInputElement).files
        if (!fileList || fileList.length === 0) {
          resolve()
          return
        }

        let imported = 0
        for (let i = 0; i < fileList.length; i++) {
          const f = fileList[i]
          try {
            const isBinary = isBinaryFile(f.name)
            let content = ''
            if (isBinary) {
              // Read as base64 data URL for binary files (images, etc.)
              content = await readFileAsDataURL(f)
            } else {
              content = await readFileAsText(f)
            }
            const id = importFile(f.name, content, null, { isBinary })
            openTab(id, false)
            imported++
          } catch (err) {
            console.error('Failed to import', f.name, err)
            toast.error(`Gagal mengimpor ${f.name}`)
          }
        }

        if (imported > 0) {
          toast.success(`Diimpor ${imported} file${imported > 1 ? 's' : ''} `)
          haptic([10, 30, 10])
        }
        resolve()
      }

      // Trigger click
      input.click()
    })
  }

  /**
   * Open file using File System Access API (Chrome/Edge desktop only)
   * Returns file handle so we can save back later.
   */
  const openFromDeviceFSAccess = async () => {
    // Check if File System Access API is supported
    if (typeof (window as any).showOpenFilePicker !== 'function') {
      // Fallback to <input type="file">
      return openFromDevice()
    }

    try {
      const handles: any[] = await (window as any).showOpenFilePicker({
        multiple: true,
        types: [
          {
            description: 'All files',
            accept: { '*/*': [] },
          },
        ],
        excludeAcceptAllOption: false,
      })

      let imported = 0
      for (const handle of handles) {
        const file = await handle.getFile()
        const isBinary = isBinaryFile(file.name)
        let content = ''
        if (isBinary) {
          content = await readFileAsDataURL(file)
        } else {
          content = await readFileAsText(file)
        }
        const id = importFile(file.name, content, null, { isBinary, fileHandle: handle })
        openTab(id, false)
        imported++
      }

      if (imported > 0) {
        toast.success(`Diimpor ${imported} file${imported > 1 ? 's' : ''} from device `)
        haptic([10, 30, 10])
      }
    } catch (err: any) {
      // User cancelled — silently ignore
      if (err?.name !== 'AbortError') {
        console.error(err)
        toast.error('Gagal buka file')
      }
    }
  }

  /**
   * Save file to device. Uses File System Access API if available
   * (so user can pick the same file and overwrite), otherwise downloads.
   */
  const saveToDevice = async (fileId: string) => {
    const file = getFile(fileId)
    if (!file) {
      toast.error('File tidak ketemu')
      return
    }

    // If we have a file handle (File System Access API), try to save back to it
    if (file.fileHandle && typeof file.fileHandle.createWritable === 'function') {
      try {
        const writable = await file.fileHandle.createWritable()
        if (file.isBinary && file.content?.startsWith('data:')) {
          // Convert data URL back to blob
          const res = await fetch(file.content)
          const blob = await res.blob()
          await writable.write(blob)
        } else {
          await writable.write(file.content || '')
        }
        await writable.close()
        // Clear the dirty indicator now that the file has been saved to device
        useEditorStore.getState().markTabDirty(fileId, false)
        toast.success(`Tersimpan ke perangkat: ${file.name}`)
        haptic([10, 30, 10])
        return
      } catch (err: any) {
        if (err?.name === 'AbortError') return
        console.error('FS Access save failed, falling back to download', err)
        // Fall through to download
      }
    }

    // Fallback: trigger download
    downloadFile(file.name, file.content || '', file.isBinary)
    // Clear dirty indicator (file has been "saved" — downloaded)
    useEditorStore.getState().markTabDirty(fileId, false)
    toast.success(`Diunduh: ${file.name}`)
    haptic([10, 30, 10])
  }

  /**
   * Save As — always show save picker (if FS Access available) or download with new name.
   */
  const saveAsToDevice = async (fileId: string) => {
    const file = getFile(fileId)
    if (!file) {
      toast.error('File tidak ketemu')
      return
    }

    // Try File System Access API save picker
    if (typeof (window as any).showSaveFilePicker === 'function') {
      try {
        const ext = file.name.split('.').pop() || 'txt'
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: file.name,
          types: [
            {
              description: file.name,
              accept: { '*/*': ['.' + ext] },
            },
          ],
        })
        const writable = await handle.createWritable()
        if (file.isBinary && file.content?.startsWith('data:')) {
          const res = await fetch(file.content)
          const blob = await res.blob()
          await writable.write(blob)
        } else {
          await writable.write(file.content || '')
        }
        await writable.close()
        // Update file handle so future "Save" goes to this location
        updateFileHandle(fileId, handle)
        useEditorStore.getState().markTabDirty(fileId, false)
        toast.success(`Tersimpan ke perangkat: ${file.name}`)
        haptic([10, 30, 10])
        return
      } catch (err: any) {
        if (err?.name === 'AbortError') return
        console.error(err)
      }
    }

    // Fallback: download
    downloadFile(file.name, file.content || '', file.isBinary)
    useEditorStore.getState().markTabDirty(fileId, false)
    toast.success(`Diunduh: ${file.name}`)
    haptic([10, 30, 10])
  }

  /**
   * Save all open files to device (bulk download).
   */
  const saveAllToDevice = async () => {
    const openTabs = useEditorStore.getState().openTabs
    if (openTabs.length === 0) {
      toast.info('Belum ada file kebuka')
      return
    }
    let saved = 0
    for (const tab of openTabs) {
      const file = files[tab.fileId]
      if (!file) continue
      downloadFile(file.name, file.content || '', file.isBinary)
      saved++
    }
    toast.success(`${saved} file diunduh`)
    haptic([10, 30, 10])
  }

  return {
    openFromDevice,
    openFromDeviceFSAccess,
    saveToDevice,
    saveAsToDevice,
    saveAllToDevice,
  }
}

// Helpers (exported so other components can reuse)

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function downloadFile(filename: string, content: string, isBinary?: boolean) {
  let blob: Blob
  if (isBinary && content.startsWith('data:')) {
    // Decode data URL to blob
    const [meta, base64] = content.split(',')
    const mimeMatch = meta.match(/data:([^;]+)/)
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream'
    const bytes = atob(base64)
    const arr = new Uint8Array(bytes.length)
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
    blob = new Blob([arr], { type: mime })
  } else {
    blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function haptic(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(pattern) } catch { /* Vibration API not supported — ignore */ }
  }
}
