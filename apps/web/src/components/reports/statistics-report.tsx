'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Printer, Download, Loader2, CheckCircle2, XCircle, Clock, AlertCircle, TrendingUp, TrendingDown, Minus, Lock } from 'lucide-react'
import { MONTHS_FR } from '@care-connekt/shared'
import { toast } from 'sonner'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

// ── Types ──────────────────────────────────────────────────────────────────────
type ReportTab = 'category' | 'consolidated' | 'comparison' | 'completeness'

const ADMIN_ROLES    = ['SUPER_ADMIN', 'DATA_ADMIN', 'DIRECTION', 'REGIONAL_DIRECTOR', 'CONTROLEUR', 'CONTROLEUR_REGIONAL']
const FAC_SCOPED     = ['FACILITY_CHIEF', 'FINANCIER', 'CAISSIER']
const REGION_SCOPED  = ['REGIONAL_DIRECTOR', 'CONTROLEUR_REGIONAL']

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  DRAFT:     { label: 'Brouillon', color: 'text-gray-500  bg-gray-50  border-gray-200',       icon: Clock },
  SUBMITTED: { label: 'Soumis',   color: 'text-blue-600  bg-blue-50  border-blue-200',        icon: Clock },
  VALIDATED: { label: 'Validé',   color: 'text-emerald-600 bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  REJECTED:  { label: 'Rejeté',  color: 'text-red-600   bg-red-50   border-red-200',          icon: XCircle },
}

const YEAR_COLORS  = ['#14b8a6', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444']
const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = [CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1]

// ── Contexte utilisateur ───────────────────────────────────────────────────────
interface UserCtx {
  role: string
  facilityId?: string
  facilityName?: string
  regionId?: string
  isFacilityScoped: boolean   // DATA_MANAGER, FACILITY_CHIEF, FINANCIER, CAISSIER
  isRegionScoped: boolean     // REGIONAL_DIRECTOR, CONTROLEUR_REGIONAL
  isAdmin: boolean
}

// ── Composant principal ────────────────────────────────────────────────────────
export function StatisticsReport() {
  const { data: session } = useSession()
  const user = session?.user as any

  const ctx: UserCtx = {
    role:        user?.role || '',
    facilityId:  user?.facilityId,
    facilityName:user?.facilityName,
    regionId:    user?.regionId,
    // DATA_MANAGER avec facilityId → scopé FOSA
    // DATA_MANAGER avec regionId seulement → scopé région (comme un directeur régional)
    isFacilityScoped:
      FAC_SCOPED.includes(user?.role) ||
      (user?.role === 'DATA_MANAGER' && !!user?.facilityId),
    isRegionScoped:
      REGION_SCOPED.includes(user?.role) ||
      (user?.role === 'DATA_MANAGER' && !!user?.regionId && !user?.facilityId),
    isAdmin: ADMIN_ROLES.includes(user?.role),
  }

  const [tab, setTab] = useState<ReportTab>('category')

  const tabs: { key: ReportTab; label: string; adminOnly?: boolean }[] = [
    { key: 'category',     label: 'Par catégorie' },
    { key: 'consolidated', label: 'Fiche FOSA' },
    { key: 'comparison',   label: 'Comparaison annuelle' },
    { key: 'completeness', label: 'Taux de complétude', adminOnly: true },
  ]

  return (
    <div className="space-y-5">
      {/* Bandeau de contexte pour les rôles restreints */}
      {(ctx.isFacilityScoped || ctx.isRegionScoped) && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-brand-50 dark:bg-brand-900/10 border border-brand-100 dark:border-brand-800/30 rounded-xl text-sm text-brand-700 dark:text-brand-400">
          <Lock className="w-4 h-4 flex-shrink-0" />
          {ctx.isFacilityScoped
            ? <span>Rapports limités à votre formation sanitaire.</span>
            : <span>Rapports limités à votre région.</span>}
        </div>
      )}

      <div className="flex flex-wrap gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        {tabs.filter((t) => !t.adminOnly || ctx.isAdmin).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              tab === t.key
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'category'     && <CategoryReport ctx={ctx} />}
      {tab === 'consolidated' && <ConsolidatedReport ctx={ctx} />}
      {tab === 'comparison'   && <ComparisonReport ctx={ctx} />}
      {tab === 'completeness' && ctx.isAdmin && <CompletenessReport ctx={ctx} />}
    </div>
  )
}

// ── Helpers communs ────────────────────────────────────────────────────────────
function FilterBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end gap-3 p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  )
}

function SectionHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
      <div>
        <h3 className="font-bold text-gray-900 dark:text-white">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  )
}

const inputCls    = 'px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500'
const btnPrimary  = 'inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition shadow-sm'
const btnPrint    = 'inline-flex items-center gap-2 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg transition'
const btnCSV      = 'inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition'

function downloadCSV(filename: string, rows: string[][]) {
  const bom = '﻿'
  const csv = bom + rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename })
  a.click(); URL.revokeObjectURL(url)
}

function Empty() {
  return (
    <div className="py-16 text-center text-gray-400 text-sm">
      Aucune donnée — ajustez les filtres et cliquez sur <strong>Générer</strong>.
    </div>
  )
}

