import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * LEGACY endpoint: GET /api/deploy/:id
 *
 * NOTE: This is the API-style deployment fetch. The user-facing deployment
 * page is served at `/d/:id` (see src/app/d/[id]/route.ts) which has the
 * proper CSP and security headers. This endpoint here is kept for
 * programmatic access (e.g. if you want to fetch the raw HTML via API),
 * but the recommended way to share deployments is via the `/d/:id` URL.
 *
 * SECURITY: Same caveats apply — see src/app/api/deploy/route.ts file-level
 * comment for the full security model.
 */

function isValidId(id: string): boolean {
  return /^[a-f0-9]{8}$/.test(id)
}

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

  // Best-effort view count increment
  try {
    await db.deployedProject.update({
      where: { id },
      data: { views: { increment: 1 } },
    })
  } catch (err) {
    console.error('View count increment failed:', err)
  }

  return new NextResponse(data.html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

export async function DELETE(
  _req: NextRequest,
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
