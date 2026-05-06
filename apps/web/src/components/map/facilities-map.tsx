'use client'

import { useEffect, useRef, useState } from 'react'
import { MapPin, Building2, Info, RefreshCw } from 'lucide-react'

interface FacilityMarker {
  id: string
  name: string
  code: string
  type: string
  address: string | null
  latitude: number | null
  longitude: number | null
  region: { id: string; name: string }
  declarationCount: number
  statSheetCount: number
  sheetStatus: string | null
  completeness: number | null
}

const TYPE_LABELS: Record<string, string> = { HOSPITAL: 'Hôpital', HEALTH_CENTER: 'Centre de santé' }
const STATUS_COLORS: Record<string, string> = {
  VALIDATED: '#059669',
  SUBMITTED: '#0284c7',
  REVIEWED: '#7c3aed',
  DRAFT: '#d97706',
}

// Cameroon center coordinates as fallback
const DEFAULT_CENTER: [number, number] = [3.848, 11.502]
const DEFAULT_ZOOM = 6

export function FacilitiesMap() {
  const mapRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [facilities, setFacilities] = useState<FacilityMarker[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<FacilityMarker | null>(null)
  const [year] = useState(new Date().getFullYear())
  const [withCoords, setWithCoords] = useState(0)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/map?year=${year}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (json.success) {
        setFacilities(json.data)
        setWithCoords(json.data.filter((f: FacilityMarker) => f.latitude && f.longitude).length)
      }
    } catch (e) {
      console.error('[FacilitiesMap] load error', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (loading || !containerRef.current || typeof window === 'undefined') return

    // Dynamically import Leaflet (client-side only)
    import('leaflet').then((L) => {
      // Fix default icon issue with Next.js
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }

      const map = L.map(containerRef.current!).setView(DEFAULT_CENTER, DEFAULT_ZOOM)
      mapRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(map)

      const mapped = facilities.filter((f) => f.latitude && f.longitude)
      const bounds: [number, number][] = []

      for (const f of mapped) {
        const color = f.sheetStatus ? (STATUS_COLORS[f.sheetStatus] ?? '#6b7280') : '#6b7280'
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);cursor:pointer;"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        })

        const marker = L.marker([f.latitude!, f.longitude!], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="min-width:200px;font-family:system-ui;font-size:13px;">
              <div style="font-weight:700;margin-bottom:4px;">${f.name}</div>
              <div style="color:#6b7280;font-size:11px;margin-bottom:6px;">${TYPE_LABELS[f.type] ?? f.type} · ${f.region.name}</div>
              ${f.completeness !== null ? `<div style="margin-bottom:4px;"><span style="color:#374151;">Complétude :</span> <strong>${Math.round(f.completeness)}%</strong></div>` : ''}
              <div><span style="color:#374151;">Déclarations :</span> ${f.declarationCount}</div>
            </div>
          `)
          .on('click', () => setSelected(f))

        bounds.push([f.latitude!, f.longitude!])
      }

      if (bounds.length > 1) {
        map.fitBounds(bounds as any, { padding: [30, 30] })
      }
    })

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [loading, facilities])

  // Load Leaflet CSS
  useEffect(() => {
    if (typeof document === 'undefined') return
    if (!document.querySelector('#leaflet-css')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css'
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }
  }, [])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-xl">
            <MapPin className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Carte des formations sanitaires</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {facilities.length} établissements · {withCoords} géolocalisés
            </p>
          </div>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </button>
      </div>

      {/* Legend */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2.5 flex flex-wrap items-center gap-4">
        <span className="text-xs font-medium text-gray-500">Statut fiche :</span>
        {[
          { label: 'Validée', color: STATUS_COLORS.VALIDATED },
          { label: 'Soumise', color: STATUS_COLORS.SUBMITTED },
          { label: 'En revue', color: STATUS_COLORS.REVIEWED },
          { label: 'Brouillon', color: STATUS_COLORS.DRAFT },
          { label: 'Aucune donnée', color: '#6b7280' },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full border border-white shadow-sm" style={{ background: color }} />
            <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
          </div>
        ))}
      </div>

      {/* No coordinates warning */}
      {!loading && withCoords === 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 flex items-start gap-3">
          <Info className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Aucun établissement n'a de coordonnées GPS. Ajoutez les champs latitude/longitude via l'administration des formations sanitaires pour les afficher sur la carte.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Map */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden" style={{ height: '500px' }}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
            </div>
          ) : (
            <div ref={containerRef} className="w-full h-full" />
          )}
        </div>

        {/* Sidebar: facility list */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col" style={{ height: '500px' }}>
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Liste ({facilities.length})</h2>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800">
            {facilities.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelected(selected?.id === f.id ? null : f)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition ${selected?.id === f.id ? 'bg-teal-50 dark:bg-teal-900/20' : ''}`}
              >
                <div className="flex items-start gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 border border-white/50"
                    style={{ background: f.sheetStatus ? (STATUS_COLORS[f.sheetStatus] ?? '#6b7280') : '#6b7280' }}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{f.name}</p>
                    <p className="text-xs text-gray-400 truncate">{f.region.name} · {TYPE_LABELS[f.type] ?? f.type}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Selected facility detail */}
      {selected && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-teal-50 dark:bg-teal-900/20 rounded-xl">
              <Building2 className="w-5 h-5 text-teal-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white">{selected.name}</h3>
              <p className="text-sm text-gray-500">{selected.code} · {TYPE_LABELS[selected.type]} · {selected.region.name}</p>
              {selected.address && <p className="text-sm text-gray-400 mt-1">{selected.address}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-gray-900 dark:text-white">{selected.declarationCount}</p>
              <p className="text-xs text-gray-500">Déclarations</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-gray-900 dark:text-white">{selected.statSheetCount}</p>
              <p className="text-xs text-gray-500">Fiches stat.</p>
            </div>
            {selected.completeness !== null && (
              <div className="bg-teal-50 dark:bg-teal-900/20 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-teal-600 dark:text-teal-400">{Math.round(selected.completeness)}%</p>
                <p className="text-xs text-gray-500">Complétude</p>
              </div>
            )}
            {selected.latitude && selected.longitude && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
                <p className="text-xs font-mono text-gray-600 dark:text-gray-400">{selected.latitude.toFixed(4)}</p>
                <p className="text-xs font-mono text-gray-600 dark:text-gray-400">{selected.longitude.toFixed(4)}</p>
                <p className="text-xs text-gray-500">GPS</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
