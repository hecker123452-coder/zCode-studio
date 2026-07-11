import { NextRequest, NextResponse } from 'next/server'
import { db, isPrismaAvailable } from '@/lib/db'
import { memoryDB } from '@/lib/memory-db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isValidId(id: string): boolean {
  return /^[a-f0-9]{8}$/.test(id)
}

/**
 * Serve a deployed project page — ISOLATED via iframe sandbox wrapper.
 *
 * SECURITY ARCHITECTURE (upgraded):
 *   Previously: served raw HTML at /d/:id on same origin as editor.
 *   Problem: deployed scripts could access editor's localStorage (file storage).
 *
 *   Now: serves a WRAPPER page that embeds user HTML in a sandboxed iframe.
 *   - iframe has `sandbox="allow-scripts allow-modals allow-popups allow-forms"`
 *     but NOT `allow-same-origin` — so the iframe CANNOT access parent's
 *     localStorage, cookies, or DOM.
 *   - User HTML is passed as `srcdoc` (HTML attribute), so it's treated as
 *     a unique opaque origin by the browser.
 *   - CSP on the wrapper page blocks remote scripts/styles.
 *
 *   This is the same approach JSFiddle/CodePen use for their "full page view".
 *
 *   Trade-off: User code that needs `localStorage` (e.g., todo apps saving
 *   state) will now have its OWN isolated localStorage, separate from the
 *   editor. This is the correct behavior for deployed content.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!id || !isValidId(id)) {
    return new NextResponse('Invalid ID', { status: 400 })
  }

  let data
  try {
    if (isPrismaAvailable && db) {
      data = await db.deployedProject.findUnique({ where: { id } })
    } else {
      data = await memoryDB.findById(id)
    }
  } catch (err) {
    console.error('Deploy fetch error:', err)
    return new NextResponse('Internal Server Error', { status: 500 })
  }

  if (!data) {
    return new NextResponse(
      `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;padding:40px;text-align:center;color:#666;">
<h1>404 - Project Not Found</h1>
<p>The deployed project may have been deleted or the link is invalid.</p>
</body></html>`,
      { status: 404, headers: { 'Content-Type': 'text/html' } }
    )
  }

  // Increment view count (best-effort, non-blocking)
  try {
    if (isPrismaAvailable && db) {
      await db.deployedProject.update({
        where: { id },
        data: { views: { increment: 1 } },
      })
    } else {
      await memoryDB.incrementViews(id)
    }
  } catch (err) {
    console.error('View count increment failed:', err)
  }

  // === Build wrapper page with sandboxed iframe ===
  // The user's HTML is base64-encoded to safely embed in srcdoc attribute.
  // The iframe sandbox restricts what the deployed code can do:
  //   - allow-scripts: user code can run JS
  //   - allow-modals: alert/confirm/prompt work
  //   - allow-popups: window.open works
  //   - allow-forms: form submissions work
  //   - allow-pointer-lock: for games
  //   - NOT allow-same-origin: CRITICAL — this prevents the iframe from
  //     accessing the parent editor's localStorage/cookies/DOM.
  const userHtmlBase64 = Buffer.from(data.html, 'utf-8').toString('base64')

  const wrapperHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(data.title)} — ZCode Deploy</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { height: 100%; overflow: hidden; }
    body { font-family: system-ui, -apple-system, sans-serif; }
    .deploy-banner {
      background: #1a1a2e;
      color: #4ade80;
      padding: 6px 12px;
      font-size: 11px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #2a2a4e;
    }
    .deploy-banner a {
      color: #6366f1;
      text-decoration: none;
    }
    .deploy-banner a:hover { text-decoration: underline; }
    .sandbox-badge {
      background: #4ade80;
      color: #1a1a2e;
      padding: 1px 6px;
      border-radius: 3px;
      font-weight: bold;
      font-size: 9px;
    }
    iframe#content {
      width: 100%;
      height: calc(100vh - 28px);
      border: none;
      background: white;
    }
  </style>
</head>
<body>
  <div class="deploy-banner">
    <span>
      <span class="sandbox-badge">SANDBOXED</span>
      Deployed via ZCode Studio · ${escapeHtml(data.fileName)} · ${data.views} views
    </span>
    <a href="/">← Back to Editor</a>
  </div>
  <iframe
    id="content"
    sandbox="allow-scripts allow-modals allow-popups allow-forms allow-pointer-lock"
    style="width:100%; height:calc(100vh - 28px); border:none;"
  ></iframe>
  <script>
    // Decode base64 HTML and inject as srcdoc
    (function() {
      var html = atob("${userHtmlBase64}");
      var iframe = document.getElementById('content');
      iframe.srcdoc = html;
    })();
  </script>
</body>
</html>`

  // Strict CSP for the WRAPPER page (not the iframe content, which has its own
  // origin due to sandbox). Block remote scripts entirely.
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-src 'self' data: blob:",
  ].join('; ')

  return new NextResponse(wrapperHtml, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': csp,
      'Referrer-Policy': 'no-referrer',
      'X-Frame-Options': 'SAMEORIGIN', // prevent this wrapper from being embedded elsewhere
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    },
  })
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!isValidId(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  try {
    if (isPrismaAvailable && db) {
      const existing = await db.deployedProject.findUnique({ where: { id } })
      if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      await db.deployedProject.delete({ where: { id } })
    } else {
      const existing = await memoryDB.findById(id)
      if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      await memoryDB.delete(id)
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Deploy delete error:', err)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