// ── Hooks partagés ─────────────────────────────────────────────────────────────
function useReferenceData(ctx: UserCtx) {
  const [categories,  setCategories]  = useState<string[]>([])
  const [facilities,  setFacilities]  = useState<any[]>([])
  const [regions,     setRegions]     = useState<any[]>([])

  useEffect(() => {
    fetch('/api/admin/indicators').then((r) => r.json()).then((d) => {
      const cats = [...new Set<string>((d.data || []).map((i: any) => i.category))].sort()
      setCategories(cats)
    }).catch(() => {})
    // Régions : seulement pour admin ou région-scoped (pour filtrer les FOSA)
    if (!ctx.isFacilityScoped) {
      fetch('/api/regions').then((r) => r.json()).then((d) => setRegions(d.data || [])).catch(() => {})
    }
    // FOSA : admin et région-scoped voient la liste pour filtrer
    if (!ctx.isFacilityScoped) {
      fetch('/api/facilities?limit=200').then((r) => r.json()).then((d) => setFacilities(d.data || [])).catch(() => {})
    }
  }, [ctx.isFacilityScoped])

  return { categories, facilities, regions }
}

// ── Rapport 1 : Par catégorie ──────────────────────────────────────────────────
function CategoryReport({ ctx }: { ctx: UserCtx }) {
  const { categories, facilities, regions } = useReferenceData(ctx)
  const [data,        setData]        = useState<any>(null)
  const [loading,     setLoading]     = useState(false)

  const now = new Date()
  const [category,   setCategory]   = useState('')
  const [monthFrom,  setMonthFrom]  = useState(String(now.getMonth() + 1))
  const [monthTo,    setMonthTo]    = useState(String(now.getMonth() + 1))
  const [yearFrom,   setYearFrom]   = useState(String(now.getFullYear()))
  const [regionId,   setRegionId]   = useState('')
  const [facilityId, setFacilityId] = useState('')

  useEffect(() => {
    if (categories.length > 0 && !category) setCategory(categories[0])
  }, [categories])

  const load = useCallback(() => {
    if (!category) return
    setLoading(true)
    const p = new URLSearchParams({ type: 'category', category, monthFrom, monthTo, yearFrom, yearTo: yearFrom })
    // Pour les roles scopés, l'API ignore ces params et utilise le scope session
    if (!ctx.isFacilityScoped && !ctx.isRegionScoped && facilityId) p.set('facilityId', facilityId)
    else if (!ctx.isFacilityScoped && regionId) p.set('regionId', regionId)
    fetch(`/api/reports/statistics?${p}`).then((r) => r.json())
      .then((d) => { setData(d.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [category, monthFrom, monthTo, yearFrom, regionId, facilityId, ctx])

  const exportCSV = () => {
    if (!data) return
    const period = monthFrom === monthTo ? `${MONTHS_FR[Number(monthFrom)-1]} ${yearFrom}` : `${MONTHS_FR[Number(monthFrom)-1]}-${MONTHS_FR[Number(monthTo)-1]} ${yearFrom}`
    const header = ['Code', 'Indicateur', 'Unité', 'Obligatoire', ...data.facilities.map((f: any) => f.name), 'TOTAL']
    const rows   = data.table.map((row: any) => {
      const vals  = data.facilities.map((f: any) => row[f.id] ?? null)
      const total = vals.filter((v: any) => v !== null).reduce((s: number, v: number) => s + v, 0)
      return [row.code, row.label, row.unit || '', row.isRequired ? 'Oui' : 'Non', ...vals.map((v: any) => v ?? ''), total]
    })
    downloadCSV(`stat-${category.replace(/\s/g, '-')}-${period}.csv`, [header, ...rows])
  }

  const print = () => {
    const w = window.open('', '_blank')
    if (!w || !data) return
    const period = monthFrom === monthTo
      ? `${MONTHS_FR[Number(monthFrom)-1]} ${yearFrom}`
      : `${MONTHS_FR[Number(monthFrom)-1]} — ${MONTHS_FR[Number(monthTo)-1]} ${yearFrom}`
    w.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/>
      <title>Rapport ${category}</title>
      <style>
        body{font-family:Arial,sans-serif;font-size:10px;margin:20px;color:#1e293b}
        h1{font-size:15px;margin-bottom:2px;color:#0f766e}
        .sub{color:#64748b;font-size:10px;margin-bottom:14px}
        table{width:100%;border-collapse:collapse}
        th{background:#0f766e;color:#fff;padding:5px 8px;text-align:left;font-size:10px;font-weight:700}
        th.num,td.num{text-align:right}
        td{padding:4px 8px;border-bottom:1px solid #e2e8f0;font-size:10px}
        tr:nth-child(even) td{background:#f8fafc}
        .req{font-weight:700;color:#0f766e}
        .total-col{background:#eff6ff;font-weight:700;color:#1d4ed8}
        @media print{body{margin:0}}
      </style></head><body>
      <h1>Rapport statistique — ${category}</h1>
      <div class="sub">Période : ${period} · ${data.facilities.length} formation(s)</div>
      <table><thead><tr>
        <th style="width:60px">Code</th><th>Indicateur</th><th style="width:50px">Unité</th>
        ${data.facilities.map((f: any) => `<th class="num">${f.name}</th>`).join('')}
        <th class="num total-col">TOTAL</th>
      </tr></thead><tbody>
        ${data.table.map((row: any) => {
          const vals  = data.facilities.map((f: any) => row[f.id])
          const total = vals.filter((v: any) => v !== null).reduce((s: number, v: number) => s + v, 0)
          return `<tr>
            <td style="font-family:monospace;color:#94a3b8">${row.code}</td>
            <td class="${row.isRequired ? 'req' : ''}">${row.label}</td>
            <td style="color:#94a3b8">${row.unit || '—'}</td>
            ${vals.map((v: any) => `<td class="num">${v !== null && v !== undefined ? Number(v).toLocaleString('fr-FR') : '—'}</td>`).join('')}
            <td class="num total-col">${vals.some((v: any) => v !== null) ? Number(total).toLocaleString('fr-FR') : '—'}</td>
          </tr>`
        }).join('')}
      </tbody></table>
      <script>window.onload=()=>{window.print();window.close()}</script>
      </body></html>`)
    w.document.close()
  }

  const totals = data
    ? data.table.map((row: any) => {
        const vals = data.facilities.map((f: any) => row[f.id]).filter((v: any) => v !== null)
        return vals.reduce((s: number, v: number) => s + v, 0)
      })
    : []

  const visibleFacilities = facilityId
    ? facilities.filter((f: any) => f.id === facilityId)
    : regionId
      ? facilities.filter((f: any) => f.region?.id === regionId)
      : facilities

  return (
    <div className="space-y-4">
      <FilterBar>
        <Field label="Catégorie">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="De (mois)">
          <select value={monthFrom} onChange={(e) => setMonthFrom(e.target.value)} className={inputCls}>
            {MONTHS_FR.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
        </Field>
        <Field label="À (mois)">
          <select value={monthTo} onChange={(e) => setMonthTo(e.target.value)} className={inputCls}>
            {MONTHS_FR.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
        </Field>
        <Field label="Année">
          <select value={yearFrom} onChange={(e) => setYearFrom(e.target.value)} className={inputCls}>
            {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </Field>

        {/* Filtres géographiques : admin seulement */}
        {!ctx.isFacilityScoped && !ctx.isRegionScoped && regions.length > 0 && (
          <Field label="Région">
            <select value={regionId} onChange={(e) => { setRegionId(e.target.value); setFacilityId('') }} className={inputCls}>
              <option value="">Toutes</option>
              {regions.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </Field>
        )}
        {!ctx.isFacilityScoped && facilities.length > 0 && (
          <Field label="FOSA">
            <select value={facilityId} onChange={(e) => setFacilityId(e.target.value)} className={inputCls}>
              <option value="">Toutes</option>
              {visibleFacilities.map((f: any) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </Field>
        )}

        <button onClick={load} disabled={loading || !category} className={btnPrimary}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Générer
        </button>
      </FilterBar>

      {data ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <SectionHeader
            title={data.category}
            subtitle={`${data.table.length} indicateurs · ${data.facilities.length} formation(s)`}
            actions={<><button onClick={exportCSV} className={btnCSV}><Download className="w-3 h-3" /> CSV</button><button onClick={print} className={btnPrint}><Printer className="w-3 h-3" /> Imprimer</button></>}
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 text-xs uppercase text-gray-500">
                  <th className="text-left px-4 py-3 font-semibold w-24">Code</th>
                  <th className="text-left px-4 py-3 font-semibold">Indicateur</th>
                  <th className="text-left px-4 py-3 font-semibold w-16">Unité</th>
                  {data.facilities.map((f: any) => (
                    <th key={f.id} className="text-right px-4 py-3 font-semibold max-w-[110px]">
                      <span className="block truncate" title={f.name}>{f.name}</span>
                    </th>
                  ))}
                  <th className="text-right px-4 py-3 font-semibold text-brand-600 bg-brand-50 dark:bg-brand-900/10">TOTAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {data.table.map((row: any, idx: number) => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-400">{row.code}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-sm ${row.isRequired ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                        {row.label}
                        {row.isRequired && <span className="ml-1 text-brand-500 text-xs">*</span>}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-400">{row.unit || '—'}</td>
                    {data.facilities.map((f: any) => (
                      <td key={f.id} className="px-4 py-2.5 text-right font-mono text-sm">
                        {row[f.id] !== null && row[f.id] !== undefined
                          ? <span className="font-semibold text-gray-900 dark:text-white">{Number(row[f.id]).toLocaleString('fr-FR')}</span>
                          : <span className="text-gray-300 dark:text-gray-600">—</span>}
                      </td>
                    ))}
                    <td className="px-4 py-2.5 text-right font-mono text-sm bg-brand-50/50 dark:bg-brand-900/5">
                      {totals[idx] > 0
                        ? <span className="font-bold text-brand-700 dark:text-brand-400">{Number(totals[idx]).toLocaleString('fr-FR')}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : !loading ? <Empty /> : null}
    </div>
  )
}

// ── Rapport 2 : Fiche consolidée FOSA ─────────────────────────────────────────
function ConsolidatedReport({ ctx }: { ctx: UserCtx }) {
  const [facilities,  setFacilities]  = useState<any[]>([])
  const [data,        setData]        = useState<any>(null)
  const [loading,     setLoading]     = useState(false)
  const now = new Date()

  // Si scopé à une FOSA, on pré-sélectionne la sienne
  const [facilityId, setFacilityId] = useState(ctx.isFacilityScoped ? (ctx.facilityId || '') : '')
  const [month,      setMonth]      = useState(String(now.getMonth() + 1))
  const [year,       setYear]       = useState(String(now.getFullYear()))

  useEffect(() => {
    if (!ctx.isFacilityScoped) {
      fetch('/api/facilities?limit=200').then((r) => r.json())
        .then((d) => {
          setFacilities(d.data || [])
          if (!facilityId && d.data?.length > 0) setFacilityId(d.data[0].id)
        })
        .catch(() => {})
    }
  }, [ctx.isFacilityScoped])

  const load = useCallback(() => {
    if (!facilityId && !ctx.isFacilityScoped) return
    setLoading(true)
    const p = new URLSearchParams({ type: 'consolidated', month, yearFrom: year })
    // Pour les scopés, l'API utilise userFacilityId ; on passe quand même l'id pour la fiche consolidated
    if (facilityId) p.set('facilityId', facilityId)
    else if (ctx.facilityId) p.set('facilityId', ctx.facilityId)
    fetch(`/api/reports/statistics?${p}`).then((r) => r.json())
      .then((d) => { setData(d.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [facilityId, month, year, ctx])

  const exportCSV = () => {
    if (!data) return
    const rows: string[][] = [['Catégorie', 'Code', 'Indicateur', 'Unité', 'Valeur']]
    for (const cat of data.byCategory) {
      for (const ind of cat.indicators) {
        rows.push([cat.category, ind.code, ind.label, ind.unit || '', ind.value !== null ? String(ind.value) : ''])
      }
    }
    downloadCSV(`fiche-${data.facility?.code}-${year}-${month}.csv`, rows)
  }

  const print = () => {
    if (!data) return
    const w = window.open('', '_blank')
    if (!w) return
    const st = data.sheet
    w.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/>
      <title>Fiche ${data.facility?.name}</title>
      <style>
        body{font-family:Arial,sans-serif;font-size:10px;margin:20px;color:#1e293b}
        .header{display:flex;justify-content:space-between;margin-bottom:14px;padding-bottom:10px;border-bottom:2px solid #0f766e}
        h1{font-size:14px;margin:0;color:#0f766e} .sub{color:#64748b;font-size:9px;margin-top:2px}
        .meta{text-align:right;font-size:9px;color:#64748b}
        .cat{background:#0f766e;color:#fff;padding:3px 8px;font-weight:700;font-size:10px;margin-top:10px}
        table{width:100%;border-collapse:collapse}
        th{background:#f1f5f9;padding:4px 8px;text-align:left;font-weight:700;color:#475569;font-size:9px}
        td{padding:3px 8px;border-bottom:1px solid #e2e8f0;font-size:9px}
        .num{text-align:right;font-weight:700;color:#0f766e} .req{font-weight:700}
        .badge{display:inline-block;padding:1px 5px;border-radius:3px;font-size:8px;font-weight:700}
        .v{background:#dcfce7;color:#16a34a} .s{background:#dbeafe;color:#1d4ed8}
        @media print{body{margin:0}}
      </style></head><body>
      <div class="header">
        <div><h1>Fiche statistique mensuelle</h1>
          <div class="sub">${data.facility?.name} (${data.facility?.code}) — ${data.facility?.region?.name}</div>
        </div>
        <div class="meta">
          Période : ${MONTHS_FR[Number(month)-1]} ${year}<br/>
          ${st ? `Réf : ${st.reference}<br/>Saisie par : ${st.dataManager || '—'}<br/><span class="badge ${st.status === 'VALIDATED' ? 'v' : 's'}">${st.status}</span>` : '<span style="color:#ef4444">Non soumise</span>'}
        </div>
      </div>
      ${data.byCategory.map((cat: any) => `
        <div class="cat">${cat.category}</div>
        <table><thead><tr><th>Code</th><th>Indicateur</th><th>Unité</th><th style="text-align:right">Valeur</th></tr></thead>
        <tbody>${cat.indicators.map((i: any) => `<tr>
          <td style="font-family:monospace;color:#94a3b8">${i.code}</td>
          <td class="${i.isRequired ? 'req' : ''}">${i.label}</td>
          <td style="color:#94a3b8">${i.unit || '—'}</td>
          <td class="num">${i.value !== null ? Number(i.value).toLocaleString('fr-FR') : '—'}</td>
        </tr>`).join('')}</tbody></table>
      `).join('')}
      <script>window.onload=()=>{window.print();window.close()}</script>
      </body></html>`)
    w.document.close()
  }

  return (
    <div className="space-y-4">
      <FilterBar>
        {/* Sélecteur FOSA : masqué si scopé à sa propre FOSA */}
        {ctx.isFacilityScoped ? (
          <Field label="Formation sanitaire">
            <div className={`${inputCls} flex items-center gap-2 text-gray-500`}>
              <Lock className="w-3.5 h-3.5" />
              {ctx.facilityName || 'Votre formation'}
            </div>
          </Field>
        ) : (
          <Field label="Formation sanitaire">
            <select value={facilityId} onChange={(e) => setFacilityId(e.target.value)} className={inputCls}>
              <option value="">— Sélectionner —</option>
              {facilities.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </Field>
        )}
        <Field label="Mois">
          <select value={month} onChange={(e) => setMonth(e.target.value)} className={inputCls}>
            {MONTHS_FR.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
        </Field>
        <Field label="Année">
          <select value={year} onChange={(e) => setYear(e.target.value)} className={inputCls}>
            {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </Field>
        <button onClick={load} disabled={loading || (!facilityId && !ctx.isFacilityScoped)} className={btnPrimary}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Générer
        </button>
      </FilterBar>

      {data ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">{data.facility?.name}</h3>
              <p className="text-xs text-gray-500">{MONTHS_FR[Number(month)-1]} {year} · {data.facility?.region?.name}</p>
            </div>
            <div className="flex items-center gap-3">
              {data.sheet ? (
                <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${STATUS_CONFIG[data.sheet.status]?.color}`}>
                  {STATUS_CONFIG[data.sheet.status]?.label}
                </span>
              ) : (
                <span className="text-xs px-2.5 py-1 rounded-full bg-orange-50 text-orange-600 border border-orange-200 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Non soumise
                </span>
              )}
              <button onClick={exportCSV} className={btnCSV}><Download className="w-3 h-3" /> CSV</button>
              <button onClick={print} className={btnPrint}><Printer className="w-3 h-3" /> Imprimer</button>
            </div>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {data.byCategory.map((cat: any) => (
              <div key={cat.category}>
                <div className="px-5 py-2 bg-brand-50 dark:bg-brand-900/10">
                  <span className="text-xs font-bold text-brand-700 dark:text-brand-400 uppercase tracking-wider">{cat.category}</span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 border-b border-gray-50 dark:border-gray-800">
                      <th className="text-left px-5 py-2 font-medium w-28">Code</th>
                      <th className="text-left px-5 py-2 font-medium">Indicateur</th>
                      <th className="text-left px-5 py-2 font-medium w-16">Unité</th>
                      <th className="text-right px-5 py-2 font-medium w-32">Valeur</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                    {cat.indicators.map((ind: any) => (
                      <tr key={ind.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                        <td className="px-5 py-2.5 font-mono text-xs text-gray-400">{ind.code}</td>
                        <td className="px-5 py-2.5">
                          <span className={ind.isRequired ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}>
                            {ind.label}
                            {ind.isRequired && <span className="ml-1 text-brand-500 text-xs">*</span>}
                          </span>
                        </td>
                        <td className="px-5 py-2.5 text-xs text-gray-400">{ind.unit || '—'}</td>
                        <td className="px-5 py-2.5 text-right font-mono">
                          {ind.value !== null
                            ? <span className="font-bold text-gray-900 dark:text-white text-sm">{Number(ind.value).toLocaleString('fr-FR')}</span>
                            : <span className="text-gray-300 dark:text-gray-600">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      ) : !loading ? <Empty /> : null}
    </div>
  )
}

// ── Rapport 3 : Comparaison inter-annuelle ─────────────────────────────────────
function ComparisonReport({ ctx }: { ctx: UserCtx }) {
  const { categories, facilities, regions } = useReferenceData(ctx)
  const [data,        setData]        = useState<any>(null)
  const [loading,     setLoading]     = useState(false)
  const [chartView,   setChartView]   = useState<'monthly' | 'facilities'>('monthly')

  const now = new Date()
  const [category,      setCategory]      = useState('')
  const [monthFrom,     setMonthFrom]     = useState('1')
  const [monthTo,       setMonthTo]       = useState('12')
  const [selectedYears, setSelectedYears] = useState<number[]>([now.getFullYear() - 1, now.getFullYear()])
  const [regionId,      setRegionId]      = useState('')
  const [facilityId,    setFacilityId]    = useState('')

  useEffect(() => {
    if (categories.length > 0 && !category) setCategory(categories[0])
  }, [categories])

  const toggleYear = (y: number) => {
    setSelectedYears((prev) =>
      prev.includes(y) ? prev.filter((p) => p !== y) : [...prev, y].sort()
    )
  }

  const load = useCallback(() => {
    if (!category || selectedYears.length === 0) return
    setLoading(true)
    const p = new URLSearchParams({ type: 'comparison', category, monthFrom, monthTo, years: selectedYears.join(',') })
    if (!ctx.isFacilityScoped && !ctx.isRegionScoped && facilityId) p.set('facilityId', facilityId)
    else if (!ctx.isFacilityScoped && regionId) p.set('regionId', regionId)
    fetch(`/api/reports/statistics?${p}`).then((r) => r.json())
      .then((d) => { setData(d.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [category, selectedYears, monthFrom, monthTo, regionId, facilityId, ctx])

  const exportCSV = () => {
    if (!data) return
    const header = ['Code', 'Indicateur', 'Unité', ...data.years.map((y: number) => String(y)), 'Évolution (%)']
    const rows   = data.table.map((row: any) => [
      row.code, row.label, row.unit || '',
      ...data.years.map((y: number) => row[String(y)] !== null ? String(row[String(y)]) : ''),
      row.trend !== null ? `${row.trend > 0 ? '+' : ''}${row.trend}%` : '',
    ])
    downloadCSV(`comparaison-${category.replace(/\s/g, '-')}-${data.years.join('-')}.csv`, [header, ...rows])
  }

  const print = () => {
    if (!data) return
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/>
      <title>Comparaison ${category}</title>
      <style>
        body{font-family:Arial,sans-serif;font-size:10px;margin:20px;color:#1e293b}
        h1{font-size:14px;color:#0f766e;margin-bottom:2px}
        .sub{color:#64748b;font-size:9px;margin-bottom:14px}
        table{width:100%;border-collapse:collapse}
        th{background:#0f766e;color:#fff;padding:5px 8px;font-size:9px;font-weight:700}
        th.num,td.num{text-align:right}
        td{padding:3px 8px;border-bottom:1px solid #e2e8f0;font-size:9px}
        tr:nth-child(even) td{background:#f8fafc}
        .req{font-weight:700} .up{color:#16a34a;font-weight:700} .dn{color:#dc2626;font-weight:700} .eq{color:#64748b}
        @media print{body{margin:0}}
      </style></head><body>
      <h1>Comparaison annuelle — ${category}</h1>
      <div class="sub">Années : ${data.years.join(' · ')} · ${MONTHS_FR[Number(monthFrom)-1]}${monthFrom !== monthTo ? ` à ${MONTHS_FR[Number(monthTo)-1]}` : ''}</div>
      <table><thead><tr>
        <th>Code</th><th>Indicateur</th><th>Unité</th>
        ${data.years.map((y: number) => `<th class="num">${y}</th>`).join('')}
        <th class="num">Évolution</th>
      </tr></thead><tbody>
        ${data.table.map((row: any) => `<tr>
          <td style="font-family:monospace;color:#94a3b8">${row.code}</td>
          <td class="${row.isRequired ? 'req' : ''}">${row.label}</td>
          <td style="color:#94a3b8">${row.unit || '—'}</td>
          ${data.years.map((y: number) => `<td class="num">${row[String(y)] !== null ? Number(row[String(y)]).toLocaleString('fr-FR') : '—'}</td>`).join('')}
          <td class="num ${row.trend > 0 ? 'up' : row.trend < 0 ? 'dn' : 'eq'}">${row.trend !== null ? `${row.trend > 0 ? '+' : ''}${row.trend}%` : '—'}</td>
        </tr>`).join('')}
      </tbody></table>
      <script>window.onload=()=>{window.print();window.close()}</script>
      </body></html>`)
    w.document.close()
  }

  const visibleFacilities = regionId
    ? facilities.filter((f: any) => f.region?.id === regionId)
    : facilities

  return (
    <div className="space-y-4">
      <FilterBar>
        <Field label="Catégorie">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Années à comparer">
          <div className="flex gap-2">
            {YEAR_OPTIONS.map((y) => (
              <label key={y} className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl border cursor-pointer transition ${
                selectedYears.includes(y)
                  ? 'bg-brand-600 text-white border-brand-600 font-semibold'
                  : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
              }`}>
                <input type="checkbox" checked={selectedYears.includes(y)} onChange={() => toggleYear(y)} className="hidden" />
                {y}
              </label>
            ))}
          </div>
        </Field>
        <Field label="De (mois)">
          <select value={monthFrom} onChange={(e) => setMonthFrom(e.target.value)} className={inputCls}>
            {MONTHS_FR.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
        </Field>
        <Field label="À (mois)">
          <select value={monthTo} onChange={(e) => setMonthTo(e.target.value)} className={inputCls}>
            {MONTHS_FR.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
        </Field>

        {/* Filtres géo : uniquement pour admin / région-scoped */}
        {!ctx.isFacilityScoped && !ctx.isRegionScoped && regions.length > 0 && (
          <Field label="Région">
            <select value={regionId} onChange={(e) => { setRegionId(e.target.value); setFacilityId('') }} className={inputCls}>
              <option value="">Toutes</option>
              {regions.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </Field>
        )}
        {!ctx.isFacilityScoped && facilities.length > 0 && (
          <Field label="FOSA">
            <select value={facilityId} onChange={(e) => setFacilityId(e.target.value)} className={inputCls}>
              <option value="">Toutes</option>
              {visibleFacilities.map((f: any) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </Field>
        )}

        <button onClick={load} disabled={loading || !category || selectedYears.length === 0} className={btnPrimary}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Générer
        </button>
      </FilterBar>

      {data && (
        <div className="space-y-4">
          {/* Graphique */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-sm">Évolution — {data.category}</h3>
                <p className="text-xs text-gray-500">Total des indicateurs par mois et par année</p>
              </div>
              <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                {(['monthly', 'facilities'] as const).map((v) => (
                  <button key={v} onClick={() => setChartView(v)}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition ${chartView === v ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500'}`}>
                    {v === 'monthly' ? 'Par mois' : 'Par FOSA'}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-4">
              {chartView === 'monthly' ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.monthly} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                    <Tooltip formatter={(v: number) => Number(v).toLocaleString('fr-FR')} />
                    <Legend />
                    {data.years.map((y: number, i: number) => (
                      <Line key={y} type="monotone" dataKey={String(y)} name={String(y)}
                        stroke={YEAR_COLORS[i % YEAR_COLORS.length]} strokeWidth={2.5}
                        dot={{ r: 4 }} activeDot={{ r: 6 }} connectNulls />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.byFacility} margin={{ top: 4, right: 16, left: 0, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                    <Tooltip formatter={(v: number) => Number(v).toLocaleString('fr-FR')} />
                    <Legend />
                    {data.years.map((y: number, i: number) => (
                      <Bar key={y} dataKey={String(y)} name={String(y)}
                        fill={YEAR_COLORS[i % YEAR_COLORS.length]} radius={[3, 3, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Tableau comparatif */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
            <SectionHeader
              title="Tableau comparatif par indicateur"
              subtitle={`${data.table.length} indicateurs — ${data.years.join(' vs ')}`}
              actions={<><button onClick={exportCSV} className={btnCSV}><Download className="w-3 h-3" /> CSV</button><button onClick={print} className={btnPrint}><Printer className="w-3 h-3" /> Imprimer</button></>}
            />
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800 text-xs uppercase text-gray-500">
                    <th className="text-left px-4 py-3 font-semibold w-24">Code</th>
                    <th className="text-left px-4 py-3 font-semibold">Indicateur</th>
                    <th className="text-left px-4 py-3 font-semibold w-14">Unité</th>
                    {data.years.map((y: number, i: number) => (
                      <th key={y} className="text-right px-4 py-3 font-semibold" style={{ color: YEAR_COLORS[i % YEAR_COLORS.length] }}>
                        {y}
                      </th>
                    ))}
                    <th className="text-right px-4 py-3 font-semibold text-gray-500">Évolution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {data.table.map((row: any) => (
                    <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-400">{row.code}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-sm ${row.isRequired ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                          {row.label}
                          {row.isRequired && <span className="ml-1 text-brand-500 text-xs">*</span>}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-400">{row.unit || '—'}</td>
                      {data.years.map((y: number) => (
                        <td key={y} className="px-4 py-2.5 text-right font-mono text-sm">
                          {row[String(y)] !== null && row[String(y)] !== undefined
                            ? <span className="font-semibold text-gray-900 dark:text-white">{Number(row[String(y)]).toLocaleString('fr-FR')}</span>
                            : <span className="text-gray-300 dark:text-gray-600">—</span>}
                        </td>
                      ))}
                      <td className="px-4 py-2.5 text-right">
                        <TrendBadge value={row.trend} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {!data && !loading && <Empty />}
    </div>
  )
}

function TrendBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-gray-300 text-xs">—</span>
  if (value > 0) return (
    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
      <TrendingUp className="w-3 h-3" /> +{value}%
    </span>
  )
  if (value < 0) return (
    <span className="inline-flex items-center gap-1 text-xs font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">
      <TrendingDown className="w-3 h-3" /> {value}%
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
      <Minus className="w-3 h-3" /> 0%
    </span>
  )
}

// ── Rapport 4 : Taux de complétude (admin) ────────────────────────────────────
function CompletenessReport({ ctx }: { ctx: UserCtx }) {
  const [data,    setData]    = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [regions, setRegions] = useState<any[]>([])
  const now = new Date()
  const [month,    setMonth]    = useState(String(now.getMonth() + 1))
  const [year,     setYear]     = useState(String(now.getFullYear()))
  const [regionId, setRegionId] = useState('')

  useEffect(() => {
    fetch('/api/regions').then((r) => r.json()).then((d) => setRegions(d.data || [])).catch(() => {})
  }, [])

  const load = useCallback(() => {
    setLoading(true)
    const p = new URLSearchParams({ month, year })
    if (regionId) p.set('regionId', regionId)
    fetch(`/api/reports/statistics/completeness?${p}`).then((r) => r.json())
      .then((d) => { setData(d.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [month, year, regionId])

  const exportCSV = () => {
    if (!data) return
    const header = ['FOSA', 'Code', 'Type', 'Région', 'Soumise', 'Statut', 'Complétude (%)', 'Responsable', 'Date soumission']
    const rows = data.rows.map((r: any) => [
      r.facility.name, r.facility.code, r.facility.type, r.facility.region?.name || '',
      r.submitted ? 'Oui' : 'Non', r.status || '',
      r.completeness !== null ? String(Math.round(r.completeness)) : '',
      r.dataManager || '',
      r.submittedAt ? new Date(r.submittedAt).toLocaleDateString('fr-FR') : '',
    ])
    downloadCSV(`completude-${year}-${month}.csv`, [header, ...rows])
  }

  const print = () => {
    if (!data) return
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/>
      <title>Complétude ${MONTHS_FR[Number(month)-1]} ${year}</title>
      <style>
        body{font-family:Arial,sans-serif;font-size:10px;margin:20px;color:#1e293b}
        h1{font-size:14px;margin-bottom:2px;color:#0f766e} .sub{color:#64748b;font-size:9px;margin-bottom:12px}
        .kpis{display:flex;gap:12px;margin-bottom:14px}
        .kpi{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:6px 12px;text-align:center}
        .kpi .val{font-size:18px;font-weight:800;color:#0f766e} .kpi .lbl{font-size:8px;color:#64748b;text-transform:uppercase}
        table{width:100%;border-collapse:collapse}
        th{background:#0f766e;color:#fff;padding:5px 8px;text-align:left;font-size:9px;font-weight:700}
        td{padding:3px 8px;border-bottom:1px solid #e2e8f0;font-size:9px}
        tr:nth-child(even) td{background:#f8fafc}
        .ok{color:#16a34a;font-weight:700} .ko{color:#dc2626;font-weight:700}
        .bar-bg{background:#e2e8f0;border-radius:3px;height:6px;width:60px;display:inline-block;vertical-align:middle}
        .bar{background:#0f766e;border-radius:3px;height:6px}
        @media print{body{margin:0}}
      </style></head><body>
      <h1>Taux de complétude — ${MONTHS_FR[Number(month)-1]} ${year}</h1>
      <div class="sub">Généré le ${new Date().toLocaleDateString('fr-FR')}</div>
      <div class="kpis">
        <div class="kpi"><div class="val">${data.summary.total}</div><div class="lbl">Total FOSA</div></div>
        <div class="kpi"><div class="val">${data.summary.submitted}</div><div class="lbl">Soumises</div></div>
        <div class="kpi"><div class="val">${data.summary.validated}</div><div class="lbl">Validées</div></div>
        <div class="kpi"><div class="val" style="color:#dc2626">${data.summary.missing}</div><div class="lbl">Manquantes</div></div>
        <div class="kpi"><div class="val">${data.summary.avgCompleteness}%</div><div class="lbl">Moy. complétude</div></div>
      </div>
      <table><thead><tr><th>FOSA</th><th>Région</th><th>Soumise</th><th>Statut</th><th>Complétude</th><th>Responsable</th></tr></thead>
      <tbody>${data.rows.map((r: any) => `<tr>
        <td>${r.facility.name} <span style="color:#94a3b8">(${r.facility.code})</span></td>
        <td>${r.facility.region?.name || '—'}</td>
        <td class="${r.submitted ? 'ok' : 'ko'}">${r.submitted ? '✓' : '✗'}</td>
        <td>${r.status || '—'}</td>
        <td><div class="bar-bg"><div class="bar" style="width:${r.completeness !== null ? Math.round(r.completeness) : 0}%"></div></div> ${r.completeness !== null ? Math.round(r.completeness) + '%' : '—'}</td>
        <td>${r.dataManager || '—'}</td>
      </tr>`).join('')}</tbody></table>
      <script>window.onload=()=>{window.print();window.close()}</script>
      </body></html>`)
    w.document.close()
  }

  return (
    <div className="space-y-4">
      <FilterBar>
        <Field label="Mois">
          <select value={month} onChange={(e) => setMonth(e.target.value)} className={inputCls}>
            {MONTHS_FR.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
        </Field>
        <Field label="Année">
          <select value={year} onChange={(e) => setYear(e.target.value)} className={inputCls}>
            {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </Field>
        {regions.length > 0 && (
          <Field label="Région">
            <select value={regionId} onChange={(e) => setRegionId(e.target.value)} className={inputCls}>
              <option value="">Toutes</option>
              {regions.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </Field>
        )}
        <button onClick={load} disabled={loading} className={btnPrimary}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Générer
        </button>
      </FilterBar>

      {data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Total FOSA',      value: data.summary.total,                 color: 'text-gray-900 dark:text-white' },
              { label: 'Soumises',        value: data.summary.submitted,             color: 'text-blue-600' },
              { label: 'Validées',        value: data.summary.validated,             color: 'text-emerald-600' },
              { label: 'Manquantes',      value: data.summary.missing,               color: 'text-red-500' },
              { label: 'Moy. complétude', value: `${data.summary.avgCompleteness}%`, color: 'text-brand-600' },
            ].map((k) => (
              <div key={k.label} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 text-center">
                <div className={`text-2xl font-black ${k.color}`}>{k.value}</div>
                <div className="text-xs text-gray-500 mt-1">{k.label}</div>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
            <SectionHeader
              title={`Détail par FOSA — ${MONTHS_FR[Number(month)-1]} ${year}`}
              actions={<><button onClick={exportCSV} className={btnCSV}><Download className="w-3 h-3" /> CSV</button><button onClick={print} className={btnPrint}><Printer className="w-3 h-3" /> Imprimer</button></>}
            />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800 text-xs uppercase text-gray-500">
                    {['Formation sanitaire', 'Région', 'Soumise', 'Statut', 'Complétude', 'Responsable', 'Date'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {data.rows.map((row: any) => {
                    const Icon = row.status ? STATUS_CONFIG[row.status]?.icon : null
                    return (
                      <tr key={row.facility.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900 dark:text-white text-sm">{row.facility.name}</div>
                          <div className="text-xs text-gray-400">{row.facility.code}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{row.facility.region?.name || '—'}</td>
                        <td className="px-4 py-3">
                          {row.submitted
                            ? <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-xs"><CheckCircle2 className="w-3.5 h-3.5" /> Oui</span>
                            : <span className="inline-flex items-center gap-1 text-red-500 font-semibold text-xs"><XCircle className="w-3.5 h-3.5" /> Non</span>}
                        </td>
                        <td className="px-4 py-3">
                          {row.status ? (
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-semibold ${STATUS_CONFIG[row.status]?.color}`}>
                              {Icon && <Icon className="w-3 h-3" />}
                              {STATUS_CONFIG[row.status]?.label}
                            </span>
                          ) : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {row.completeness !== null ? (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 min-w-[60px]">
                                <div className="bg-brand-500 h-1.5 rounded-full" style={{ width: `${Math.min(row.completeness, 100)}%` }} />
                              </div>
                              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 w-9 text-right">{Math.round(row.completeness)}%</span>
                            </div>
                          ) : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{row.dataManager || '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-400">
                          {row.submittedAt ? new Date(row.submittedAt).toLocaleDateString('fr-FR') : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      {!data && !loading && <Empty />}
    </div>
  )
}
