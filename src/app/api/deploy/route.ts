import { NextRequest, NextResponse } from 'next/server'
import { db, isPrismaAvailable } from '@/lib/db'
import { memoryDB } from '@/lib/memory-db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * === DEPLOY API — persistence & security notes ===
 *
 * PERSISTENCE:
 *   Previously deployments were stored in an in-memory Map
 *   (`globalThis.__deployStore`) which meant:
 *     - All deployments LOST on every server restart
 *     - Inconsistent state across instances in multi-instance setups (Vercel,
 *       load-balanced VPS, etc.)
 *   Now persisted to SQLite via Prisma (`DeployedProject` model in
 *   prisma/schema.prisma). Deployments survive restarts and are shared across
 *   instances pointing at the same DB file.
 *
 * SECURITY BOUNDARY — what `sanitizeHtml` does and does NOT do:
 *   `sanitizeHtml` is NOT a real XSS filter. It only strips the two most
 *   blatant attack patterns (`onload="javascript:..."` and
 *   `onerror="javascript:..."`). Tag `<script>` is INTENTIONALLY allowed
 *   because IndoCode transpiled HTML relies on inline `<script>` to run —
 *   the user's code can't work without it.
 *
 *   The REAL security boundary for deployed content is ORIGIN ISOLATION + CSP:
 *     - Deployed HTML is served at `/d/:id` on the SAME origin as the editor.
 *     - That means scripts in deployed HTML CAN access `localStorage` of the
 *       editor origin, including the `'zcode-studio-storage'` key where all
 *       project files are stored.
 *     - For a production deployment, you should EITHER:
 *         (a) Move deployed content to a SEPARATE subdomain (e.g. `d.example.com`)
 *             so it becomes a different origin — this is what CodePen/JSFiddle do.
 *         (b) OR serve with a strict `Content-Security-Policy: default-src 'none';
 *             script-src 'unsafe-inline'` plus `sandbox` attribute on an
 *             `<iframe>` wrapper, AND don't store sensitive data in
 *             `localStorage` on the editor origin.
 *
 *   This file sets a basic `Content-Security-Policy` header on the deployed
 *   page (in `src/app/d/[id]/route.ts`) as a defense-in-depth measure, but
 *   for a public deployment you really want the subdomain approach (a).
 *
 *   SEE: src/app/d/[id]/route.ts for the CSP header that's actually set on
 *   served deployment pages.
 */

// Rate limiting — still in-memory for now (see FASE 6 for AI route; this is
// similar pattern). For deploy the limit is 20 deploys per hour per IP.
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 20 // 20 deploys per hour
const RATE_WINDOW = 60 * 60 * 1000 // 1 hour

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW })
    return true
  }
  if (entry.count >= RATE_LIMIT) return false
  entry.count++
  return true
}

/**
 * Sanitize HTML — INTENTIONALLY minimal.
 *
 * NOTE: This is NOT an XSS filter. It only blocks the two most blatant
 * `javascript:` URL schemes in event handlers. Inline `<script>` tags are
 * INTENTIONALLY ALLOWED because IndoCode transpiled output relies on them
 * to execute user code. The real security boundary is origin isolation
 * and CSP, not this function.
 *
 * @see file-level comment above for the full security model
 */
