'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('ZCode Studio global error:', error)
  }, [error])

  // Detect error type for friendlier message
  const isChunkLoadError = error?.message?.includes('ChunkLoadError') || error?.message?.includes('Failed to fetch dynamically imported module')
  const isStorageError = error?.name === 'QuotaExceededError'

  const friendlyTitle = isChunkLoadError
    ? 'Gagal Memuat Kode Aplikasi'
    : isStorageError
    ? 'Penyimpanan Penuh'
    : 'Terjadi Kesalahan Kritis'

  const friendlyDesc = isChunkLoadError
    ? 'Sebagian kode aplikasi gagal dimuat (kemungkinan koneksi internet tidak stabil). Coba muat ulang halaman.'
    : isStorageError
    ? 'Penyimpanan browser penuh. Hapus beberapa file tidak terpakai lalu coba lagi, atau reset data project.'
    : 'Aplikasi mengalami error fatal. Silakan refresh halaman atau reset data. File di perangkat tidak akan terhapus.'

  return (
    <html lang="id">
      <body style={{ margin: 0, padding: 0, fontFamily: 'system-ui, sans-serif', background: '#1e1e1e', color: '#fff' }}>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
          <div style={{ width: '100%', maxWidth: '420px' }}>
            <div style={{ width: '64px', height: '64px', margin: '0 auto 24px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>
              ⚠️
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 8px' }}>{friendlyTitle}</h1>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', margin: '0 0 24px' }}>
              {friendlyDesc}
            </p>
            {error?.message && (
              <details style={{ marginTop: '16px', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px', textAlign: 'left', fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                <summary style={{ cursor: 'pointer', color: 'rgba(255,255,255,0.8)' }}>Detail Error</summary>
                <pre style={{ marginTop: '8px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {error.message}
                  {error.digest && '\n\nID: ' + error.digest}
                </pre>
              </details>
            )}
            <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={() => reset()}
                style={{ padding: '10px 20px', fontSize: '14px', fontWeight: 600, color: '#fff', background: '#2563eb', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
              >
                Coba Lagi
              </button>
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.location.reload()
                  }
                }}
                style={{ padding: '10px 20px', fontSize: '14px', fontWeight: 600, color: '#fff', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
              >
                Muat Ulang
              </button>
              <button
                onClick={() => {
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
                style={{ padding: '10px 20px', fontSize: '14px', fontWeight: 600, color: '#fff', background: 'rgba(239,68,68,0.8)', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
              >
                Reset & Muat Ulang
              </button>
            </div>
            <p style={{ marginTop: '24px', fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>
              ZCode Studio · Error ID: {error?.digest || 'N/A'}
            </p>
          </div>
        </div>
      </body>
    </html>
  )
}
