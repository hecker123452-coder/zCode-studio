'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw, RefreshCw, Bug } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error so we can debug WebView issues
    console.error('ZCode Studio client-side error:', error)
  }, [error])

  // Detect common error types for friendlier messages
  const isChunkLoadError = error?.message?.includes('ChunkLoadError') || error?.message?.includes('Failed to fetch dynamically imported module')
  const isHydrationError = error?.message?.includes('Hydration') || error?.message?.includes('Text content does not match')
  const isStorageError = error?.name === 'QuotaExceededError'

  const friendlyTitle = isChunkLoadError
    ? 'Gagal Memuat Kode Aplikasi'
    : isHydrationError
    ? 'Konflik Tampilan (Hydration)'
    : isStorageError
    ? 'Penyimpanan Penuh'
    : 'Terjadi Kesalahan'

  const friendlyDesc = isChunkLoadError
    ? 'Sebagian kode aplikasi gagal dimuat (kemungkinan koneksi internet tidak stabil atau versi baru tersedia). Coba muat ulang halaman.'
    : isHydrationError
    ? 'Tampilan aplikasi tidak sinkron dengan data tersimpan. Biasanya karena file project berubah saat halaman dibuka. Coba refresh.'
    : isStorageError
    ? 'Penyimpanan browser penuh. Hapus beberapa file tidak terpakai lalu coba lagi, atau reset data project.'
    : 'Aplikasi mengalami error tak terduga. Coba muat ulang halaman. Jika masalah berlanjut, reset data project (tidak akan menghapus file di perangkat).'

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#1e1e1e] p-6 text-white">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
          <AlertTriangle className="h-8 w-8 text-red-400" />
        </div>
        <h1 className="mb-2 text-2xl font-bold">{friendlyTitle}</h1>
        <p className="mb-1 text-sm text-white/70">
          {friendlyDesc}
        </p>
        {error?.message && (
          <details className="mt-4 rounded-lg bg-white/5 p-3 text-left text-xs text-white/60">
            <summary className="cursor-pointer text-white/80">Detail Error</summary>
            <pre className="mt-2 whitespace-pre-wrap break-all">
              {error.message}
              {error.digest && '\n\nID: ' + error.digest}
              {error.stack && '\n\n' + error.stack.slice(0, 500)}
            </pre>
          </details>
        )}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            onClick={() => reset()}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 active:scale-95"
          >
            <RotateCcw className="h-4 w-4" />
            Coba Lagi
          </button>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.reload()
              }
            }}
            className="flex items-center justify-center gap-2 rounded-lg bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/20 active:scale-95"
          >
            <RefreshCw className="h-4 w-4" />
            Muat Ulang
          </button>
          <button
            onClick={() => {
              // Clear all local storage and reload
              try {
                localStorage.clear()
                sessionStorage.clear()
              } catch (e) {
                // localStorage may be disabled (private browsing, quota) — ignore
                console.warn('Failed to clear storage:', e)
              }
              if (typeof window !== 'undefined') {
                window.location.href = '/'
              }
            }}
            className="flex items-center justify-center gap-2 rounded-lg bg-red-600/80 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 active:scale-95"
          >
            <Bug className="h-4 w-4" />
            Reset & Muat Ulang
          </button>
        </div>
        <p className="mt-6 text-[10px] text-white/40">
          ZCode Studio · Error ID: {error?.digest || 'N/A'}
        </p>
      </div>
    </div>
  )
}
