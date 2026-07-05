import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isValidId(id: string): boolean {
  return /^[a-f0-9]{8}$/.test(id)
}

/**
 * Serve a deployed project page.
 *
 * SECURITY:
 *   - Sets a strict `Content-Security-Policy` header to limit what the served
 *     HTML/JS can do. Inline scripts are allowed (`'unsafe-inline'`) because
 *     IndoCode transpiled output uses inline `<script>` — without it user
 *     code can't run. But remote scripts are NOT allowed by default.
 *   - Sets `X-Content-Type-Options: nosniff` to prevent MIME sniffing.
 *   - NOTE: This is defense-in-depth, NOT a complete sandbox. The served
 *     content is still on the SAME ORIGIN as the editor, so it CAN access
 *     localStorage. For real isolation, deployments should be moved to a
 *     separate subdomain. See `src/app/api/deploy/route.ts` file-level
 *     comment for the full security trade-off discussion.
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
    data = await db.deployedProject.findUnique({ where: { id } })
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

  // Increment view count (best-effort, non-blocking — don't fail the request
  // if the DB write fails)
  try {
    await db.deployedProject.update({
      where: { id },
      data: { views: { increment: 1 } },
    })
  } catch (err) {
    console.error('View count increment failed:', err)
  }

  // Defense-in-depth CSP: allow inline scripts (required for IndoCode transpiled
  // output), inline styles, and same-origin resources. Block remote scripts
  // by default. Note: this doesn't isolate origin — see file-level comment.
  const csp = [
    "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:",
    "img-src 'self' data: blob: https: http:",
    "font-src 'self' data: https:",
    "connect-src 'self' https: http:",
  ].join('; ')

  return new NextResponse(data.html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': csp,
      // Referrer-Policy: don't leak the deployment URL to remote hosts the
      // deployed page might link to
      'Referrer-Policy': 'no-referrer',
    },
  })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!isValidId(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  try {
    const existing = await db.deployedProject.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await db.deployedProject.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Deploy delete error:', err)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
