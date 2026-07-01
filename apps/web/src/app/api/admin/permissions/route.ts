import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { buildPermissions, ALL_ROLES, PAGE_DEFS, defaultGranted, type AppRole } from '@/lib/permissions'
import { z } from 'zod'

// GET /api/admin/permissions
//   → returns the permission map for the current user's role
//   → if ?all=true and SUPER_ADMIN: returns full matrix for admin UI
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const role = session.user.role as AppRole
    const allMode = req.nextUrl.searchParams.get('all') === 'true'

    if (allMode) {
      if (role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Réservé au Super Admin' }, { status: 403 })

      // Return full matrix: Record<role, Record<pageKey, boolean>>
      const dbRows = await prisma.pagePermission.findMany()
      const matrix: Record<string, Record<string, boolean>> = {}
      for (const r of ALL_ROLES) {
        const rows = dbRows.filter((row) => row.role === r)
        matrix[r] = buildPermissions(r, rows)
      }
      return NextResponse.json({ success: true, data: matrix })
    }

    // Single-role mode: return current user's permissions
    const dbRows = await prisma.pagePermission.findMany({ where: { role } })
    const permissions = buildPermissions(role, dbRows)
    return NextResponse.json({ success: true, data: permissions })
  } catch (e: any) {
    console.error('[GET /api/admin/permissions]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

const updateSchema = z.object({
  updates: z.array(z.object({
    role: z.enum(ALL_ROLES as unknown as [string, ...string[]]),
    pageKey: z.string(),
    granted: z.boolean(),
  })).min(1),
})

// PUT /api/admin/permissions  — SUPER_ADMIN only
// Body: { updates: { role, pageKey, granted }[] }
export async function PUT(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    if (session.user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Réservé au Super Admin' }, { status: 403 })

    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 })

    const validKeys = new Set(PAGE_DEFS.map((p) => p.key))

    await prisma.$transaction(
      parsed.data.updates
        .filter((u) => validKeys.has(u.pageKey) && u.role !== 'SUPER_ADMIN')
        .map((u) =>
          prisma.pagePermission.upsert({
            where: { role_pageKey: { role: u.role as any, pageKey: u.pageKey } },
            update: { granted: u.granted },
            create: { role: u.role as any, pageKey: u.pageKey, granted: u.granted },
          })
        )
    )

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[PUT /api/admin/permissions]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
