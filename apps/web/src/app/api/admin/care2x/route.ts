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

  // ── Vue clés API ──────────────────────────────────────────────────────────
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

  // ── Vue syncs (table + stats) ─────────────────────────────────────────────
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

  // ── Vue tableau de bord — agrégats pour graphiques ────────────────────────
  if (view === 'dashboard') {
    const where: any = {}
    if (facilityId) where.facilityId = facilityId
    if (regionId)   where.facility   = { regionId }
    if (dateFrom || dateTo) {
      where.receivedAt = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo   ? { lte: new Date(dateTo + 'T23:59:59Z') } : {}),
      }
    }

    // Récupérer toutes les syncs avec facility+region
    const syncs = await prisma.care2xSync.findMany({
      where,
      select: {
        id: true,
        totalAmount: true,
        entriesCount: true,
        receivedAt: true,
        facilityId: true,
        facility: { select: { name: true, code: true, region: { select: { id: true, name: true } } } },
      },
      orderBy: { receivedAt: 'asc' },
    })

    // KPIs globaux
    const totalAmount   = syncs.reduce((s, x) => s + Number(x.totalAmount), 0)
    const totalEntries  = syncs.reduce((s, x) => s + x.entriesCount, 0)
    const facilityIds   = [...new Set(syncs.map(x => x.facilityId))]

    // Centres actifs vs inactifs (last 30j)
    const threshold = new Date(Date.now() - 30 * 86400 * 1000)
    const allFacilities = await prisma.facility.findMany({
      where: { isActive: true, ...(regionId ? { regionId } : {}) },
      select: { id: true, name: true, code: true, region: { select: { name: true } }, apiKey: { select: { lastUsedAt: true, isActive: true } } },
    })
    const activeCenters = allFacilities.filter(f => f.apiKey?.lastUsedAt && new Date(f.apiKey.lastUsedAt) > threshold).length
    const staleCenters  = allFacilities.filter(f => f.apiKey?.isActive && (!f.apiKey.lastUsedAt || new Date(f.apiKey.lastUsedAt) <= threshold)).length
    const noKeyCenters  = allFacilities.filter(f => !f.apiKey?.isActive).length

    // Courbe 30 jours (regrouper par jour)
    const byDay: Record<string, { amount: number; count: number }> = {}
    const now   = new Date()
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i)
      byDay[d.toISOString().slice(0, 10)] = { amount: 0, count: 0 }
    }
    for (const s of syncs) {
      const day = new Date(s.receivedAt).toISOString().slice(0, 10)
      if (byDay[day]) {
        byDay[day].amount += Number(s.totalAmount)
        byDay[day].count  += s.entriesCount
      }
    }
    const timeline = Object.entries(byDay).map(([date, v]) => ({
      date,
      label: new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
      amount: Math.round(v.amount),
      count:  v.count,
    }))

    // Par région
    const byRegion: Record<string, { name: string; amount: number; count: number; facilities: Set<string> }> = {}
    for (const s of syncs) {
      const rId   = s.facility.region.id
      const rName = s.facility.region.name
      if (!byRegion[rId]) byRegion[rId] = { name: rName, amount: 0, count: 0, facilities: new Set() }
      byRegion[rId].amount += Number(s.totalAmount)
      byRegion[rId].count  += s.entriesCount
      byRegion[rId].facilities.add(s.facilityId)
    }
    const perRegion = Object.values(byRegion)
      .map(r => ({ name: r.name, amount: Math.round(r.amount), count: r.count, centers: r.facilities.size }))
      .sort((a, b) => b.amount - a.amount)

    // Top centres
    const byCentre: Record<string, { name: string; code: string; region: string; amount: number; count: number; lastSync: string }> = {}
    for (const s of syncs) {
      const fId = s.facilityId
      if (!byCentre[fId]) byCentre[fId] = { name: s.facility.name, code: s.facility.code, region: s.facility.region.name, amount: 0, count: 0, lastSync: s.receivedAt.toISOString() }
      byCentre[fId].amount += Number(s.totalAmount)
      byCentre[fId].count  += s.entriesCount
      if (s.receivedAt > new Date(byCentre[fId].lastSync)) byCentre[fId].lastSync = s.receivedAt.toISOString()
    }
    const topCentres = Object.values(byCentre).sort((a, b) => b.amount - a.amount).slice(0, 10)

    // Répartition par type de paiement
    const entries = await prisma.care2xSyncEntry.findMany({
      where: { sync: where },
      select: { typePaiement: true, montant: true },
    })
    const byType: Record<string, number> = {}
    for (const e of entries) {
      byType[e.typePaiement] = (byType[e.typePaiement] || 0) + Number(e.montant)
    }
    const paymentTypes = Object.entries(byType)
      .map(([type, amount]) => ({ type, amount: Math.round(amount) }))
      .sort((a, b) => b.amount - a.amount)

    // Régions disponibles pour le filtre
    const regions = await prisma.region.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })
    const facilitiesForFilter = await prisma.facility.findMany({
      where: { isActive: true, ...(regionId ? { regionId } : {}) },
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({
      success: true,
      kpis: { totalAmount, totalEntries, totalSyncs: syncs.length, activeCenters, staleCenters, noKeyCenters, totalCenters: allFacilities.length },
      timeline,
      perRegion,
      topCentres,
      paymentTypes,
      filters: { regions, facilities: facilitiesForFilter },
    })
  }

  return NextResponse.json({ error: 'Vue inconnue' }, { status: 400 })
}
