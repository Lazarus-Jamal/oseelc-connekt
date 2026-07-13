import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (session.user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Réservé au Super Admin' }, { status: 403 })

  const { searchParams } = req.nextUrl
  const view       = searchParams.get('view') || 'keys'
  const regionId   = searchParams.get('regionId') || undefined
  const facilityId = searchParams.get('facilityId') || undefined
  const dateFrom   = searchParams.get('dateFrom') || undefined
  const dateTo     = searchParams.get('dateTo') || undefined

  try {
    // ── Vue clés API ────────────────────────────────────────────────────────
    if (view === 'keys') {
      const facilities = await prisma.facility.findMany({
        where: { isActive: true, ...(regionId ? { regionId } : {}) },
        orderBy: { name: 'asc' },
        select: {
          id: true, name: true, code: true,
          region: { select: { id: true, name: true } },
          apiKey: { select: { id: true, keyPreview: true, isActive: true, createdAt: true, lastUsedAt: true } },
          _count: { select: { care2xSyncs: true } },
        },
      })
      return NextResponse.json({ success: true, data: facilities })
    }

    // ── Vue syncs (table + stats) ───────────────────────────────────────────
    if (view === 'syncs') {
      const where: any = {}
      if (facilityId) where.facilityId = facilityId
      if (regionId)   where.facility   = { regionId }
      if (dateFrom || dateTo) {
        where.receivedAt = {
          ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
          ...(dateTo   ? { lte: new Date(dateTo + 'T23:59:59Z') } : {}),
        }
      }

      const syncs = await prisma.care2xSync.findMany({
        where,
        orderBy: { receivedAt: 'desc' },
        take: 200,
        include: {
          facility: { select: { id: true, name: true, code: true, region: { select: { id: true, name: true } } } },
        },
      })
      return NextResponse.json({ success: true, data: syncs })
    }

    // ── Vue tableau de bord — basé sur les rapports journaliers si dispo, sinon care2xSync ──
    if (view === 'dashboard') {
      const sWhere: any = {}
      if (facilityId) sWhere.facilityId = facilityId
      if (regionId)   sWhere.facility   = { regionId }
      if (dateFrom || dateTo) {
        sWhere.receivedAt = {
          ...(dateFrom ? { gte: new Date(dateFrom + 'T00:00:00.000Z') } : {}),
          ...(dateTo   ? { lte: new Date(dateTo   + 'T23:59:59.999Z') } : {}),
        }
      }

      // Essai rapports journaliers d'abord
      const rWhere: any = { ...sWhere }
      if (dateFrom || dateTo) {
        delete rWhere.receivedAt
        rWhere.date = {
          ...(dateFrom ? { gte: new Date(dateFrom + 'T00:00:00.000Z') } : {}),
          ...(dateTo   ? { lte: new Date(dateTo   + 'T23:59:59.999Z') } : {}),
        }
      }

      let useRapports = false
      try {
        const count = await prisma.care2xRapportJournalier.count({ where: rWhere })
        if (count > 0) useRapports = true
      } catch { /* table peut ne pas exister en prod */ }

      // ── KPIs ──────────────────────────────────────────────────────────────
      let totalAmount = 0, totalEncaisse = 0, totalCreances = 0, totalRemb = 0, totalEntries = 0, totalSyncs = 0
      type SyncItem = { facilityId: string; receivedAt: Date; totalAmount: { toString(): string } | number; entriesCount: number; facility: { name: string; code: string; region: { id: string; name: string } } }
      let syncItems: SyncItem[] = []

      if (useRapports) {
        const rapports = await prisma.care2xRapportJournalier.findMany({
          where: rWhere,
          select: { id: true, date: true, facilityId: true, totRow: true, openRow: true, rembRow: true, parPaiement: true, facility: { select: { name: true, code: true, region: { select: { id: true, name: true } } } } },
          orderBy: { date: 'asc' },
        })
        totalAmount   = rapports.reduce((s, r) => s + Number((r.totRow  as any).total_facture   ?? 0), 0)
        totalEncaisse = rapports.reduce((s, r) => s + Number((r.totRow  as any).total_encaisse  ?? 0), 0)
        totalCreances = rapports.reduce((s, r) => s + Number((r.openRow as any).total_restant   ?? 0), 0)
        totalRemb     = rapports.reduce((s, r) => s + Number((r.rembRow as any).total_rembourse ?? 0), 0)
        totalEntries  = rapports.reduce((s, r) => s + Number((r.totRow  as any).nb              ?? 0), 0)
        totalSyncs    = rapports.length

        // Timeline par jour
        const byDay: Record<string, { amount: number; count: number }> = {}
        if (!dateFrom && !dateTo) {
          const now = new Date()
          for (let i = 29; i >= 0; i--) { const d = new Date(now); d.setDate(d.getDate() - i); byDay[d.toISOString().slice(0, 10)] = { amount: 0, count: 0 } }
        } else {
          const cur = new Date((dateFrom ?? dateTo!) + 'T00:00:00Z'), end = new Date((dateTo ?? dateFrom!) + 'T00:00:00Z')
          while (cur <= end) { byDay[cur.toISOString().slice(0, 10)] = { amount: 0, count: 0 }; cur.setDate(cur.getDate() + 1) }
        }
        for (const r of rapports) { const day = new Date(r.date).toISOString().slice(0, 10); if (byDay[day]) { byDay[day].amount += Number((r.totRow as any).total_facture ?? 0); byDay[day].count += Number((r.totRow as any).nb ?? 0) } }

        const byRegion: Record<string, { name: string; amount: number; count: number; facilities: Set<string> }> = {}
        for (const r of rapports) {
          const rId = r.facility.region.id
          if (!byRegion[rId]) byRegion[rId] = { name: r.facility.region.name, amount: 0, count: 0, facilities: new Set() }
          byRegion[rId].amount += Number((r.totRow as any).total_facture ?? 0); byRegion[rId].count += Number((r.totRow as any).nb ?? 0); byRegion[rId].facilities.add(r.facilityId)
        }

        const byCentre: Record<string, { name: string; code: string; region: string; amount: number; count: number; lastSync: string }> = {}
        for (const r of rapports) {
          if (!byCentre[r.facilityId]) byCentre[r.facilityId] = { name: r.facility.name, code: r.facility.code, region: r.facility.region.name, amount: 0, count: 0, lastSync: r.date.toISOString() }
          byCentre[r.facilityId].amount += Number((r.totRow as any).total_facture ?? 0); byCentre[r.facilityId].count += Number((r.totRow as any).nb ?? 0)
          if (r.date > new Date(byCentre[r.facilityId].lastSync)) byCentre[r.facilityId].lastSync = r.date.toISOString()
        }

        const byType: Record<string, number> = {}
        for (const r of rapports) for (const p of (r.parPaiement as any[])) byType[p.mode] = (byType[p.mode] || 0) + Number(p.total ?? 0)

        const threshold = new Date(Date.now() - 30 * 86400 * 1000)
        const allFacilities = await prisma.facility.findMany({ where: { isActive: true, ...(regionId ? { regionId } : {}) }, select: { id: true, apiKey: { select: { lastUsedAt: true, isActive: true } } } })

        const regions = await prisma.region.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } })
        const facilitiesForFilter = await prisma.facility.findMany({ where: { isActive: true, ...(regionId ? { regionId } : {}) }, select: { id: true, name: true, code: true }, orderBy: { name: 'asc' } })

        return NextResponse.json({
          success: true,
          kpis: { totalAmount: Math.round(totalAmount), totalEncaisse: Math.round(totalEncaisse), totalCreances: Math.round(totalCreances), totalRemb: Math.round(totalRemb), totalEntries, totalSyncs,
            activeCenters: allFacilities.filter(f => f.apiKey?.lastUsedAt && new Date(f.apiKey.lastUsedAt) > threshold).length,
            staleCenters:  allFacilities.filter(f => f.apiKey?.isActive && (!f.apiKey.lastUsedAt || new Date(f.apiKey.lastUsedAt) <= threshold)).length,
            noKeyCenters:  allFacilities.filter(f => !f.apiKey?.isActive).length,
            totalCenters:  allFacilities.length },
          timeline: Object.entries(byDay).map(([date, v]) => ({ date, label: new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }), amount: Math.round(v.amount), count: v.count })),
          perRegion: Object.values(byRegion).map(r => ({ name: r.name, amount: Math.round(r.amount), count: r.count, centers: r.facilities.size })).sort((a, b) => b.amount - a.amount),
          topCentres: Object.entries(byCentre).map(([id, c]) => ({ id, ...c, amount: Math.round(c.amount) })).sort((a, b) => b.amount - a.amount).slice(0, 10),
          paymentTypes: Object.entries(byType).map(([type, amount]) => ({ type, amount: Math.round(amount) })).sort((a, b) => b.amount - a.amount),
          filters: { regions, facilities: facilitiesForFilter },
        })
      }

      // ── Fallback : care2xSync ─────────────────────────────────────────────
      const syncs = await prisma.care2xSync.findMany({
        where: sWhere,
        select: { facilityId: true, receivedAt: true, totalAmount: true, entriesCount: true, facility: { select: { name: true, code: true, region: { select: { id: true, name: true } } } } },
        orderBy: { receivedAt: 'asc' },
      })
      syncItems = syncs
      totalAmount  = syncs.reduce((s, r) => s + Number(r.totalAmount), 0)
      totalEntries = syncs.reduce((s, r) => s + r.entriesCount, 0)
      totalSyncs   = syncs.length

      const byDay: Record<string, { amount: number; count: number }> = {}
      if (!dateFrom && !dateTo) {
        const now = new Date()
        for (let i = 29; i >= 0; i--) { const d = new Date(now); d.setDate(d.getDate() - i); byDay[d.toISOString().slice(0, 10)] = { amount: 0, count: 0 } }
      } else {
        const cur = new Date((dateFrom ?? dateTo!) + 'T00:00:00Z'), end = new Date((dateTo ?? dateFrom!) + 'T00:00:00Z')
        while (cur <= end) { byDay[cur.toISOString().slice(0, 10)] = { amount: 0, count: 0 }; cur.setDate(cur.getDate() + 1) }
      }
      for (const r of syncItems) { const day = new Date(r.receivedAt).toISOString().slice(0, 10); if (byDay[day]) { byDay[day].amount += Number(r.totalAmount); byDay[day].count += r.entriesCount } }

      const byRegion: Record<string, { name: string; amount: number; count: number; facilities: Set<string> }> = {}
      for (const r of syncItems) {
        const rId = r.facility.region.id
        if (!byRegion[rId]) byRegion[rId] = { name: r.facility.region.name, amount: 0, count: 0, facilities: new Set() }
        byRegion[rId].amount += Number(r.totalAmount); byRegion[rId].count += r.entriesCount; byRegion[rId].facilities.add(r.facilityId)
      }

      const byCentre: Record<string, { name: string; code: string; region: string; amount: number; count: number; lastSync: string }> = {}
      for (const r of syncItems) {
        if (!byCentre[r.facilityId]) byCentre[r.facilityId] = { name: r.facility.name, code: r.facility.code, region: r.facility.region.name, amount: 0, count: 0, lastSync: r.receivedAt.toISOString() }
        byCentre[r.facilityId].amount += Number(r.totalAmount); byCentre[r.facilityId].count += r.entriesCount
        if (r.receivedAt > new Date(byCentre[r.facilityId].lastSync)) byCentre[r.facilityId].lastSync = r.receivedAt.toISOString()
      }

      const threshold = new Date(Date.now() - 30 * 86400 * 1000)
      const allFacilities = await prisma.facility.findMany({ where: { isActive: true, ...(regionId ? { regionId } : {}) }, select: { id: true, apiKey: { select: { lastUsedAt: true, isActive: true } } } })
      const regions = await prisma.region.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } })
      const facilitiesForFilter = await prisma.facility.findMany({ where: { isActive: true, ...(regionId ? { regionId } : {}) }, select: { id: true, name: true, code: true }, orderBy: { name: 'asc' } })

      return NextResponse.json({
        success: true,
        kpis: { totalAmount: Math.round(totalAmount), totalEncaisse: 0, totalCreances: 0, totalRemb: 0, totalEntries, totalSyncs,
          activeCenters: allFacilities.filter(f => f.apiKey?.lastUsedAt && new Date(f.apiKey.lastUsedAt) > threshold).length,
          staleCenters:  allFacilities.filter(f => f.apiKey?.isActive && (!f.apiKey.lastUsedAt || new Date(f.apiKey.lastUsedAt) <= threshold)).length,
          noKeyCenters:  allFacilities.filter(f => !f.apiKey?.isActive).length,
          totalCenters:  allFacilities.length },
        timeline: Object.entries(byDay).map(([date, v]) => ({ date, label: new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }), amount: Math.round(v.amount), count: v.count })),
        perRegion: Object.values(byRegion).map(r => ({ name: r.name, amount: Math.round(r.amount), count: r.count, centers: r.facilities.size })).sort((a, b) => b.amount - a.amount),
        topCentres: Object.entries(byCentre).map(([id, c]) => ({ id, ...c, amount: Math.round(c.amount) })).sort((a, b) => b.amount - a.amount).slice(0, 10),
        paymentTypes: [],
        filters: { regions, facilities: facilitiesForFilter },
      })
    }

    // ── Rapports journaliers d'un centre ──────────────────────────────────────
    if (view === 'rapports') {
      if (!facilityId) return NextResponse.json({ success: false, error: 'facilityId requis' }, { status: 400 })
      const dateWhere: any = {}
      if (dateFrom) dateWhere.gte = new Date(dateFrom + 'T00:00:00.000Z')
      if (dateTo)   dateWhere.lte = new Date(dateTo   + 'T23:59:59.999Z')
      const rapports = await prisma.care2xRapportJournalier.findMany({
        where: { facilityId, ...(Object.keys(dateWhere).length ? { date: dateWhere } : {}) },
        orderBy: { date: 'desc' },
        take: 90,
        select: {
          id: true, date: true, receivedAt: true,
          parGroupe: true, parPaiement: true, parAvance: true,
          totRow: true, openRow: true, rembRow: true,
          rembParMode: true, credits: true, caissiers: true,
        },
      })
      return NextResponse.json({ success: true, data: rapports })
    }

    return NextResponse.json({ success: false, error: 'Vue inconnue' }, { status: 400 })
  } catch (err: any) {
    console.error('[care2x GET]', err)
    return NextResponse.json(
      { success: false, error: err?.message ?? 'Erreur serveur' },
      { status: 500 }
    )
  }
}
