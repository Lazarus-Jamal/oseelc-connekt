'use client'

import { useCallback, useEffect, useState, useMemo } from 'react'
import { toast } from 'sonner'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  KeyRound, RefreshCw, ShieldOff, Copy, Check, Wifi, WifiOff,
  Clock, BarChart2, Loader2, Upload, PackageOpen, Trash2, Star,
  AlertTriangle, TrendingUp, Building2, Filter, ChevronDown, ChevronRight,
  FileText, Banknote, Printer,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { usePermissions } from '@/contexts/permissions-context'
import ResetDbModal from './reset-db-modal'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FacilityRow {
  id: string; name: string; code: string
  region: { id: string; name: string }
  apiKey: { id: string; keyPreview: string; isActive: boolean; createdAt: string; lastUsedAt: string | null } | null
  _count: { care2xSyncs: number }
}
interface SyncRow {
  id: string; batchRef: string; entriesCount: number; totalAmount: number
  periodStart: string; periodEnd: string; receivedAt: string
  facility: { id: string; name: string; code: string; region: { id: string; name: string } }
}
interface VersionRow {
  id: string; version: string; releaseNotes: string | null; filename: string
  fileSize: number; downloadUrl: string; isActive: boolean; createdAt: string
}
interface RapportJournalier {
  id: string; date: string; receivedAt: string
  parGroupe:   { groupe: string; total: number; quantite: number }[]
  parPaiement: { mode: string; total: number }[]
  parAvance:   { mode: string; total: number }[]
  rembParMode: { mode: string; total: number }[]
  totRow:  { nb: number; total_facture: number; total_encaisse: number; total_remise: number; total_assurance: number }
  openRow: { nb: number; total_avance: number; total_restant: number; total_facture: number }
  credits: { assurance: string; total: number }[]
  rembRow: { total_rembourse: number; nb_remboursements: number }
  caissiers: string[]
}

interface DashboardData {
  kpis: { totalAmount: number; totalEncaisse: number; totalCreances: number; totalRemb: number; totalEntries: number; totalSyncs: number; activeCenters: number; staleCenters: number; noKeyCenters: number; totalCenters: number }
  timeline: { date: string; label: string; amount: number; count: number }[]
  perRegion: { name: string; amount: number; count: number; centers: number }[]
  topCentres: { id: string; name: string; code: string; region: string; amount: number; count: number; lastSync: string }[]
  paymentTypes: { type: string; amount: number }[]
  filters: { regions: { id: string; name: string }[]; facilities: { id: string; name: string; code: string }[] }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d: string | null) => d
  ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '—'
const fmtAmt = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA'
const daysSince = (d: string | null) => d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : null
const REGION_COLORS = ['#0EA5A4', '#6366F1', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6']

// ─── Pagination ───────────────────────────────────────────────────────────────

function Paginator({ page, total, perPage, onChange }: {
  page: number; total: number; perPage: number; onChange: (p: number) => void
}) {
  const pages = Math.ceil(total / perPage)
  if (pages <= 1) return null
  const from = page * perPage + 1
  const to   = Math.min((page + 1) * perPage, total)

  const pageNums: (number | '…')[] = []
  for (let i = 0; i < pages; i++) {
    if (i === 0 || i === pages - 1 || Math.abs(i - page) <= 1) pageNums.push(i)
    else if (pageNums[pageNums.length - 1] !== '…') pageNums.push('…')
  }

  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 bg-gray-50/60 text-xs text-gray-500">
      <span>{from}–{to} sur {total}</span>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(0)} disabled={page === 0}
          className="px-2 py-1 rounded disabled:opacity-30 hover:bg-gray-200 transition-colors">«</button>
        <button onClick={() => onChange(page - 1)} disabled={page === 0}
          className="px-2 py-1 rounded disabled:opacity-30 hover:bg-gray-200 transition-colors">‹</button>
        {pageNums.map((n, i) =>
          n === '…'
            ? <span key={i} className="px-1">…</span>
            : <button key={n} onClick={() => onChange(n as number)}
                className={`px-2.5 py-1 rounded transition-colors ${n === page ? 'bg-teal-600 text-white font-semibold' : 'hover:bg-gray-200'}`}>
                {(n as number) + 1}
              </button>
        )}
        <button onClick={() => onChange(page + 1)} disabled={page === pages - 1}
          className="px-2 py-1 rounded disabled:opacity-30 hover:bg-gray-200 transition-colors">›</button>
        <button onClick={() => onChange(pages - 1)} disabled={page === pages - 1}
          className="px-2 py-1 rounded disabled:opacity-30 hover:bg-gray-200 transition-colors">»</button>
      </div>
    </div>
  )
}