function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') return ''
  // Limit size (5MB max — enforced here AND at the route level for defense in depth)
  if (html.length > 5 * 1024 * 1024) return ''
  // Remove null bytes (can be used to bypass naive filters)
  html = html.replace(/\0/g, '')
  // Block `javascript:` URIs in event handlers (the only "real" filter here)
  html = html.replace(/\son(load|error)\s*=\s*["']javascript:/gi, ' data-blocked=')
  return html
}

// Validate ID format (hex only, 8 chars)
function isValidId(id: string): boolean {
  return /^[a-f0-9]{8}$/.test(id)
}

// POST - Deploy HTML content (persisted to SQLite via Prisma)
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Max 20 deploys per hour.' },
        { status: 429, headers: { 'Retry-After': '3600' } }
      )
    }

    const body = await req.json()
    const { html, fileName, title, customDomain } = body

    if (!html || typeof html !== 'string') {
      return NextResponse.json({ error: 'HTML content is required' }, { status: 400 })
    }

    if (html.length > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Content too large (max 5MB)' }, { status: 413 })
    }

    // Sanitize (see sanitizeHtml comment — minimal, NOT a real XSS filter)
    const sanitizedHtml = sanitizeHtml(html)
    const safeFileName = (fileName || 'untitled.html').substring(0, 100).replace(/[^a-zA-Z0-9._-]/g, '_')
    const safeTitle = (title || 'Deployed Project').substring(0, 200)
    const safeDomain = customDomain ? customDomain.trim().substring(0, 200).replace(/^https?:\/\//, '').replace(/\/$/, '') : ''

    // Generate 8-char hex ID (ensure unique via DB lookup with retry)
    let id: string = ''
    let attempts = 0
    while (attempts < 5) {
      const candidate = Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
      if (isPrismaAvailable && db) {
        const existing = await db.deployedProject.findUnique({ where: { id: candidate } })
        if (!existing) { id = candidate; break }
      } else {
        const existing = await memoryDB.findById(candidate)
        if (!existing) { id = candidate; break }
      }
      attempts++
    }
    if (!id) {
      return NextResponse.json({ error: 'Failed to generate unique ID, please retry' }, { status: 500 })
    }

    const now = new Date()
    if (isPrismaAvailable && db) {
      await db.deployedProject.create({
        data: {
          id,
          html: sanitizedHtml,
          fileName: safeFileName,
          title: safeTitle,
          views: 0,
          createdAt: now,
        },
      })
    } else {
      await memoryDB.create({
        id,
        html: sanitizedHtml,
        fileName: safeFileName,
        title: safeTitle,
      })
    }

    // Build URL — prefer x-forwarded-host (set by gateway/proxy), fallback to host
    let baseUrl: string
    if (safeDomain) {
      baseUrl = `https://${safeDomain}`
    } else {
      const fwdHost = req.headers.get('x-forwarded-host')
      const fwdProto = req.headers.get('x-forwarded-proto')
      const host = fwdHost || req.headers.get('host') || 'localhost:3000'
      const isLocalhost = host.startsWith('localhost') || host.startsWith('127.0.0.1')
      const protocol = fwdProto || (isLocalhost ? 'http' : 'https')
      baseUrl = `${protocol}://${host}`
    }

    const shareUrl = `${baseUrl}/d/${id}`

    return NextResponse.json({
      success: true, id, url: shareUrl, shortUrl: `/d/${id}`, createdAt: now.toISOString(), fileName: safeFileName,
    })
  } catch (error) {
    console.error('Deploy error:', error)
    return NextResponse.json({ error: 'Failed to deploy' }, { status: 500 })
  }
}

// GET - List deployed projects
export async function GET() {
  try {
    let projects
    if (isPrismaAvailable && db) {
      projects = await db.deployedProject.findMany({
        orderBy: { createdAt: 'desc' },
        select: { id: true, fileName: true, title: true, createdAt: true, views: true, html: true },
      })
    } else {
      projects = await memoryDB.findAll()
    }
    // Map to the API shape (don't return full html in list — just size)
    const result = projects.map(p => ({
      id: p.id,
      fileName: p.fileName,
      title: p.title,
      createdAt: p.createdAt.toISOString(),
      views: p.views,
      size: p.html?.length || 0,
    }))
    return NextResponse.json({ projects: result })
  } catch (error) {
    console.error('Deploy list error:', error)
    return NextResponse.json({ error: 'Failed to list projects' }, { status: 500 })
  }
}

// DELETE — by query param ?id=xxx
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id || !isValidId(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

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
  } catch (error) {
    console.error('Deploy delete error:', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
