import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()))
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : null

    const rawFacilities = await prisma.facility.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        code: true,
        type: true,
        address: true,
        region: { select: { id: true, name: true } },
        _count: { select: { declarations: true, statSheets: true } },
      },
    })

    // Fetch lat/lng separately to avoid issues if columns don't exist yet in DB
    let coordMap = new Map<string, { latitude: number | null; longitude: number | null }>()
    try {
      const coords = await (prisma as any).facility.findMany({
        where: { isActive: true },
        select: { id: true, latitude: true, longitude: true },
      }) as { id: string; latitude: number | null; longitude: number | null }[]
      for (const c of coords) coordMap.set(c.id, { latitude: c.latitude, longitude: c.longitude })
    } catch {
      // latitude/longitude columns don't exist yet — continue without coordinates
    }

    const sheetWhere: any = { year }
    if (month) sheetWhere.month = month
    const sheets = await prisma.statSheet.findMany({
      where: sheetWhere,
      select: { facilityId: true, status: true, completeness: true },
    })

    const sheetMap = new Map<string, { status: string; completeness: number }>()
    for (const s of sheets) {
      sheetMap.set(s.facilityId, { status: s.status, completeness: Number(s.completeness ?? 0) })
    }

    const data = rawFacilities.map((f) => {
      const sheet = sheetMap.get(f.id)
      const coord = coordMap.get(f.id)
      return {
        id: f.id,
        name: f.name,
        code: f.code,
        type: f.type,
        address: f.address,
        latitude: coord?.latitude ?? null,
        longitude: coord?.longitude ?? null,
        region: f.region,
        declarationCount: Number(f._count.declarations),
        statSheetCount: Number(f._count.statSheets),
        sheetStatus: sheet?.status ?? null,
        completeness: sheet?.completeness ?? null,
      }
    })

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error('[/api/map]', err)
    return NextResponse.json(
      { success: false, error: err?.message ?? 'Erreur serveur' },
      { status: 500 }
    )
  }
}