// ─── Composants UI légers ─────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon: Icon, color = 'blue', alert = false }: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; color?: string; alert?: boolean
}) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600', green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600', red: 'bg-red-50 text-red-500',
    purple: 'bg-purple-50 text-purple-600',
  }
  return (
    <div className={`bg-white rounded-xl border p-5 flex items-start gap-4 ${alert ? 'border-orange-200' : 'border-gray-200'}`}>
      <div className={`p-2.5 rounded-xl ${colors[color]}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</div>
        <div className="text-2xl font-bold text-gray-900 leading-none">{value}</div>
        {sub && <div className={`text-xs mt-1 ${alert ? 'text-orange-600' : 'text-gray-400'}`}>{sub}</div>}
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">{children}</h3>
}

// ─── Composant principal ─────────────────────────────────────────────────────

const ALL_CARE2X_TABS = [
  { id: 'dashboard' as const, pageKey: 'care2x.overview', label: "Vue d'ensemble",  icon: TrendingUp },
  { id: 'keys'      as const, pageKey: 'care2x.keys',     label: 'Clés API',        icon: KeyRound   },
  { id: 'syncs'     as const, pageKey: 'care2x.syncs',    label: 'Historique syncs',icon: BarChart2  },
  { id: 'versions'  as const, pageKey: 'care2x.versions', label: 'Versions',        icon: PackageOpen},
]

export function Care2xKeysPage() {
  const { canAccess } = usePermissions()
  const [tab, setTab] = useState<'dashboard' | 'keys' | 'syncs' | 'versions'>('dashboard')

  const visibleTabs = useMemo(
    () => ALL_CARE2X_TABS.filter((t) => canAccess(t.pageKey)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canAccess]
  )

  // Filtres
  const [filterRegion,   setFilterRegion]   = useState('')
  const [filterFacility, setFilterFacility] = useState('')
  const [filterFrom,     setFilterFrom]     = useState('')
  const [filterTo,       setFilterTo]       = useState('')
  const [regions,        setRegions]        = useState<{ id: string; name: string }[]>([])
  const [facilities,     setFacilities]     = useState<{ id: string; name: string; code: string }[]>([])

  // Data
  const [dashboard,   setDashboard]   = useState<DashboardData | null>(null)
  const [facilityRows, setFacilityRows] = useState<FacilityRow[]>([])
  const [syncs,        setSyncs]        = useState<SyncRow[]>([])
  const [versions,     setVersions]     = useState<VersionRow[]>([])
  const [loading,      setLoading]      = useState(true)
  const [loadError,    setLoadError]    = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Rapports journaliers — ligne dépliable dans l'onglet Clés API
  const [expandedFacility,  setExpandedFacility]  = useState<string | null>(null)
  const [rapportsCache,     setRapportsCache]      = useState<Record<string, RapportJournalier[]>>({})
  const [rapportsLoading,   setRapportsLoading]    = useState<string | null>(null)

  // Panneau détail centre — Vue d'ensemble
  const [selectedCenter, setSelectedCenter] = useState<{ id: string; name: string; code: string; region: string } | null>(null)
  const [centerRapports, setCenterRapports] = useState<RapportJournalier[]>([])
  const [centerRapportsLoading, setCenterRapportsLoading] = useState(false)
  const [newKey,       setNewKey]       = useState<{ facilityName: string; key: string } | null>(null)
  const [copied,       setCopied]       = useState(false)

  // Pagination
  const [rapportPage, setRapportPage] = useState(0)
  const [keysPage,    setKeysPage]    = useState(0)
  const [syncsPage,   setSyncsPage]   = useState(0)
  const RAPPORT_PER = 10
  const KEYS_PER    = 10
  const SYNCS_PER   = 15

  const [showResetModal, setShowResetModal] = useState(false)

  // Upload
  const [uploadVersion, setUploadVersion] = useState('')
  const [uploadNotes,   setUploadNotes]   = useState('')
  const [uploadFile,    setUploadFile]    = useState<File | null>(null)
  const [uploading,     setUploading]     = useState(false)

  const filterParams = useCallback(() => {
    const p = new URLSearchParams()
    if (filterRegion)   p.set('regionId',   filterRegion)
    if (filterFacility) p.set('facilityId', filterFacility)
    if (filterFrom)     p.set('dateFrom',   filterFrom)
    if (filterTo)       p.set('dateTo',     filterTo)
    return p.toString() ? '&' + p.toString() : ''
  }, [filterRegion, filterFacility, filterFrom, filterTo])

  const load = useCallback(() => {
    setLoading(true)
    setLoadError(null)
    setKeysPage(0)
    setSyncsPage(0)
    if (tab === 'versions') {
      fetch('/api/admin/care2x/versions').then(r => r.json())
        .then(d => {
          if (d.success === false) setLoadError(d.error || 'Erreur chargement versions')
          else setVersions(d.data || [])
          setLoading(false)
        })
        .catch(() => { setLoadError('Erreur réseau'); setLoading(false) })
      return
    }
    if (tab === 'keys') {
      fetch(`/api/admin/care2x?view=keys${filterParams()}`).then(r => r.json())
        .then(d => {
          if (d.success === false) setLoadError(d.error || 'Erreur chargement clés')
          else setFacilityRows(d.data || [])
          setLoading(false)
        })
        .catch(() => { setLoadError('Erreur réseau'); setLoading(false) })
      return
    }
    if (tab === 'syncs') {
      fetch(`/api/admin/care2x?view=syncs${filterParams()}`).then(r => r.json())
        .then(d => {
          if (d.success === false) setLoadError(d.error || 'Erreur chargement syncs')
          else setSyncs(d.data || [])
          setLoading(false)
        })
        .catch(() => { setLoadError('Erreur réseau'); setLoading(false) })
      return
    }
    // dashboard
    fetch(`/api/admin/care2x?view=dashboard${filterParams()}`).then(r => r.json())
      .then(d => {
        if (d.success === false) {
          setLoadError(d.error || 'Erreur chargement tableau de bord')
        } else {
          setDashboard(d)
          if (d.filters?.regions)    setRegions(d.filters.regions)
          if (d.filters?.facilities) setFacilities(d.filters.facilities)
        }
        setLoading(false)
      })
      .catch(() => { setLoadError('Erreur réseau'); setLoading(false) })
  }, [tab, filterParams])

  useEffect(() => { load() }, [load])

  // Quand région change, reset facility
  useEffect(() => { setFilterFacility('') }, [filterRegion])

  // ── Actions clés ────────────────────────────────────────────────────────────

  const generateKey = async (f: FacilityRow) => {
    if (!confirm(`Générer une nouvelle clé API pour "${f.name}" ?\n\nSi une clé existait, elle sera révoquée.`)) return
    setActionLoading(f.id)
    try {
      const res  = await fetch(`/api/admin/facilities/${f.id}/api-key`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Erreur'); return }
      toast.success('Clé générée — copiez-la maintenant')
      setNewKey({ facilityName: f.name, key: data.key })
      load()
    } catch { toast.error('Erreur réseau') }
    finally   { setActionLoading(null) }
  }

  const revokeKey = async (f: FacilityRow) => {
    if (!confirm(`Révoquer la clé API de "${f.name}" ?`)) return
    setActionLoading(f.id + '_rev')
    try {
      await fetch(`/api/admin/facilities/${f.id}/api-key`, { method: 'DELETE' })
      toast.success('Clé révoquée')
      load()
    } catch { toast.error('Erreur réseau') }
    finally   { setActionLoading(null) }
  }

  const centerDetailRef = useCallback((el: HTMLDivElement | null) => {
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }, [])

  const openCenterDetail = async (center: { id: string; name: string; code: string; region: string }) => {
    if (center.id && selectedCenter?.id === center.id) { setSelectedCenter(null); return }
    setSelectedCenter(center)
    setCenterRapports([])
    setCenterRapportsLoading(true)
    setRapportPage(0)
    try {
      const params = new URLSearchParams({ view: 'rapports', facilityId: center.id })
      if (filterFrom) params.set('dateFrom', filterFrom)
      if (filterTo)   params.set('dateTo',   filterTo)
      const res = await fetch(`/api/admin/care2x?${params}`)
      const d = await res.json()
      setCenterRapports(d.data || [])
    } catch (err) {
      console.error('[openCenterDetail]', err)
    }
    finally { setCenterRapportsLoading(false) }
  }

  const handlePrint = (r: RapportJournalier) => {
    const w = window.open('', '_blank', 'width=480,height=720')
    if (!w) return
    const tot = r.totRow  as any
    const op  = r.openRow as any
    const rem = r.rembRow as any
    const ML: Record<string, string> = {
      especes: 'En CASH', orange_money: 'Orange Money',
      mtn_money: 'MTN Money', virement: 'Virement bancaire', cheque: 'Chèque',
    }
    const totalPaiem  = (r.parPaiement as any[]).reduce((s, p) => s + Number(p.total || 0), 0)
    const totalAvance = (r.parAvance   as any[]).reduce((s, p) => s + Number(p.total || 0), 0)
    const netCaisse   = totalPaiem + totalAvance
    const fmt = (n: number) => Number(n || 0).toLocaleString('fr-FR')
    const dateStr = new Date(r.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const centerName = selectedCenter?.name || ''
    const centerCode = selectedCenter?.code || ''
    const centerRegion = selectedCenter?.region || ''
    const caissiers = (r.caissiers as string[]).join(', ') || 'Système Admin'

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Rapport — ${centerName} — ${dateStr}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Courier New',monospace;font-size:12px;padding:16px 20px;max-width:380px;margin:0 auto}
.hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px}
.cn{font-size:13px;font-weight:bold}
.oseelc{font-size:11px;text-align:right;color:#555}
.title{text-align:center;font-weight:bold;font-size:14px;letter-spacing:3px;margin:6px 0}
.sep{border-top:1px dashed #000;margin:5px 0}
.sep2{border-top:2px solid #000;margin:5px 0}
.row{display:flex;justify-content:space-between;align-items:baseline;margin:2px 0}
.sec{text-align:center;font-weight:bold;font-size:10px;text-transform:uppercase;margin:3px 0;letter-spacing:1px}
.ind{padding-left:14px}
.bold{font-weight:bold}
.big{font-size:13px;font-weight:bold}
.green{color:#15803d}
.orange{color:#c2410c}
.red{color:#b91c1c}
.foot{text-align:center;margin-top:8px;font-size:10px;color:#666}
@media print{@page{margin:8mm}body{padding:0}}
</style></head><body>
<div class="hdr">
  <div><div class="cn">${centerName}</div><div>${centerCode} · ${centerRegion}</div></div>
  <div class="oseelc"><b>oseelc</b><br>connekt</div>
</div>
<div class="sep2"></div>
<div class="title">RAPPORT DES VENTES</div>
<div class="sep2"></div>
<div>Caissier : ${caissiers}</div>
<div>Période : ${dateStr} 00:00 à ${dateStr} 23:59</div>
<div class="sep"></div>
<div class="row bold" style="font-size:10px;color:#555"><span>GROUPE / SERVICE</span><span>TOTAL BRUT</span></div>
<div class="sep"></div>
${(r.parGroupe as any[]).map(g => `<div class="row"><span>${g.groupe}</span><span>${fmt(g.total)} F</span></div>`).join('')}
<div class="sep"></div>
<div class="row big"><span>Total Factures (net)</span><span>${fmt(tot.total_facture)} F</span></div>
<div class="sep"></div>
<div class="sec">Encaissements (soldées)</div>
<div class="sep"></div>
${(r.parPaiement as any[]).length === 0
  ? '<div class="ind">Aucun encaissement enregistré</div>'
  : (r.parPaiement as any[]).map(p => `<div class="row ind"><span>${ML[p.mode] || p.mode}</span><span>${fmt(p.total)} F</span></div>`).join('')}
${(r.parAvance as any[]).length > 0 ? `
<div class="sep"></div>
<div class="sec">Avances (fact. ouvertes)</div>
<div class="sep"></div>
${(r.parAvance as any[]).map(p => `<div class="row ind"><span>${ML[p.mode] || p.mode}</span><span>${fmt(p.total)} F</span></div>`).join('')}` : ''}
<div class="sep"></div>
<div class="row big green"><span>NET CAISSE</span><span>${fmt(netCaisse)} F</span></div>
${op.nb > 0 ? `
<div class="sep"></div>
<div class="sec">Créances (restes dus)</div>
<div class="sep"></div>
<div class="row"><span>${op.nb} facture(s) ouverte(s)</span><span>${fmt(op.total_facture)} F</span></div>
<div class="row ind orange"><span>Déjà encaissé</span><span>- ${fmt(op.total_avance)} F</span></div>
<div class="sep"></div>
<div class="row big red"><span>RESTE À PERCEVOIR</span><span>${fmt(op.total_restant)} F</span></div>` : ''}
${rem.total_rembourse > 0 ? `
<div class="sep"></div>
<div class="sec">Remboursements</div>
<div class="sep"></div>
${(r.rembParMode as any[]).map(p => `<div class="row ind red"><span>${ML[p.mode] || p.mode}</span><span>${fmt(p.total)} F</span></div>`).join('')}
<div class="row bold red"><span>Total remboursé</span><span>${fmt(rem.total_rembourse)} F</span></div>` : ''}
<div class="sep2"></div>
<div class="foot">Généré le ${new Date().toLocaleString('fr-FR')}</div>
<div class="foot">OSEELC-Connekt · ${centerName}</div>
<script>window.onload=()=>{setTimeout(()=>window.print(),300)}</script>
</body></html>`

    w.document.write(html)
    w.document.close()
  }

  const toggleFacility = async (fId: string) => {
    if (expandedFacility === fId) { setExpandedFacility(null); return }
    setExpandedFacility(fId)
    if (rapportsCache[fId]) return  // déjà en cache
    setRapportsLoading(fId)
    try {
      const d = await fetch(`/api/admin/care2x?view=rapports&facilityId=${fId}`).then(r => r.json())
      setRapportsCache(prev => ({ ...prev, [fId]: d.data || [] }))
    } catch { /* silencieux */ }
    finally { setRapportsLoading(null) }
  }

  // ── Versions ────────────────────────────────────────────────────────────────

  const uploadVersion_ = async () => {
    if (!uploadVersion || !uploadFile) { toast.error('Version et fichier requis'); return }
    if (!/^\d+\.\d+\.\d+$/.test(uploadVersion)) { toast.error('Format invalide (ex: 1.2.0)'); return }
    setUploading(true)
    const fd = new FormData()
    fd.append('version', uploadVersion); fd.append('releaseNotes', uploadNotes); fd.append('file', uploadFile)
    try {
      const res  = await fetch('/api/admin/care2x/versions', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Erreur'); return }
      toast.success(`Version ${uploadVersion} publiée`)
      setUploadVersion(''); setUploadNotes(''); setUploadFile(null)
      load()
    } catch { toast.error('Erreur réseau') }
    finally { setUploading(false) }
  }

  const deleteVersion = async (v: VersionRow) => {
    if (!confirm(`Supprimer la version ${v.version} ?`)) return
    setActionLoading(v.id)
    await fetch(`/api/admin/care2x/versions/${v.id}`, { method: 'DELETE' })
    toast.success('Version supprimée'); setActionLoading(null); load()
  }

  const activateVersion = async (v: VersionRow) => {
    setActionLoading(v.id + '_act')
    await fetch(`/api/admin/care2x/versions/${v.id}`, { method: 'PATCH' })
    toast.success(`Version ${v.version} activée`); setActionLoading(null); load()
  }

  // ── Filtres UI ───────────────────────────────────────────────────────────────

  const FilterBar = () => (
    <div className="flex flex-wrap gap-3 items-end mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
      <Filter size={15} className="text-gray-400 self-center" />

      <div>
        <label className="block text-xs text-gray-500 mb-1">Région</label>
        <select
          value={filterRegion}
          onChange={e => setFilterRegion(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 min-w-[160px]"
        >
          <option value="">Toutes les régions</option>
          {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Centre</label>
        <select
          value={filterFacility}
          onChange={e => setFilterFacility(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 min-w-[200px]"
        >
          <option value="">Tous les centres</option>
          {facilities.map(f => <option key={f.id} value={f.id}>{f.name} ({f.code})</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Du</label>
        <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Au</label>
        <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button onClick={load}
        className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-1.5">
        <RefreshCw size={13} /> Actualiser
      </button>

      {(filterRegion || filterFacility || filterFrom || filterTo) && (
        <button onClick={() => { setFilterRegion(''); setFilterFacility(''); setFilterFrom(''); setFilterTo('') }}
          className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 underline">
          Réinitialiser
        </button>
      )}
    </div>
  )

  // ── Rendu ────────────────────────────────────────────────────────────────────

  return (
    <div>
      <PageHeader
        title="Care2x — Tableau de bord synchro"
        description="Monitoring en temps réel des logiciels Care2x dans les centres de santé"
      />

      {/* Tabs */}
      <div className="flex items-end justify-between mb-6 border-b border-gray-200">
        <div className="flex gap-1">
          {visibleTabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowResetModal(true)}
          className="mb-1 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 hover:border-red-400 transition-colors"
        >
          <Trash2 size={12} /> Réinitialiser la BD
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-gray-400">
          <Loader2 size={24} className="animate-spin mr-2" /> Chargement…
        </div>
      ) : loadError ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <AlertTriangle size={32} className="text-orange-400" />
          <p className="text-sm font-medium text-gray-700">Impossible de charger les données</p>
          <p className="text-xs text-gray-400 max-w-md font-mono">{loadError}</p>
          <p className="text-xs text-gray-400">Si les tables Care2x ne sont pas encore créées, exécutez <code className="bg-gray-100 px-1 rounded">pnpm db:push</code> en local ou appliquez <code className="bg-gray-100 px-1 rounded">migration_prod.sql</code> sur la production.</p>
          <button onClick={load} className="mt-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <RefreshCw size={14} /> Réessayer
          </button>
        </div>
      ) : (
        <>
          {/* ═══ DASHBOARD ═══ */}
          {tab === 'dashboard' && dashboard && (
            <div className="space-y-6">
              <FilterBar />

              {/* KPIs — ligne 1 : financiers */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard label="Total facturé" value={fmtAmt(dashboard.kpis.totalAmount)}
                  icon={TrendingUp} color="blue"
                  sub={`${dashboard.kpis.totalEntries.toLocaleString('fr-FR')} ventes · ${dashboard.kpis.totalSyncs} jours`} />
                <KpiCard label="Total encaissé" value={fmtAmt(dashboard.kpis.totalEncaisse)}
                  icon={Banknote} color="green"
                  sub={dashboard.kpis.totalAmount > 0 ? `${Math.round(dashboard.kpis.totalEncaisse / dashboard.kpis.totalAmount * 100)} % du facturé` : '—'} />
                <KpiCard label="Créances" value={fmtAmt(dashboard.kpis.totalCreances)}
                  icon={AlertTriangle} color={dashboard.kpis.totalCreances > 0 ? 'orange' : 'green'}
                  alert={dashboard.kpis.totalCreances > 0}
                  sub="Montants non encore réglés" />
                <KpiCard label="Remboursements" value={fmtAmt(dashboard.kpis.totalRemb)}
                  icon={RefreshCw} color="red"
                  sub="Montants remboursés aux patients" />
              </div>

              {/* KPIs — ligne 2 : connectivité centres */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <KpiCard label="Centres actifs (30j)" value={dashboard.kpis.activeCenters}
                  icon={Wifi} color="green"
                  sub={`sur ${dashboard.kpis.totalCenters} centres`} />
                <KpiCard label="Centres en retard" value={dashboard.kpis.staleCenters}
                  icon={AlertTriangle} color="orange" alert={dashboard.kpis.staleCenters > 0}
                  sub={dashboard.kpis.staleCenters > 0 ? 'Aucune sync > 30 jours' : 'Tous à jour'} />
                <KpiCard label="Sans clé API" value={dashboard.kpis.noKeyCenters}
                  icon={WifiOff} color={dashboard.kpis.noKeyCenters > 0 ? 'red' : 'green'}
                  sub="Centres non connectés" />
              </div>

              {/* Courbe 30 jours + Répartition paiements */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
                  <SectionTitle><TrendingUp size={14} className="text-blue-500" /> Facturé / Ventes{filterFrom || filterTo ? ` — période sélectionnée` : ` — 30 derniers jours`}</SectionTitle>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={dashboard.timeline} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9CA3AF' }} interval={4} />
                      <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} tickFormatter={v => v === 0 ? '0' : (v / 1000).toFixed(0) + 'k'} />
                      <Tooltip
                        formatter={(v: number, name: string) => [
                          name === 'amount' ? fmtAmt(v) : v + ' transactions',
                          name === 'amount' ? 'Recettes' : 'Transactions',
                        ]}
                        labelStyle={{ fontWeight: 600 }}
                      />
                      <Legend formatter={v => v === 'amount' ? 'Recettes FCFA' : 'Transactions'} />
                      <Line type="monotone" dataKey="amount" stroke="#0EA5A4" strokeWidth={2} dot={false} name="amount" />
                      <Line type="monotone" dataKey="count"  stroke="#6366F1" strokeWidth={1.5} dot={false} name="count" strokeDasharray="4 2" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <SectionTitle>Mode de paiement</SectionTitle>
                  {dashboard.paymentTypes.length === 0 ? (
                    <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">Aucune donnée</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={dashboard.paymentTypes} dataKey="amount" nameKey="type"
                          cx="50%" cy="50%" outerRadius={75} label={({ type, percent }) => `${type} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {dashboard.paymentTypes.map((_, i) => (
                            <Cell key={i} fill={REGION_COLORS[i % REGION_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => fmtAmt(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Par région + Top centres */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <SectionTitle><Building2 size={14} className="text-indigo-500" /> Recettes par région</SectionTitle>
                  {dashboard.perRegion.length === 0 ? (
                    <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">Aucune donnée</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={Math.max(180, dashboard.perRegion.length * 42)}>
                      <BarChart data={dashboard.perRegion} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                        <XAxis type="number" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickFormatter={v => (v / 1000).toFixed(0) + 'k'} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#374151' }} width={110} />
                        <Tooltip formatter={(v: number) => fmtAmt(v)} />
                        <Bar dataKey="amount" radius={[0, 4, 4, 0]} name="Recettes">
                          {dashboard.perRegion.map((_, i) => <Cell key={i} fill={REGION_COLORS[i % REGION_COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <SectionTitle><BarChart2 size={14} className="text-teal-500" /> Top 10 centres</SectionTitle>
                  {dashboard.topCentres.length === 0 ? (
                    <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">Aucune donnée</div>
                  ) : (
                    <div className="space-y-1 overflow-y-auto max-h-[280px]">
                      {dashboard.topCentres.map((c, i) => {
                        const max     = dashboard.topCentres[0].amount
                        const pct     = max > 0 ? (c.amount / max) * 100 : 0
                        const isActive = selectedCenter?.id === c.id
                        return (
                          <button key={i} type="button"
                            onClick={() => openCenterDetail({ id: c.id, name: c.name, code: c.code, region: c.region })}
                            className={`w-full text-left flex items-center gap-3 px-2 py-1.5 rounded-lg transition-colors ${
                              isActive ? 'bg-teal-50 ring-1 ring-teal-300' : 'hover:bg-gray-50'
                            }`}
                          >
                            <span className="text-xs font-bold text-gray-400 w-4 flex-shrink-0">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-center mb-0.5">
                                <span className={`text-xs font-medium truncate ${isActive ? 'text-teal-700' : 'text-gray-700'}`}>{c.name}</span>
                                <span className="text-xs font-bold text-gray-900 ml-2 flex-shrink-0">{fmtAmt(c.amount)}</span>
                              </div>
                              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: pct + '%', background: REGION_COLORS[i % REGION_COLORS.length] }} />
                              </div>
                              <div className="text-[10px] text-gray-400 mt-0.5">{c.region} · {c.count} transactions</div>
                            </div>
                            <ChevronRight size={12} className={`flex-shrink-0 transition-transform ${isActive ? 'rotate-90 text-teal-500' : 'text-gray-300'}`} />
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Panneau de détail centre ── */}
              {selectedCenter && (
                <div ref={centerDetailRef} className="bg-white rounded-xl border border-teal-200 shadow-sm overflow-hidden">
                  {/* En-tête */}
                  <div className="flex items-center justify-between px-5 py-3 bg-teal-50 border-b border-teal-100">
                    <div className="flex items-center gap-2">
                      <Building2 size={15} className="text-teal-600" />
                      <span className="font-semibold text-sm text-teal-800">{selectedCenter.name}</span>
                      <span className="text-xs text-teal-500 font-mono">{selectedCenter.code}</span>
                      <span className="text-xs text-teal-400">· {selectedCenter.region}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {(filterFrom || filterTo) && (
                        <span className="text-xs text-teal-600 bg-teal-100 px-2 py-0.5 rounded">
                          {filterFrom && new Date(filterFrom).toLocaleDateString('fr-FR', { day:'2-digit', month:'short' })}
                          {filterFrom && filterTo && ' → '}
                          {filterTo && new Date(filterTo).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' })}
                        </span>
                      )}
                      <button onClick={() => setSelectedCenter(null)}
                        className="text-teal-400 hover:text-teal-700 text-xs px-2 py-1 rounded hover:bg-teal-100 transition-colors">
                        ✕ Fermer
                      </button>
                    </div>
                  </div>

                  {/* Corps */}
                  <div className="p-5">
                    {centerRapportsLoading ? (
                      <div className="flex items-center gap-2 text-sm text-gray-400 py-6 justify-center">
                        <Loader2 size={16} className="animate-spin" /> Chargement des rapports…
                      </div>
                    ) : centerRapports.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 py-8 text-gray-400 text-sm">
                        <FileText size={24} className="opacity-40" />
                        <span>Aucun rapport journalier reçu pour ce centre sur la période sélectionnée</span>
                        <span className="text-xs text-gray-300">Les rapports sont envoyés automatiquement par CleanSanté chaque jour</span>
                      </div>
                    ) : (
                      <>
                        {/* Synthèse de la période */}
                        {(() => {
                          const totalFact   = centerRapports.reduce((s, r) => s + Number((r.totRow as any).total_facture  || 0), 0)
                          const totalEnc    = centerRapports.reduce((s, r) => s + Number((r.totRow as any).total_encaisse || 0), 0)
                          const totalCrean  = centerRapports.reduce((s, r) => s + Number((r.openRow as any).total_restant  || 0), 0)
                          const totalRemb   = centerRapports.reduce((s, r) => s + Number((r.rembRow as any).total_rembourse || 0), 0)
                          const totalVentes = centerRapports.reduce((s, r) => s + Number((r.totRow as any).nb || 0), 0)
                          return (
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
                              {[
                                { label: 'Total facturé',  value: fmtAmt(totalFact),  color: 'text-gray-800' },
                                { label: 'Total encaissé', value: fmtAmt(totalEnc),   color: 'text-green-700' },
                                { label: 'Créances',       value: fmtAmt(totalCrean), color: 'text-orange-600' },
                                { label: 'Remboursements', value: fmtAmt(totalRemb),  color: 'text-red-500' },
                                { label: 'Nb ventes',      value: totalVentes.toLocaleString('fr-FR'), color: 'text-blue-600' },
                              ].map(k => (
                                <div key={k.label} className="bg-gray-50 rounded-xl p-3 text-center">
                                  <div className={`text-base font-bold ${k.color}`}>{k.value}</div>
                                  <div className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wide">{k.label}</div>
                                </div>
                              ))}
                            </div>
                          )
                        })()}

                        {/* Table des rapports journaliers */}
                        <div className="overflow-x-auto rounded-xl border border-gray-100">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-gray-100 text-gray-400">
                                <th className="text-left py-2 pr-4 font-medium">Date</th>
                                <th className="text-right py-2 pr-4 font-medium">Facturé</th>
                                <th className="text-right py-2 pr-4 font-medium">Encaissé</th>
                                <th className="text-right py-2 pr-4 font-medium">Créances</th>
                                <th className="text-right py-2 pr-4 font-medium">Remb.</th>
                                <th className="text-left py-2 pr-4 font-medium">Par service</th>
                                <th className="text-left py-2 pr-4 font-medium">Modes paiement</th>
                                <th className="py-2" />
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {centerRapports.slice(rapportPage * RAPPORT_PER, (rapportPage + 1) * RAPPORT_PER).map(r => {
                                const tot = r.totRow as any
                                const op  = r.openRow as any
                                const rem = r.rembRow as any
                                const modeLabel: Record<string, string> = {
                                  especes: 'Espèces', orange_money: 'Orange Money',
                                  mtn_money: 'MTN Money', virement: 'Virement', cheque: 'Chèque',
                                }
                                const topGroupe = (r.parGroupe as any[]).slice(0, 2)
                                const topPaiem  = (r.parPaiement as any[]).slice(0, 2)
                                return (
                                  <tr key={r.id} className="hover:bg-teal-50/30">
                                    <td className="py-2 pr-4 font-medium text-gray-700 whitespace-nowrap">
                                      {new Date(r.date).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                                    </td>
                                    <td className="py-2 pr-4 text-right font-semibold text-gray-800">{fmtAmt(tot.total_facture)}</td>
                                    <td className="py-2 pr-4 text-right font-semibold text-green-700">{fmtAmt(tot.total_encaisse)}</td>
                                    <td className="py-2 pr-4 text-right text-orange-600">{op.total_restant > 0 ? fmtAmt(op.total_restant) : '—'}</td>
                                    <td className="py-2 pr-4 text-right text-red-500">{rem.total_rembourse > 0 ? fmtAmt(rem.total_rembourse) : '—'}</td>
                                    <td className="py-2 pr-4">
                                      {topGroupe.map((g: any) => (
                                        <div key={g.groupe} className="text-gray-600 truncate max-w-[140px]">
                                          <span className="font-medium">{g.groupe}</span> {fmtAmt(g.total)}
                                        </div>
                                      ))}
                                      {(r.parGroupe as any[]).length > 2 && <div className="text-gray-300">+{(r.parGroupe as any[]).length - 2} autres</div>}
                                    </td>
                                    <td className="py-2 pr-4">
                                      {topPaiem.map((p: any) => (
                                        <div key={p.mode} className="flex items-center gap-1 text-gray-600">
                                          <Banknote size={9} className="text-gray-300" />
                                          {modeLabel[p.mode] || p.mode} — {fmtAmt(p.total)}
                                        </div>
                                      ))}
                                    </td>
                                    <td className="py-2">
                                      <button
                                        onClick={() => handlePrint(r)}
                                        title="Imprimer ce rapport"
                                        className="p-1.5 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                                      >
                                        <Printer size={14} />
                                      </button>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                          <Paginator page={rapportPage} total={centerRapports.length} perPage={RAPPORT_PER} onChange={setRapportPage} />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ CLÉS API ═══ */}
          {tab === 'keys' && (
            <div className="space-y-4">
              <FilterBar />
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="w-8 px-2 py-3" />
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Centre de santé</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Région</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Statut clé</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Dernière sync</th>
                      <th className="text-center px-4 py-3 font-medium text-gray-600">Syncs</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {facilityRows.slice(keysPage * KEYS_PER, (keysPage + 1) * KEYS_PER).map(f => {
                      const days      = daysSince(f.apiKey?.lastUsedAt ?? null)
                      const isStale   = days !== null && days > 7
                      const isOpen    = expandedFacility === f.id
                      const rapports  = rapportsCache[f.id] ?? []
                      const isLoadingR = rapportsLoading === f.id
                      return (
                        <>
                          <tr key={f.id}
                            className={`border-b border-gray-100 cursor-pointer transition-colors ${isOpen ? 'bg-blue-50/40' : 'hover:bg-gray-50'}`}
                            onClick={() => toggleFacility(f.id)}
                          >
                            <td className="w-8 px-3 py-3 text-gray-400">
                              {isOpen
                                ? <ChevronDown size={15} className="text-blue-500" />
                                : <ChevronRight size={15} />}
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900">{f.name}</div>
                              <div className="text-xs text-gray-400 font-mono">{f.code}</div>
                            </td>
                            <td className="px-4 py-3 text-gray-600 text-sm">{f.region.name}</td>
                            <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                              {f.apiKey?.isActive ? (
                                <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 px-2 py-0.5 rounded-full text-xs font-medium">
                                  <Wifi size={11} /> Active — <span className="font-mono">{f.apiKey.keyPreview}</span>
                                </span>
                              ) : f.apiKey ? (
                                <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-2 py-0.5 rounded-full text-xs font-medium">
                                  <WifiOff size={11} /> Révoquée
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full text-xs">
                                  Aucune clé
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {f.apiKey?.lastUsedAt ? (
                                <span className={`flex items-center gap-1 text-xs ${isStale ? 'text-orange-600' : 'text-gray-500'}`}>
                                  <Clock size={11} />
                                  {fmtDate(f.apiKey.lastUsedAt)}
                                  {isStale && <span className="ml-1 bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-[10px] font-bold">{days}j</span>}
                                </span>
                              ) : <span className="text-xs text-gray-400">Jamais synchronisé</span>}
                            </td>
                            <td className="px-4 py-3 text-center font-medium text-gray-700">{f._count.care2xSyncs}</td>
                            <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-2">
                                <button onClick={() => generateKey(f)} disabled={actionLoading === f.id}
                                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                                  {actionLoading === f.id ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                                  {f.apiKey?.isActive ? 'Regénérer' : 'Générer'}
                                </button>
                                {f.apiKey?.isActive && (
                                  <button onClick={() => revokeKey(f)} disabled={actionLoading === f.id + '_rev'}
                                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50">
                                    {actionLoading === f.id + '_rev' ? <Loader2 size={12} className="animate-spin" /> : <ShieldOff size={12} />}
                                    Révoquer
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>

                          {/* ── Ligne dépliée : rapports journaliers ── */}
                          {isOpen && (
                            <tr key={f.id + '_rapports'} className="border-b border-gray-100 bg-blue-50/20">
                              <td colSpan={7} className="px-6 py-4">
                                {isLoadingR ? (
                                  <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
                                    <Loader2 size={13} className="animate-spin" /> Chargement des rapports…
                                  </div>
                                ) : rapports.length === 0 ? (
                                  <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
                                    <FileText size={13} /> Aucun rapport journalier reçu pour ce centre
                                  </div>
                                ) : (
                                  <div>
                                    <div className="flex items-center gap-2 mb-3">
                                      <FileText size={13} className="text-blue-500" />
                                      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                        Rapports journaliers — {rapports.length} dernier{rapports.length > 1 ? 's' : ''}
                                      </span>
                                    </div>
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-xs">
                                        <thead>
                                          <tr className="text-gray-400 border-b border-gray-100">
                                            <th className="text-left py-1.5 pr-4 font-medium">Date</th>
                                            <th className="text-right py-1.5 pr-4 font-medium">Total facturé</th>
                                            <th className="text-right py-1.5 pr-4 font-medium">Encaissé</th>
                                            <th className="text-right py-1.5 pr-4 font-medium">Créances</th>
                                            <th className="text-right py-1.5 pr-4 font-medium">Remboursés</th>
                                            <th className="text-left py-1.5 font-medium">Modes principaux</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                          {rapports.map(r => {
                                            const tot = r.totRow as any
                                            const op  = r.openRow as any
                                            const rem = r.rembRow as any
                                            const paiements = (r.parPaiement as any[]).slice(0, 2)
                                            const modeLabel: Record<string, string> = {
                                              especes: 'Espèces', orange_money: 'Orange Money',
                                              mtn_money: 'MTN Money', virement: 'Virement', cheque: 'Chèque',
                                            }
                                            return (
                                              <tr key={r.id} className="hover:bg-white/60">
                                                <td className="py-2 pr-4 font-medium text-gray-700">
                                                  {new Date(r.date).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                </td>
                                                <td className="py-2 pr-4 text-right text-gray-800 font-semibold">{fmtAmt(tot.total_facture)}</td>
                                                <td className="py-2 pr-4 text-right text-green-700 font-semibold">{fmtAmt(tot.total_encaisse)}</td>
                                                <td className="py-2 pr-4 text-right text-orange-600">{fmtAmt(op.total_restant)}</td>
                                                <td className="py-2 pr-4 text-right text-red-500">{rem.total_rembourse > 0 ? fmtAmt(rem.total_rembourse) : '—'}</td>
                                                <td className="py-2">
                                                  <div className="flex gap-1 flex-wrap">
                                                    {paiements.map((p: any) => (
                                                      <span key={p.mode} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] text-gray-600">
                                                        <Banknote size={9} /> {modeLabel[p.mode] || p.mode} {fmtAmt(p.total)}
                                                      </span>
                                                    ))}
                                                    {(r.parPaiement as any[]).length > 2 && (
                                                      <span className="text-[10px] text-gray-400">+{(r.parPaiement as any[]).length - 2}</span>
                                                    )}
                                                  </div>
                                                </td>
                                              </tr>
                                            )
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </>
                      )
                    })}
                    {facilityRows.length === 0 && (
                      <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">Aucune facility active</td></tr>
                    )}
                  </tbody>
                </table>
                <Paginator page={keysPage} total={facilityRows.length} perPage={KEYS_PER} onChange={setKeysPage} />
              </div>
            </div>
          )}

          {/* ═══ HISTORIQUE SYNCS ═══ */}
          {tab === 'syncs' && (
            <div className="space-y-4">
              <FilterBar />

              {/* Résumé rapide */}
              {syncs.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-blue-700">{syncs.length}</div>
                    <div className="text-xs text-blue-500 mt-1">Batchs reçus</div>
                  </div>
                  <div className="bg-teal-50 border border-teal-100 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-teal-700">
                      {fmtAmt(syncs.reduce((s, x) => s + Number(x.totalAmount), 0))}
                    </div>
                    <div className="text-xs text-teal-500 mt-1">Total recettes reçues</div>
                  </div>
                  <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-purple-700">
                      {syncs.reduce((s, x) => s + x.entriesCount, 0).toLocaleString('fr-FR')}
                    </div>
                    <div className="text-xs text-purple-500 mt-1">Transactions reçues</div>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Centre</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Région</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Reçu le</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Période couverte</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Transactions</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {syncs.slice(syncsPage * SYNCS_PER, (syncsPage + 1) * SYNCS_PER).map(s => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{s.facility.name}</div>
                          <div className="text-xs text-gray-400 font-mono">{s.facility.code}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-sm">{s.facility.region.name}</td>
                        <td className="px-4 py-3 text-gray-600">{fmtDate(s.receivedAt)}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {fmtDate(s.periodStart)} → {fmtDate(s.periodEnd)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">{s.entriesCount}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmtAmt(Number(s.totalAmount))}</td>
                      </tr>
                    ))}
                    {syncs.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">Aucune synchronisation dans la période sélectionnée</td></tr>
                    )}
                  </tbody>
                </table>
                <Paginator page={syncsPage} total={syncs.length} perPage={SYNCS_PER} onChange={setSyncsPage} />
              </div>
            </div>
          )}

          {/* ═══ VERSIONS ═══ */}
          {tab === 'versions' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Upload size={16} /> Publier une nouvelle version
                </h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Numéro de version <span className="text-red-500">*</span></label>
                    <input value={uploadVersion} onChange={e => setUploadVersion(e.target.value)} placeholder="ex: 1.1.0"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fichier .exe <span className="text-red-500">*</span></label>
                    <input type="file" accept=".exe" onChange={e => setUploadFile(e.target.files?.[0] || null)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes de version</label>
                  <textarea value={uploadNotes} onChange={e => setUploadNotes(e.target.value)} rows={2}
                    placeholder="Corrections, nouvelles fonctionnalités…"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none" />
                </div>
                {uploadFile && <p className="text-xs text-gray-500 mb-3">{uploadFile.name} ({(uploadFile.size / 1024 / 1024).toFixed(1)} Mo)</p>}
                <button onClick={uploadVersion_} disabled={uploading || !uploadVersion || !uploadFile}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  {uploading ? 'Upload…' : 'Publier'}
                </button>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Version</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Notes</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Taille</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Publiée le</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Statut</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {versions.map(v => (
                      <tr key={v.id} className={`hover:bg-gray-50 ${v.isActive ? 'bg-green-50/40' : ''}`}>
                        <td className="px-4 py-3 font-mono font-semibold text-gray-900">{v.version}</td>
                        <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{v.releaseNotes || '—'}</td>
                        <td className="px-4 py-3 text-gray-500">{(v.fileSize / 1024 / 1024).toFixed(1)} Mo</td>
                        <td className="px-4 py-3 text-gray-500">{fmtDate(v.createdAt)}</td>
                        <td className="px-4 py-3">
                          {v.isActive
                            ? <span className="inline-flex items-center gap-1 text-green-700 bg-green-100 px-2 py-0.5 rounded-full text-xs font-medium"><Star size={10} /> Active</span>
                            : <span className="text-xs text-gray-400">Inactive</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            {!v.isActive && (
                              <button onClick={() => activateVersion(v)} disabled={actionLoading === v.id + '_act'}
                                className="text-xs px-2.5 py-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 disabled:opacity-50">Activer</button>
                            )}
                            <button onClick={() => deleteVersion(v)} disabled={actionLoading === v.id}
                              className="text-xs p-1.5 rounded-lg text-red-400 hover:bg-red-50 disabled:opacity-50">
                              {actionLoading === v.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {versions.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">Aucune version publiée</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal clé générée */}
      {newKey && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setNewKey(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-xl"><KeyRound className="text-green-600" size={22} /></div>
              <div>
                <h2 className="font-semibold text-gray-900">Clé API générée</h2>
                <p className="text-sm text-gray-500">{newKey.facilityName}</p>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-sm text-amber-800">
              <strong>Important :</strong> cette clé ne sera affichée qu'une seule fois. Copiez-la immédiatement.
            </div>
            <div className="flex items-center gap-2 bg-gray-900 rounded-xl px-4 py-3 mb-4">
              <code className="flex-1 text-green-400 text-sm font-mono break-all">{newKey.key}</code>
              <button onClick={() => { navigator.clipboard.writeText(newKey.key).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }) }}
                className="flex-shrink-0 p-2 rounded-lg hover:bg-gray-700 text-gray-300">
                {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
              </button>
            </div>
            <button onClick={() => setNewKey(null)}
              className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700">
              J'ai copié la clé, fermer
            </button>
          </div>
        </div>
      )}

      {showResetModal && (
        <ResetDbModal onClose={() => setShowResetModal(false)} />
      )}
    </div>
  )
}
